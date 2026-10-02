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
  // Hủy khi đang giao = giao không thành công / khách không nhận, hàng quay về kho.
  SHIPPING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: string, to: string): boolean {
  return (ORDER_TRANSITIONS[from as OrderStatus] || []).includes(to as OrderStatus);
}

/** Bước kế tiếp trên quy trình chính (không tính hủy) và tên hành động trên nút của quản trị viên. */
export const ADMIN_NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PENDING: { to: 'CONFIRMED', label: 'Xác nhận đơn' },
  CONFIRMED: { to: 'PROCESSING', label: 'Bắt đầu đóng gói' },
  PROCESSING: { to: 'SHIPPING', label: 'Giao cho shipper' },
  SHIPPING: { to: 'COMPLETED', label: 'Đã giao thành công' },
};

/** Tên hành động khi chuyển tới một trạng thái (dùng cho "Chuyển tới…" và thông báo). */
export const ADMIN_TARGET_LABELS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị hàng', SHIPPING: 'Đã giao cho shipper', COMPLETED: 'Giao thành công',
};

/** Quy trình chính theo thứ tự (không gồm Hủy). */
export const MAIN_FLOW: readonly OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'COMPLETED'];

/** Liên kết mở sẵn trang đơn hàng: ?tab=<trạng thái>&order=<mã đơn>; giá trị lạ bị bỏ qua. */
export function parseOrdersLink(params: { tab?: string; order?: string }) {
  return {
    initialTab: ORDER_STATUSES.find((status) => status === params.tab),
    initialOrder: params.order && /^[A-Za-z0-9-]{4,60}$/.test(params.order) ? params.order : undefined,
  };
}

/** Bước shop còn phải xử lý: danh sách đơn mặc định xếp đơn cũ nhất lên đầu để làm theo thứ tự đặt. */
export const OLDEST_FIRST_STATUSES: readonly OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING'];

/**
 * Các bước lần lượt đi qua để đưa đơn từ `from` tới `to` theo quy trình chính, ví dụ PENDING → SHIPPING là
 * [CONFIRMED, PROCESSING, SHIPPING]. Quản trị viên chuyển thẳng tới bước sau (đơn đã xác nhận qua điện thoại và
 * giao luôn) vẫn ghi đủ từng bước vào lịch sử để hành trình đơn của khách liền mạch.
 * Trả về null nếu không tiến được: lùi bước, đứng yên, đơn đã hủy hoặc trạng thái lạ.
 */
export function forwardPath(from: string, to: string): OrderStatus[] | null {
  const start = MAIN_FLOW.indexOf(from as OrderStatus);
  const end = MAIN_FLOW.indexOf(to as OrderStatus);
  if (start < 0 || end <= start) return null;
  return MAIN_FLOW.slice(start + 1, end + 1);
}

/** Số đơn tối đa trong một lần xử lý hàng loạt (giống giới hạn 50 đơn/lần của các phần mềm quản lý bán hàng). */
export const BULK_ORDER_LIMIT = 50;

/**
 * Bấm nhầm thì được hoàn tác ngay sau đó (nút trên thông báo hiện 8 giây; máy chủ cho phép trong 30 giây để bù
 * độ trễ mạng), kể cả khi vừa chuyển thẳng nhiều bước. Hoàn tất cũng hoàn tác được trong khoảng này nếu khách
 * chưa kịp đánh giá. Không hoàn tác Hủy vì đã hoàn kho và trả lượt mã giảm giá.
 */
export const UNDO_WINDOW_MS = 30_000;
export const UNDOABLE_STATUSES: readonly OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'SHIPPING', 'COMPLETED'];
export const PREVIOUS_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: 'PENDING', PROCESSING: 'CONFIRMED', SHIPPING: 'PROCESSING', COMPLETED: 'SHIPPING',
};

/**
 * Đơn đang giao mà khách không bấm "Đã nhận được hàng" sẽ tự hoàn tất sau số ngày này
 * (tính từ lúc giao cho shipper), để đơn đã tới tay khách không nằm mãi ở "Đang giao".
 */
export const AUTO_COMPLETE_DAYS = 7;

/** Lý do hủy chọn sẵn; lý do "Khác" do quản trị viên tự nhập. */
export const CANCEL_REASONS = {
  beforeShipping: ['Khách yêu cầu hủy', 'Không liên lạc được với khách', 'Hết hàng / hết size', 'Đơn trùng hoặc đặt nhầm', 'Nghi ngờ đơn ảo'],
  shipping: ['Khách không nhận hàng', 'Giao không thành công, hàng hoàn về shop', 'Hàng hư hỏng khi vận chuyển'],
} as const;
export const CANCEL_REASON_MAX = 200;
/**
 * Lý do hủy mà hàng không quay lại kệ: hết hàng thật (tồn kho trên hệ thống đang sai) hoặc hàng hư khi vận chuyển.
 * Hủy với các lý do này không cộng lại tồn kho, tránh bán tiếp số hàng không còn.
 */
export const NO_RESTOCK_REASONS: readonly string[] = ['Hết hàng / hết size', 'Hàng hư hỏng khi vận chuyển'];
export const restocksOnCancel = (reason: string | null | undefined) => !NO_RESTOCK_REASONS.includes((reason || '').trim());
export const CUSTOMER_CANCEL_NOTE = 'Khách tự hủy đơn';

/** Ai đổi trạng thái đơn: quản trị viên, nhân viên, khách (tự hủy/xác nhận đã nhận) hoặc hệ thống (tự hoàn tất). */
export type StatusActor = 'admin' | 'staff' | 'customer' | 'system';
/** Thao tác của shop (quản trị viên hoặc nhân viên), hoàn tác được trong UNDO_WINDOW_MS. */
export const isShopActor = (actor: string | null) => actor === 'admin' || actor === 'staff';

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
