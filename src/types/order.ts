import type { CustomerOrderCounts, CustomerOrderTab, TimelineStep } from '@/lib/orders/customer-orders';

/** Đánh giá khách đã gửi cho một món trong đơn. */
export type CustomerItemReview = {
  id: string; rating: number; content: string; sizeFit: string | null; isAnonymous: boolean;
  imageUrls: string[]; status: 'pending' | 'approved'; editable: boolean; editDeadline: string;
};

/** waiting: đơn chưa giao xong · open: được đánh giá · expired: quá hạn · reviewed: đã đánh giá. */
export type ReviewAvailability = 'waiting' | 'open' | 'expired' | 'reviewed';

export type CustomerOrderItem = {
  id: string; productId: string; productName: string; productSlug: string | null; thumbnail: string;
  size: string; quantity: number; unitPrice: number; totalPrice: number;
  review: CustomerItemReview | null;
  reviewAvailability: ReviewAvailability;
  /** Dữ liệu để thêm lại vào giỏ theo giá hiện tại; null khi size đã ngừng bán hoặc hết hàng. */
  reorder: { sku: string; category: string; selectedSize: string; price: number; stock: number } | null;
};

export type CustomerOrderSummary = {
  code: string; createdAt: string; status: string; total: number; itemCount: number;
  items: CustomerOrderItem[]; pendingReviews: number; reviewDeadline: string | null;
};

export type CustomerOrderDetail = CustomerOrderSummary & {
  subtotal: number; shippingFee: number; discount: number; couponCode: string | null; paymentMethod: string;
  recipient: { name: string; phone: string; address: string }; note: string | null; timeline: TimelineStep[];
  /** Lý do hủy (đơn đã hủy) và ngày tự hoàn tất (đơn đang giao). */
  cancelReason: string | null; autoCompleteAt: string | null;
};

export type CustomerOrderList = {
  orders: CustomerOrderSummary[]; counts: CustomerOrderCounts; tab: CustomerOrderTab; page: number; pages: number;
};

/** Món đã mua của khách đang chờ đánh giá, dùng cho nút viết đánh giá ở trang sản phẩm. */
export type ReviewTarget = {
  orderItemId: string; orderCode: string; productName: string; size: string; thumbnail: string; deadline: string;
};
