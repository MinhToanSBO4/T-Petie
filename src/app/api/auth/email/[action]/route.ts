import { NextResponse } from 'next/server';
import { isSameOrigin } from '@/server/security/origin';
import { clientIp } from '@/server/security/client-ip';
import { allowAttempt } from '@/server/security/rate-limit';
import { normalizeEmail } from '@/lib/email/config';
import { issueAccountEmail, consumeAccountToken, InvalidAccountToken } from '@/server/auth/email-tokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(request: Request, { params }: { params: { action: string } }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const action = params.action;
  if (!['resend', 'forgot', 'verify', 'reset'].includes(action)) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  try {
    if (!await allowAttempt(`account-email:${action}:${clientIp(request)}`, 10)) return NextResponse.json({ error: 'Vui lòng thử lại sau 10 phút.' }, { status: 429 });
    if (action === 'forgot' || action === 'resend') {
      const email = normalizeEmail(body.email);
      if (!email) return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 400 });
      if (!await allowAttempt(`account-email:${action}:${email}`, 3)) return NextResponse.json({ error: 'Vui lòng thử lại sau 10 phút.' }, { status: 429 });
      const sent = await issueAccountEmail(email, action === 'forgot' ? 'reset' : 'verify');
      // Recovery is deliberately indistinguishable for eligible and unknown accounts, including SMTP rejection.
      if (action === 'resend' && !sent) return NextResponse.json({ message: 'Nếu tài khoản cần xác thực, bạn có thể thử gửi lại sau hoặc kiểm tra hộp thư. Chưa thể xác nhận thư đã gửi.' });
      return NextResponse.json({ message: 'Nếu email thuộc tài khoản phù hợp, bạn sẽ nhận được liên kết. Vui lòng kiểm tra cả thư rác.' });
    }
    if (typeof body.token !== 'string') throw new InvalidAccountToken();
    if (action === 'reset' && (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128)) return NextResponse.json({ error: 'Mật khẩu cần 12–128 ký tự.' }, { status: 400 });
    await consumeAccountToken(body.token, action === 'verify' ? 'verify' : 'reset', body.password as string | undefined);
    return NextResponse.json({ message: action === 'verify' ? 'Email đã được xác thực. Bạn có thể đăng nhập.' : 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.' });
  } catch (error) {
    if (error instanceof InvalidAccountToken) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Dịch vụ email tạm thời không khả dụng. Vui lòng thử lại sau.' }, { status: 503 });
  }
}
