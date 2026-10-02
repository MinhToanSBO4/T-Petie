import { NextResponse } from 'next/server';
import { requireStaffApi } from '@/server/auth/staff-session';
import { isSameOrigin } from '@/server/security/origin';
import { bulkChangeOrderStatus, bulkUndoOrderStatus } from '@/server/orders/order-status';
import { BULK_ORDER_LIMIT, CANCEL_REASON_MAX, MAIN_FLOW, ORDER_STATUSES, type OrderStatus } from '@/lib/orders/status';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CODE = /^[A-Za-z0-9-]{4,60}$/;
const isStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);

function parseCodes(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > BULK_ORDER_LIMIT) return null;
  if (!value.every((code) => typeof code === 'string' && CODE.test(code))) return null;
  return Array.from(new Set(value as string[]));
}

/**
 * Xử lý nhiều đơn trong một lần (quản trị viên hoặc nhân viên), tối đa BULK_ORDER_LIMIT đơn:
 * - `{ action: 'advance', codes, to }`: chuyển tới bước `to`, kể cả nhảy nhiều bước (lịch sử ghi đủ từng bước).
 * - `{ action: 'cancel', codes, note }`: hủy kèm lý do bắt buộc, hoàn kho.
 * - `{ action: 'undo', items: [{ code, current, to }] }`: hoàn tác thao tác vừa làm.
 * Luôn trả kết quả từng đơn; đơn không xử lý được (đã đổi ở nơi khác, không còn bước đó) không làm hỏng các đơn còn lại.
 */
export async function POST(request: Request) {
  const session = await requireStaffApi();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const actor = session.user.role === 'admin' ? 'admin' : 'staff';
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

  try {
    if (body.action === 'undo') {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length || items.length > BULK_ORDER_LIMIT) return NextResponse.json({ error: 'Danh sách đơn không hợp lệ' }, { status: 400 });
      const parsed = items.map((item) => item as { code?: unknown; current?: unknown; to?: unknown });
      if (!parsed.every((item) => typeof item.code === 'string' && CODE.test(item.code) && isStatus(item.current) && isStatus(item.to))) {
        return NextResponse.json({ error: 'Danh sách đơn không hợp lệ' }, { status: 400 });
      }
      const results = await bulkUndoOrderStatus(parsed as { code: string; current: OrderStatus; to: OrderStatus }[]);
      return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const codes = parseCodes(body.codes);
    if (!codes) return NextResponse.json({ error: `Chọn từ 1 đến ${BULK_ORDER_LIMIT} đơn` }, { status: 400 });
    if (body.action === 'cancel') {
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (!note) return NextResponse.json({ error: 'Vui lòng chọn lý do hủy đơn' }, { status: 400 });
      if (note.length > CANCEL_REASON_MAX) return NextResponse.json({ error: 'Ghi chú quá dài' }, { status: 400 });
      const results = await bulkChangeOrderStatus(codes, 'CANCELLED', { actor, note });
      return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.action === 'advance') {
      if (!isStatus(body.to) || body.to === 'PENDING' || !MAIN_FLOW.includes(body.to)) {
        return NextResponse.json({ error: 'Bước chuyển không hợp lệ' }, { status: 400 });
      }
      const results = await bulkChangeOrderStatus(codes, body.to, { actor, jump: true });
      return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: 'Thao tác không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Bulk order action failed:', error);
    return NextResponse.json({ error: 'Không cập nhật được đơn hàng' }, { status: 500 });
  }
}
