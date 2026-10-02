import 'server-only';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/server/db/client';
import { forgetUserSnapshot } from '@/server/auth/user-snapshot';
import { createAccountToken, tokenDigest, tokenPurpose, eligibleCustomer, requiresEmailVerification, type TokenPurpose } from '@/lib/email/tokens';
import { readMailConfig } from '@/lib/email/config';
import { sendEmail, mailErrorCode } from '@/server/email/transport';

export class InvalidAccountToken extends Error {
  constructor() { super('Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.'); }
}

export async function issueAccountEmail(email: string, purpose: TokenPurpose) {
  readMailConfig(process.env);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!eligibleCustomer(user) || !user || (purpose === 'verify' && !requiresEmailVerification(user))) return false;
  const raw = createAccountToken();
  const identifier = `${purpose}:${user.id}`;
  // Serialize replacement on the user row; issue and consumption use the same lock order.
  await prisma.$transaction(async (tx) => {
    const locked = await tx.user.updateMany({ where: { id: user.id, role: 'user', status: 'active', deletedAt: null }, data: { updatedAt: new Date() } });
    if (locked.count !== 1) throw new InvalidAccountToken();
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (purpose === 'verify' && !requiresEmailVerification(current)) throw new InvalidAccountToken();
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({ data: { identifier, token: tokenDigest(raw), expires: new Date(Date.now() + (purpose === 'verify' ? 24 * 60 : 30) * 60_000) } });
  });
  try { await sendEmail(email, { kind: purpose === 'verify' ? 'verification' : 'reset', name: user.name, token: raw }); }
  catch (error) {
    console.warn('Account email not accepted:', mailErrorCode(error));
    return false;
  }
  return true;
}

export async function consumeAccountToken(raw: string, purpose: TokenPurpose, password?: string) {
  if (!/^[a-f0-9]{64}$/.test(raw)) throw new InvalidAccountToken();
  if (purpose === 'reset' && (typeof password !== 'string' || password.length < 12 || password.length > 128)) throw new Error('Mật khẩu cần 12–128 ký tự.');
  const digest = tokenDigest(raw);
  const found = await prisma.verificationToken.findUnique({ where: { token: digest } });
  const userId = found && tokenPurpose(found.identifier, purpose);
  if (!found || !userId || found.expires <= new Date()) throw new InvalidAccountToken();
  const hash = purpose === 'reset' ? await bcrypt.hash(password!, 12) : undefined;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({ where: { id: userId, role: 'user', status: 'active', deletedAt: null },
      data: { emailVerified: new Date(), ...(hash ? { password: hash } : {}) } });
    if (updated.count !== 1) throw new InvalidAccountToken();
    const consumed = await tx.verificationToken.deleteMany({ where: { token: digest, identifier: found.identifier, expires: { gt: new Date() } } });
    if (consumed.count !== 1) throw new InvalidAccountToken();
    await tx.verificationToken.deleteMany({ where: { identifier: { in: [`verify:${userId}`, ...(purpose === 'reset' ? [`reset:${userId}`] : [])] } } });
  });
  forgetUserSnapshot(userId);
}
