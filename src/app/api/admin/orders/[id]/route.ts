import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import { changeOrderStatus, OrderStatusError } from '@/server/orders/order-status';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orders/status';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  let body: { status?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (typeof body.status !== 'string' || !(ORDER_STATUSES as readonly string[]).includes(body.status)) {
    return NextResponse.json({ error: 'Thiếu trạng thái' }, { status: 400 });
  }
  try {
    await changeOrderStatus(params.id, body.status as OrderStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    // Chỉ trả về lỗi nghiệp vụ đã biết (409 như trước, kể cả mã đơn không tồn tại);
    // lỗi hệ thống (Prisma, kết nối) không lộ chi tiết ra trình duyệt.
    if (error instanceof OrderStatusError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error('Order status update failed:', error);
    return NextResponse.json({ error: 'Không thể cập nhật đơn' }, { status: 500 });
  }
}
