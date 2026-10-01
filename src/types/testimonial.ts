/** Feedback dạng ảnh chụp màn hình đã công bố, hiển thị ở trang chủ (story) và trang /feedback (album). */
export type PublicFeedback = {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  product: { name: string; slug: string } | null;
};

