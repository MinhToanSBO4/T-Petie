/** Nhãn trạng thái đơn hàng dùng chung cho danh sách đơn, chi tiết đơn và trang tổng quan. */
export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'COMPLETED', 'CANCELLED'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy',
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status as OrderStatus] || status;
}
