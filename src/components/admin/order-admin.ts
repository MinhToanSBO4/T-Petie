import { AUTO_COMPLETE_DAYS, type OrderStatus, type StatusActor } from '@/lib/orders/status';

export type AdminOrderItem = { name: string; size: string; quantity: number; total: number };
export type AdminOrderEvent = { status: string; actor: StatusActor | null; note: string | null; createdAt: string };
export type AdminOrder = {
  id: string; orderCode: string; customerName: string; customerPhone: string; customerEmail: string | null;
  shippingAddress: string; ward: string | null; district: string; city: string;
  subtotal: number; shippingFee: number; discountAmount: number; totalAmount: number;
  paymentMethod: string; paymentStatus: string; orderStatus: OrderStatus;
  source: string | null; couponCode: string | null; note: string | null;
  createdAt: string; items: AdminOrderItem[]; events: AdminOrderEvent[];
};

export const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}₫`;
export const formatDateTime = (value: string) => new Date(value).toLocaleString('vi-VN', {
  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
});
export const fullAddress = (order: AdminOrder) =>
  [order.shippingAddress, order.ward, order.district, order.city].filter(Boolean).join(', ');

/** Lần gần nhất đơn chuyển sang trạng thái này (đơn có thể đã hoàn tác rồi làm lại). */
export const reachedAt = (order: AdminOrder, status: string) =>
  status === 'PENDING' ? order.createdAt : order.events.findLast((event) => event.status === status)?.createdAt ?? null;

/** Ngày đơn đang giao sẽ tự hoàn tất nếu khách không xác nhận. */
export function autoCompleteDate(order: AdminOrder): Date | null {
  if (order.orderStatus !== 'SHIPPING') return null;
  const shipped = reachedAt(order, 'SHIPPING');
  return shipped ? new Date(new Date(shipped).getTime() + AUTO_COMPLETE_DAYS * 86_400_000) : null;
}

/** Kết quả từng đơn; `conflict` = đơn đã đổi ở nơi khác (khách vừa xác nhận, người khác vừa xử lý...). */
export type BulkResult = { code: string; ok: boolean; status?: OrderStatus; error?: string; conflict?: boolean };
export type BulkRequest =
  | { action: 'advance'; codes: string[]; to: OrderStatus }
  | { action: 'cancel'; codes: string[]; note: string }
  | { action: 'undo'; items: { code: string; current: OrderStatus; to: OrderStatus }[] };

/** Xử lý một hoặc nhiều đơn trong một request; trả kết quả từng đơn (đơn lỗi không làm hỏng các đơn khác). */
export async function bulkOrders(body: BulkRequest): Promise<BulkResult[]> {
  const response = await fetch('/api/admin/orders/bulk', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Không cập nhật được đơn hàng, vui lòng thử lại');
  return result.results as BulkResult[];
}

/** Đọc lại một đơn mới nhất từ máy chủ (dùng khi trạng thái trên màn hình đã cũ). */
export async function fetchOrder(code: string): Promise<AdminOrder | null> {
  const response = await fetch(`/api/admin/orders?${new URLSearchParams({ q: code, limit: '5' })}`, { cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json();
  return (data.items as AdminOrder[]).find((order) => order.orderCode === code) ?? null;
}
