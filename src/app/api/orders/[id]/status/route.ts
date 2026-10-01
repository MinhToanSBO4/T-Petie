import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/session';
import { changeOrderStatus, CONCURRENT_UPDATE, ORDER_NOT_FOUND, OrderStatusError } from '@/server/orders/order-status';
import { allowAttempt } from '@/server/security/rate-limit';
import { isSameOrigin } from '@/server/security/origin';
import { CUSTOMER_CANCEL_NOTE, CUSTOMER_ORDER_ACTIONS, type CustomerOrderAction } from '@/lib/orders/status';

export const dynamic = 'force-dynamic';

const BLOCKED: Record<CustomerOrderAction, string> = {
  cancel: 'Shop đã xác nhận đơn nên mẹ không tự hủy được nữa. Mẹ nhắn shop để được hỗ trợ nhé.',
  received: 'Chỉ xác nhận đã nhận hàng khi đơn đang được giao.',
};

/**
 * Khách tự thao tác trên đơn của mình: hủy khi shop chưa xác nhận (hoàn kho và lượt mã giảm giá),
 * hoặc xác nhận đã nhận hàng khi đơn đang giao (hoàn tất đơn, mở quyền đánh giá sản phẩm).
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  if (!/^TP-[A-Z0-9-]{6,50}$/.test(params.id)) return NextResponse.json({ error: ORDER_NOT_FOUND }, { status: 404 });
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: 'Mẹ vui lòng đăng nhập' }, { status: 401 });
  let body: { action?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  if (typeof body.action !== 'string' || !Object.hasOwn(CUSTOMER_ORDER_ACTIONS, body.action)) {
    return NextResponse.json({ error: 'Thao tác không hợp lệ' }, { status: 400 });
  }
  if (!(await allowAttempt(`order-action:${session.user.id}`, 20))) {
    return NextResponse.json({ error: 'Mẹ thao tác quá nhiều lần. Vui lòng chờ ít phút.' }, { status: 429 });
  }
  const action = body.action as CustomerOrderAction;
  const { from, to } = CUSTOMER_ORDER_ACTIONS[action];
  try {
    await changeOrderStatus(params.id, to, { ownerId: session.user.id, from, actor: 'customer',
      note: action === 'cancel' ? CUSTOMER_CANCEL_NOTE : undefined });
    return NextResponse.json({ success: true, status: to });
  } catch (error) {
    if (error instanceof OrderStatusError) {
      if (error.message === ORDER_NOT_FOUND) return NextResponse.json({ error: error.message }, { status: 404 });
      return NextResponse.json({ error: error.message === CONCURRENT_UPDATE ? error.message : BLOCKED[action] }, { status: 409 });
    }
    console.error('Customer order action failed:', error);
    return NextResponse.json({ error: 'Không cập nhật được đơn hàng' }, { status: 500 });
  }
}
