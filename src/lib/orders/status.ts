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

/** Quy trình xử lý đơn: chỉ được chuyển tới các trạng thái kế tiếp được liệt kê. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: string, to: string): boolean {
  return (ORDER_TRANSITIONS[from as OrderStatus] || []).includes(to as OrderStatus);
}

/**
 * Thao tác khách tự làm trên đơn của mình (như Shopee): hủy khi shop chưa xác nhận,
 * bấm "Đã nhận được hàng" khi đơn đang giao để hoàn tất đơn và mở quyền đánh giá.
 */
export const CUSTOMER_ORDER_ACTIONS = {
  cancel: { from: 'PENDING', to: 'CANCELLED' },
  received: { from: 'SHIPPING', to: 'COMPLETED' },
} as const satisfies Record<string, { from: OrderStatus; to: OrderStatus }>;
export type CustomerOrderAction = keyof typeof CUSTOMER_ORDER_ACTIONS;

export type StatusTone = 'pending' | 'progress' | 'shipping' | 'done' | 'cancelled';

/** Cách gọi trạng thái dành cho khách: nói rõ đơn đang ở đâu và ai đang xử lý. */
export const CUSTOMER_STATUS_COPY: Record<OrderStatus, { label: string; description: string; tone: StatusTone }> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'pending',
    description: 'Shop sẽ liên hệ xác nhận đơn trong giờ làm việc. Mẹ vẫn có thể hủy đơn ở bước này.' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'progress', description: 'Shop đã xác nhận đơn và sắp chuẩn bị hàng.' },
  PROCESSING: { label: 'Đang chuẩn bị hàng', tone: 'progress', description: 'Shop đang kiểm tra và đóng gói đơn cho mẹ.' },
  SHIPPING: { label: 'Đang giao', tone: 'shipping',
    description: 'Đơn đang trên đường giao. Khi nhận đủ hàng, mẹ bấm "Đã nhận được hàng" nhé.' },
  COMPLETED: { label: 'Giao hàng thành công', tone: 'done', description: 'Đơn đã hoàn tất. Mẹ đánh giá sản phẩm để giúp các mẹ khác chọn đồ nhé.' },
  CANCELLED: { label: 'Đã hủy', tone: 'cancelled', description: 'Đơn đã được hủy.' },
};

export function customerStatus(status: string) {
  return CUSTOMER_STATUS_COPY[status as OrderStatus] || { label: status, description: '', tone: 'pending' as StatusTone };
}
