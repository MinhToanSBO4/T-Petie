import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import { changeOrderStatus, OrderStatusError, undoOrderStatus } from '@/server/orders/order-status';
import { CANCEL_REASON_MAX, ORDER_STATUSES, type OrderStatus } from '@/lib/orders/status';

const isStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);

/**
 * Quản trị viên chuyển trạng thái đơn: `{ status, note? }` (hủy bắt buộc có lý do),
 * hoặc hoàn tác bước vừa bấm: `{ undo: <trạng thái hiện tại> }`.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdminApi())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  let body: { status?: unknown; note?: unknown; undo?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  try {
    if (body.undo !== undefined) {
      if (!isStatus(body.undo)) return NextResponse.json({ error: 'Thiếu trạng thái' }, { status: 400 });
      const status = await undoOrderStatus(params.id, body.undo);
      return NextResponse.json({ success: true, status });
    }
    if (!isStatus(body.status)) return NextResponse.json({ error: 'Thiếu trạng thái' }, { status: 400 });
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (note.length > CANCEL_REASON_MAX) return NextResponse.json({ error: 'Ghi chú quá dài' }, { status: 400 });
    if (body.status === 'CANCELLED' && !note) return NextResponse.json({ error: 'Vui lòng chọn lý do hủy đơn' }, { status: 400 });
    await changeOrderStatus(params.id, body.status, { actor: 'admin', note });
    return NextResponse.json({ success: true, status: body.status });
  } catch (error) {
    // Chỉ trả về lỗi nghiệp vụ đã biết (409 như trước, kể cả mã đơn không tồn tại);
    // lỗi hệ thống (Prisma, kết nối) không lộ chi tiết ra trình duyệt.
    if (error instanceof OrderStatusError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error('Order status update failed:', error);
    return NextResponse.json({ error: 'Không thể cập nhật đơn' }, { status: 500 });
  }
}
