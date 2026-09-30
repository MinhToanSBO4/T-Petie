import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/server/auth/staff-session';
import { DASHBOARD_TAG } from '@/server/admin/dashboard';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { revalidateTag } from 'next/cache';

const INVALID_TRANSITION = 'Chuyển trạng thái không hợp lệ';
const CONCURRENT_UPDATE = 'Đơn hàng đã được cập nhật bởi người khác';

const transitions: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED'],
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  let body: { status?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (typeof body.status !== 'string') return NextResponse.json({ error: 'Thiếu trạng thái' }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { orderCode: params.id }, include: { items: true } });
      if (!order || !transitions[order.orderStatus]?.includes(body.status as string)) throw new Error(INVALID_TRANSITION);
      const updated = await tx.order.updateMany({
        where: { id: order.id, orderStatus: order.orderStatus },
        data: { orderStatus: body.status as string },
      });
      if (updated.count !== 1) throw new Error(CONCURRENT_UPDATE);
      if (body.status === 'CANCELLED') {
        for (const item of order.items) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        }
        if (order.couponCode) {
          await tx.coupon.update({ where: { code: order.couponCode }, data: { usedCount: { decrement: 1 } } });
        }
      }
    });
    if (body.status === 'CANCELLED') revalidateTag('products');
    revalidateTag(DASHBOARD_TAG);
    return NextResponse.json({ success: true });
  } catch (error) {
    // Chỉ trả về lỗi nghiệp vụ đã biết; lỗi hệ thống (Prisma, kết nối) không lộ chi tiết ra trình duyệt.
    if (error instanceof Error && (error.message === INVALID_TRANSITION || error.message === CONCURRENT_UPDATE)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Order status update failed:', error);
    return NextResponse.json({ error: 'Không thể cập nhật đơn' }, { status: 500 });
  }
}
