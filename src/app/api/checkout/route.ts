import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/server/auth/options';
import { allowAttempt } from '@/server/security/rate-limit';
import { createOrder, IdempotencyConflictError, type CheckoutInput } from '@/server/orders/create-order';
import { clientIp } from '@/server/security/client-ip';
import { normalizePhone } from '@/lib/account/account-input';
import { normalizeEmail } from '@/lib/email/config';
import { emailVerificationState } from '@/server/auth/email-tokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const validText = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  }
  let raw: string;
  try {
    raw = await request.text();
    if (raw.length > 32000) return NextResponse.json({ message: 'Dữ liệu quá lớn' }, { status: 413 });
  } catch { return NextResponse.json({ message: 'Không đọc được yêu cầu' }, { status: 400 }); }
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); }
  catch { return NextResponse.json({ message: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  // Số điện thoại chuẩn hóa trước khi kiểm tra: "0912 345 678" hay "+84912345678" đều hợp lệ.
  if (body && typeof body === 'object' && typeof body.phone === 'string') body.phone = normalizePhone(body.phone) ?? body.phone;
  if (!body || typeof body !== 'object' || !validText(body.fullName, 100) ||
    !validText(body.address, 300) || !validText(body.city, 100) || !validText(body.district, 100) ||
    typeof body.phone !== 'string' || !/^0[35789]\d{8}$/.test(body.phone) ||
    (body.ward !== undefined && (typeof body.ward !== 'string' || body.ward.length > 100)) ||
    (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 1000)) ||
    (body.source !== undefined && (typeof body.source !== 'string' || body.source.length > 100)) ||
    (body.email !== undefined && (typeof body.email !== 'string' || (body.email.trim() !== '' && !normalizeEmail(body.email)))) ||
    (body.couponCode !== undefined && (typeof body.couponCode !== 'string' || body.couponCode.length > 30)) ||
    !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30 ||
    body.items.some((item) => !item || typeof item !== 'object' ||
      !validText(item.productId, 100) || !validText(item.selectedSize, 100) ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    return NextResponse.json({ message: 'Thông tin đặt hàng không hợp lệ' }, { status: 400 });
  }
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey && !/^[A-Za-z0-9-]{16,128}$/.test(idempotencyKey)) {
    return NextResponse.json({ message: 'Mã yêu cầu không hợp lệ' }, { status: 400 });
  }
  const ip = clientIp(request);
  try {
    // Theo IP nới rộng (nhà mạng di động dùng chung IP cho nhiều khách), theo số điện thoại giữ chặt.
    for (const [identity, limit] of [[`ip:${ip}`, 20], [`phone:${body.phone}`, 5]] as const) {
      if (!(await allowAttempt(`checkout:${identity}`, limit))) {
        return NextResponse.json({ message: 'Bạn đã thử quá nhiều lần. Vui lòng chờ 10 phút.' }, { status: 429 });
      }
    }
    const session = await getServerSession(authOptions);
    const userId = session?.user?.status === 'active' ? session.user.id : undefined;
    // Tài khoản đăng ký bằng email phải xác thực email trước khi đặt hàng. Đọc thẳng database: phiên có thể cũ vài giây.
    if (userId && session?.user.role === 'user' && (await emailVerificationState(userId))?.verified === false) {
      return NextResponse.json({ code: 'EMAIL_UNVERIFIED', message: 'Mẹ vui lòng xác thực email trước khi đặt hàng.' }, { status: 403 });
    }
    const input = body as CheckoutInput;
    const result = await createOrder({
      fullName: input.fullName.trim(), phone: input.phone.trim(), address: input.address.trim(),
      city: input.city.trim(), district: input.district.trim(), ward: input.ward?.trim(),
      note: input.note?.slice(0, 1000), couponCode: input.couponCode?.slice(0, 30),
      source: input.source?.trim().slice(0, 100) || undefined, items: input.items,
      email: input.email?.trim().toLowerCase(),
    }, userId, idempotencyKey);
    return NextResponse.json({ status: 'success', ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof IdempotencyConflictError) return NextResponse.json({ message: error.message }, { status: 409 });
    const message = error instanceof Error ? error.message : '';
    if (message === 'Chưa cấu hình phí giao hàng') {
      console.error('Checkout blocked: commerce_settings row "default" is missing');
      return NextResponse.json({ message: 'Shop đang cập nhật phí giao hàng, mẹ vui lòng đặt lại sau ít phút hoặc nhắn shop nhé.' }, { status: 503 });
    }
    if (/giỏ hàng|sản phẩm|số lượng|tồn kho|giá|mã giảm|tổng tiền|email đặt hàng/i.test(message)) {
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error('Checkout failed:', error);
    return NextResponse.json({ message: 'Không thể tạo đơn hàng. Vui lòng thử lại.' }, { status: 500 });
  }
}
