import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/server/auth/options';
import { quoteOrder } from '@/server/orders/quote-order';
import { allowAttempt } from '@/server/security/rate-limit';
import { clientIp } from '@/server/security/client-ip';
import { kickEmailOutbox } from '@/server/email/outbox';

export const dynamic = 'force-dynamic';
// Gửi thư còn tồn trong hàng đợi sau phản hồi (tối đa một lần mỗi 2 phút mỗi máy chủ); cần đủ thời gian cho một lần gửi.
export const maxDuration = 60;

export async function POST(request: Request) {
  kickEmailOutbox();
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  // Báo giá là endpoint công khai: giới hạn chung để tránh lạm dụng, và siết chặt hơn khi thử mã giảm giá.
  const ip = clientIp(request);
  if (!(await allowAttempt(`quote:${ip}`, 120))) {
    return NextResponse.json({ error: 'Bạn đã thử quá nhiều lần. Vui lòng chờ 10 phút.' }, { status: 429 });
  }
  let body: { items?: unknown; couponCode?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ error: 'Giỏ hàng quá lớn' }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (!body || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30 ||
    body.items.some((item) => !item || typeof item.productId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.productId) ||
      typeof item.selectedSize !== 'string' || item.selectedSize.length > 100 ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) ||
    (body.couponCode !== undefined && (typeof body.couponCode !== 'string' || body.couponCode.length > 30))) {
    return NextResponse.json({ error: 'Giỏ hàng không hợp lệ' }, { status: 400 });
  }
  // Mã giảm giá là thứ dễ bị dò nhất nên đếm riêng, không phụ thuộc số lần báo giá thông thường.
  if (body.couponCode && !(await allowAttempt(`quote-coupon:${ip}`, 25))) {
    return NextResponse.json({ error: 'Bạn đã thử quá nhiều mã giảm giá. Vui lòng chờ 10 phút.' }, { status: 429 });
  }
  try {
    const session = body.couponCode ? await getServerSession(authOptions) : null;
    const result = await quoteOrder(body.items, body.couponCode as string | undefined, session?.user?.status === 'active');
    return NextResponse.json({ subtotal: result.subtotal, shippingFee: result.shippingFee,
      discountAmount: result.discount, total: result.total,
      freeShippingThreshold: result.freeShippingThreshold, couponCode: result.couponCode,
      items: result.items.map((item, index) => ({
        productId: item.productId, selectedSize: (body.items as Array<{ selectedSize: string }>)[index].selectedSize,
        quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice,
      })) },
    { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Chưa cấu hình phí giao hàng') {
      console.error('Quote blocked: commerce_settings row "default" is missing (save /admin/settings)');
      return NextResponse.json({ error: 'Shop đang cập nhật phí giao hàng, mẹ vui lòng thử lại sau ít phút nhé.' }, { status: 503 });
    }
    if (/giỏ hàng|sản phẩm|số lượng|tồn kho|giá|mã giảm|thanh toán|tổng tiền/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Quote failed:', error);
    return NextResponse.json({ error: 'Không tính được đơn hàng' }, { status: 500 });
  }
}
