import 'server-only';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/server/db/client';
import { forgetUserSnapshot } from '@/server/auth/user-snapshot';
import { createAccountToken, tokenDigest, tokenPurpose, eligibleCustomer, requiresEmailVerification, type TokenPurpose } from '@/lib/email/tokens';
import { readMailConfig } from '@/lib/email/config';
import { passwordProblem } from '@/lib/account/account-input';
import { waitUntil } from '@vercel/functions';
import { sendEmail, mailErrorCode } from '@/server/email/transport';
import type { EmailPayload } from '@/lib/email/templates';

export class InvalidAccountToken extends Error {
  constructor() { super('Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.'); }
}

/** Thời hạn liên kết: xác thực email 24 giờ, đặt lại mật khẩu 30 phút. */
export const TOKEN_TTL_MINUTES: Record<TokenPurpose, number> = { verify: 24 * 60, reset: 30 };
/** Khoảng cách tối thiểu giữa hai thư cùng loại cho một tài khoản; giao diện hiện đồng hồ đếm ngược theo số này. */
export const RESEND_COOLDOWN_SECONDS = 60;

export type IssueResult =
  /** Liên kết đã tạo, thư đang được gửi trong nền (khách không phải chờ SMTP). */
  | { status: 'queued' }
  /** Tài khoản không tồn tại, không phải khách, bị khóa hoặc đã xác thực: không gửi gì. */
  | { status: 'skipped' }
  | { status: 'cooldown'; retryAfter: number };

/** Giây còn phải chờ trước khi gửi lại, dựa trên thời điểm phát hành liên kết hiện có (expires − TTL). */
function cooldownLeft(expires: Date, purpose: TokenPurpose, now = Date.now()) {
  const issuedAt = expires.getTime() - TOKEN_TTL_MINUTES[purpose] * 60_000;
  return Math.ceil((issuedAt + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000);
}

/** Chờ giữa các lần thử lại khi SMTP lỗi tạm thời; tổng thời gian nằm trong maxDuration của route. */
const RETRY_DELAYS_MS = [2_000, 5_000];

/**
 * Gửi thư sau khi phản hồi đã trả về (waitUntil giữ function sống tới khi gửi xong). Lỗi tạm thời được thử lại
 * 2 lần; vẫn lỗi thì bỏ liên kết vừa tạo để khách bấm "Gửi lại" được ngay, không phải chờ hết thời gian chờ.
 * Liên kết gốc chỉ nằm trong bộ nhớ của lần gửi này, database chỉ lưu bản băm.
 */
function deliverInBackground(identifier: string, raw: string, to: string, payload: EmailPayload) {
  waitUntil((async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        await sendEmail(to, payload);
        return;
      } catch (error) {
        const code = mailErrorCode(error);
        // Sai mật khẩu SMTP hay địa chỉ nhận bị từ chối thì thử lại cũng vô ích.
        if (attempt >= RETRY_DELAYS_MS.length || code === 'EAUTH' || code === 'EENVELOPE') {
          console.warn('Account email not accepted:', code);
          await prisma.verificationToken.deleteMany({ where: { identifier, token: tokenDigest(raw) } }).catch(() => {});
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      }
    }
  })());
}

/**
 * Tạo liên kết mới (thay liên kết cũ cùng loại) rồi gửi thư trong nền. Mỗi tài khoản chỉ nhận một thư cùng loại mỗi
 * RESEND_COOLDOWN_SECONDS giây, kể cả khi nhiều request đến cùng lúc (khóa dòng user trong transaction).
 */
export async function issueAccountEmail(where: { email: string } | { id: string }, purpose: TokenPurpose): Promise<IssueResult> {
  readMailConfig(process.env);
  const user = await prisma.user.findUnique({ where });
  if (!eligibleCustomer(user) || !user?.email || (purpose === 'verify' && !requiresEmailVerification(user))) return { status: 'skipped' };
  const raw = createAccountToken();
  const identifier = `${purpose}:${user.id}`;
  // Serialize replacement on the user row; issue and consumption use the same lock order.
  const wait = await prisma.$transaction(async (tx) => {
    const locked = await tx.user.updateMany({ where: { id: user.id, role: 'user', status: 'active', deletedAt: null }, data: { updatedAt: new Date() } });
    if (locked.count !== 1) return null;
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (purpose === 'verify' && !requiresEmailVerification(current)) return null;
    const previous = await tx.verificationToken.findFirst({ where: { identifier }, orderBy: { expires: 'desc' } });
    const left = previous ? cooldownLeft(previous.expires, purpose) : 0;
    if (left > 0) return left;
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({ data: { identifier, token: tokenDigest(raw), expires: new Date(Date.now() + TOKEN_TTL_MINUTES[purpose] * 60_000) } });
    return 0;
  });
  if (wait === null) return { status: 'skipped' };
  if (wait > 0) return { status: 'cooldown', retryAfter: wait };
  deliverInBackground(identifier, raw, user.email, { kind: purpose === 'verify' ? 'verification' : 'reset', name: user.name, token: raw });
  return { status: 'queued' };
}

/** Trạng thái xác thực đọc thẳng từ database (không qua bộ nhớ đệm phiên), cho nút "Tôi đã xác thực". */
export async function emailVerificationState(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId },
    select: { email: true, role: true, emailVerified: true, emailVerificationRequired: true } });
  if (!user) return null;
  return { email: user.email, verified: !requiresEmailVerification(user) };
}

export async function consumeAccountToken(raw: string, purpose: TokenPurpose, password?: string) {
  if (!/^[a-f0-9]{64}$/.test(raw)) throw new InvalidAccountToken();
  if (purpose === 'reset') {
    const problem = passwordProblem(password);
    if (problem) throw new Error(problem);
  }
  const digest = tokenDigest(raw);
  const found = await prisma.verificationToken.findUnique({ where: { token: digest } });
  const userId = found && tokenPurpose(found.identifier, purpose);
  if (!found || !userId || found.expires <= new Date()) throw new InvalidAccountToken();
  const hash = purpose === 'reset' ? await bcrypt.hash(password!, 12) : undefined;
  await prisma.$transaction(async (tx) => {
    // Mở được thư trong hộp thư là bằng chứng sở hữu email, nên đặt lại mật khẩu cũng xác thực luôn email.
    const updated = await tx.user.updateMany({ where: { id: userId, role: 'user', status: 'active', deletedAt: null },
      data: { emailVerified: new Date(), ...(hash ? { password: hash } : {}) } });
    if (updated.count !== 1) throw new InvalidAccountToken();
    const consumed = await tx.verificationToken.deleteMany({ where: { token: digest, identifier: found.identifier, expires: { gt: new Date() } } });
    if (consumed.count !== 1) throw new InvalidAccountToken();
    await tx.verificationToken.deleteMany({ where: { identifier: { in: [`verify:${userId}`, ...(purpose === 'reset' ? [`reset:${userId}`] : [])] } } });
  });
  forgetUserSnapshot(userId);
}
