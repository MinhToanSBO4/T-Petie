/** Bộ lọc đánh giá ở trang sản phẩm: chọn một mức tại một thời điểm (theo khuyến nghị của Baymard). */
export const REVIEW_FILTERS = ['all', '5', '4', '3', '2', '1', 'media', 'comment'] as const;
export type ReviewFilter = (typeof REVIEW_FILTERS)[number];

export const REVIEWS_PER_PAGE = 10;
/** Dưới ngưỡng này phân bố sao không có ý nghĩa thống kê nên chỉ hiện điểm trung bình. */
export const RATING_DISTRIBUTION_MIN = 6;

export function parseReviewFilter(value: string | null | undefined): ReviewFilter {
  return (REVIEW_FILTERS as readonly string[]).includes(value || '') ? value as ReviewFilter : 'all';
}

export type ReviewSummary = {
  average: number; total: number; counts: Record<'1' | '2' | '3' | '4' | '5', number>;
  withImages: number; withComments: number; fit: { small: number; fit: number; large: number };
};

export type PublicReview = {
  id: string; name: string; rating: number; content: string; variantLabel: string | null; sizeFit: string | null;
  images: string[]; createdAt: string; verified: boolean; edited: boolean;
};

/** Nhận xét về kích cỡ khi đủ ít nhất 3 câu trả lời, ví dụ "8/10 mẹ thấy vừa vặn". */
export function fitSummary(fit: ReviewSummary['fit']): { label: string; share: number; answers: number } | null {
  const answers = fit.small + fit.fit + fit.large;
  if (answers < 3) return null;
  const [key, count] = (Object.entries(fit) as [keyof typeof fit, number][]).sort((a, b) => b[1] - a[1])[0];
  const label = key === 'fit' ? 'thấy vừa vặn' : key === 'small' ? 'thấy hơi chật' : 'thấy hơi rộng';
  return { label, share: count / answers, answers };
}
