import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/options';
import { isSameOrigin } from '@/server/security/origin';
import { clientIp } from '@/server/security/client-ip';
import { takeAttempt } from '@/server/security/rate-limit';
import { normalizeEmail } from '@/lib/email/config';
import { issueAccountEmail, consumeAccountToken, emailVerificationState, InvalidAccountToken, RESEND_COOLDOWN_SECONDS } from '@/server/auth/email-tokens';
import { passwordProblem } from '@/lib/account/account-input';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
const wait = (retryAfter: number) => json({ error: `Bạn vừa yêu cầu quá nhiều lần. Vui lòng thử lại sau ${formatWait(retryAfter)}.`, retryAfter }, 429);

function formatWait(seconds: number) {
  return seconds >= 120 ? `${Math.ceil(seconds / 60)} phút` : `${seconds} giây`;
}

async function activeCustomerId() {
  const session = await getServerSession(authOptions);
  return session?.user?.status === 'active' && session.user.role === 'user' ? session.user.id : null;
}

/** GET /api/auth/email/status: trạng thái xác thực của phiên hiện tại, đọc thẳng từ database. */
export async function GET(_request: Request, { params }: { params: { action: string } }) {
  if (params.action !== 'status') return json({ error: 'Phương thức không được hỗ trợ' }, 405);
  const userId = await activeCustomerId();
  if (!userId) return json({ error: 'Chưa đăng nhập' }, 401);
  const state = await emailVerificationState(userId);
  return state ? json(state) : json({ error: 'Không tìm thấy tài khoản' }, 404);
}

export async function POST(request: Request, { params }: { params: { action: string } }) {
  if (!isSameOrigin(request)) return json({ error: 'Nguồn yêu cầu không hợp lệ' }, 403);
  const action = params.action;
  if (!['resend', 'forgot', 'verify', 'reset'].includes(action)) return json({ error: 'Không tìm thấy' }, 404);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: 'Dữ liệu quá lớn' }, 413);
    body = raw ? JSON.parse(raw) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch { return json({ error: 'Dữ liệu không hợp lệ' }, 400); }
  try {
    const perIp = await takeAttempt(`account-email:${action}:${clientIp(request)}`, 10);
    if (!perIp.allowed) return wait(perIp.retryAfter);

    if (action === 'resend') {
      // Đã đăng nhập: gửi tới email của tài khoản, không nhận email từ form (không gửi thư tới địa chỉ tùy ý).
      const userId = await activeCustomerId();
      const email = userId ? null : normalizeEmail(body.email);
      if (!userId && !email) return json({ error: 'Email không hợp lệ.' }, 400);
      const perAccount = await takeAttempt(`account-email:resend:${userId || email}`, 5, 60);
      if (!perAccount.allowed) return wait(perAccount.retryAfter);
      const result = await issueAccountEmail(userId ? { id: userId } : { email: email! }, 'verify');
      if (userId) {
        if (result.status === 'cooldown') return wait(result.retryAfter);
        if (result.status === 'skipped') return json({ message: 'Email của bạn đã được xác thực.', verified: true });
        return json({ message: 'Đã gửi thư xác thực. Vui lòng kiểm tra hộp thư (cả mục Quảng cáo/Thư rác).', retryAfter: RESEND_COOLDOWN_SECONDS });
      }
      // Chưa đăng nhập: phản hồi như nhau cho mọi email để không lộ email nào đã đăng ký.
      return json({ message: 'Nếu email thuộc một tài khoản chưa xác thực, thư xác thực mới đã được gửi. Vui lòng kiểm tra hộp thư.', retryAfter: RESEND_COOLDOWN_SECONDS });
    }

    if (action === 'forgot') {
      const email = normalizeEmail(body.email);
      if (!email) return json({ error: 'Email không hợp lệ.' }, 400);
      const perEmail = await takeAttempt(`account-email:forgot:${email}`, 5, 60);
      if (!perEmail.allowed) return wait(perEmail.retryAfter);
      await issueAccountEmail({ email }, 'reset');
      // Recovery is deliberately indistinguishable for eligible and unknown accounts, including SMTP rejection.
      return json({ message: 'Nếu email thuộc một tài khoản T\'Petie, liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư (cả mục Thư rác).', retryAfter: RESEND_COOLDOWN_SECONDS });
    }

    if (typeof body.token !== 'string') throw new InvalidAccountToken();
    if (action === 'reset') {
      const problem = passwordProblem(body.password);
      if (problem) return json({ error: `${problem}.` }, 400);
    }
    await consumeAccountToken(body.token, action === 'verify' ? 'verify' : 'reset', body.password as string | undefined);
    return json(action === 'verify'
      ? { message: 'Email đã được xác thực. Tài khoản của bạn đã sẵn sàng để mua sắm.', verified: true }
      : { message: 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập bằng mật khẩu mới.' });
  } catch (error) {
    if (error instanceof InvalidAccountToken) return json({ error: error.message }, 400);
    console.error('Account email action failed:', action, error instanceof Error ? error.message.split('\n')[0] : error);
    return json({ error: 'Dịch vụ email tạm thời không khả dụng. Vui lòng thử lại sau.' }, 503);
  }
}
