export const REVIEW_CONTENT_MAX = 1000;
export const REVIEW_REPLY_MAX = 1000;
export const REVIEW_MAX_IMAGES = 5;

export const SIZE_FIT_OPTIONS = [
  { value: 'small', label: 'Hơi chật' },
  { value: 'fit', label: 'Vừa vặn' },
  { value: 'large', label: 'Hơi rộng' },
] as const;
export type SizeFit = (typeof SIZE_FIT_OPTIONS)[number]['value'];

/** Nhãn cho từng mức sao, cùng cách gọi với Shopee để khách quen thuộc. */
export const RATING_LABELS: Record<number, string> = {
  1: 'Tệ', 2: 'Không hài lòng', 3: 'Bình thường', 4: 'Hài lòng', 5: 'Tuyệt vời',
};

/** Gợi ý chạm nhanh để khách viết đánh giá nhanh hơn trên điện thoại. */
export const REVIEW_QUICK_TAGS = [
  'Vải mềm mát', 'Đường may đẹp', 'Giống hình', 'Bé mặc rất thích', 'Đóng gói cẩn thận', 'Giao hàng nhanh',
] as const;

export type ReviewFields = { rating: number; content: string; sizeFit: SizeFit | null; isAnonymous: boolean };

export function sizeFitLabel(value: string | null | undefined) {
  return SIZE_FIT_OPTIONS.find((option) => option.value === value)?.label || null;
}

function flag(value: unknown): boolean {
  if (value === undefined || value === null || value === false || value === 'false' || value === '0' || value === '') return false;
  if (value === true || value === 'true' || value === '1' || value === 'on') return true;
  throw new Error('Đánh giá không hợp lệ');
}

/**
 * Trường đánh giá khách gửi, nhận cả JSON lẫn chuỗi từ FormData (khi gửi kèm ảnh).
 * Bắt buộc 1–5 sao; nội dung có thể để trống như Shopee, tối đa 1000 ký tự.
 */
export function parseReviewFields(raw: unknown): ReviewFields {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Đánh giá không hợp lệ');
  const input = raw as Record<string, unknown>;
  const rating = typeof input.rating === 'string' && /^\d$/.test(input.rating) ? Number(input.rating) : input.rating;
  if (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5) throw new Error('Số sao đánh giá không hợp lệ');
  if (input.content !== undefined && input.content !== null && typeof input.content !== 'string') {
    throw new Error('Nội dung đánh giá không hợp lệ');
  }
  const content = typeof input.content === 'string' ? input.content.replace(/\r\n/g, '\n').trim() : '';
  if (content.length > REVIEW_CONTENT_MAX) throw new Error(`Nội dung đánh giá tối đa ${REVIEW_CONTENT_MAX} ký tự`);
  const sizeFit = input.sizeFit === undefined || input.sizeFit === null || input.sizeFit === '' ? null : input.sizeFit;
  if (sizeFit !== null && !SIZE_FIT_OPTIONS.some((option) => option.value === sizeFit)) {
    throw new Error('Cảm nhận kích cỡ không hợp lệ');
  }
  return { rating: Number(rating), content, sizeFit: sizeFit as SizeFit | null, isAnonymous: flag(input.isAnonymous) };
}

/** Mã món hàng trong đơn mà khách muốn đánh giá. */
export function parseOrderItemId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error('Đánh giá không hợp lệ');
  return value;
}
