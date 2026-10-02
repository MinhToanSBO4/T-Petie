import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/server/auth/options';
import { allowAttempt } from '@/server/security/rate-limit';
import { createOrder, type CheckoutInput } from '@/server/orders/create-order';

export const dynamic = 'force-dynamic';

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
  if (!body || typeof body !== 'object' || !validText(body.fullName, 100) ||
    !validText(body.address, 300) || !validText(body.city, 100) || !validText(body.district, 100) ||
    typeof body.phone !== 'string' || !/^0[35789]\d{8}$/.test(body.phone) ||
    (body.ward !== undefined && (typeof body.ward !== 'string' || body.ward.length > 100)) ||
    (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 1000)) ||
    (body.source !== undefined && (typeof body.source !== 'string' || body.source.length > 100)) ||
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
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  try {
    for (const identity of [`ip:${ip}`, `phone:${body.phone}`]) {
      if (!(await allowAttempt(`checkout:${identity}`, 5))) {
        return NextResponse.json({ message: 'Bạn đã thử quá nhiều lần. Vui lòng chờ 10 phút.' }, { status: 429 });
      }
    }
    const session = await getServerSession(authOptions);
    const input = body as CheckoutInput;
    const result = await createOrder({
      fullName: input.fullName.trim(), phone: input.phone.trim(), address: input.address.trim(),
      city: input.city.trim(), district: input.district.trim(), ward: input.ward?.trim(),
      note: input.note?.slice(0, 1000), couponCode: input.couponCode?.slice(0, 30),
      source: input.source?.trim().slice(0, 100) || undefined, items: input.items,
    }, session?.user?.status === 'active' ? session.user.id : undefined, idempotencyKey);
    return NextResponse.json({ status: 'success', ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/giỏ hàng|sản phẩm|số lượng|tồn kho|giá|mã giảm|tổng tiền/i.test(message)) {
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error('Checkout failed:', error);
    return NextResponse.json({ message: 'Không thể tạo đơn hàng. Vui lòng thử lại.' }, { status: 500 });
  }
}
