/** Feedback dạng ảnh chụp màn hình đã công bố, hiển thị ở trang chủ (story) và trang /feedback (album). */
export type PublicFeedback = {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  product: { name: string; slug: string } | null;
};

/** Đánh giá của khách đã mua được chọn hiện ở trang chủ (tên đã che nếu khách chọn ẩn danh). */
export type FeaturedReview = {
  id: string; customerName: string; quote: string; rating: number;
  productName: string; productSlug: string | null; variantLabel: string | null; verified: boolean;
};
