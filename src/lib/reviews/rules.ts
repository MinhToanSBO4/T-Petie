/**
 * Quy tắc đánh giá tham khảo Shopee: chỉ đánh giá món thuộc đơn đã hoàn tất, trong 30 ngày kể từ khi
 * hoàn tất; mỗi đánh giá được sửa một lần trong 30 ngày kể từ lúc gửi.
 */
export const REVIEW_WINDOW_DAYS = 30;
export const REVIEW_EDIT_WINDOW_DAYS = 30;
export const REVIEW_MAX_EDITS = 1;

const DAY_MS = 86_400_000;

const toDate = (value: Date | string) => value instanceof Date ? value : new Date(value);

export function reviewDeadline(completedAt: Date | string | null | undefined): Date | null {
  return completedAt ? new Date(toDate(completedAt).getTime() + REVIEW_WINDOW_DAYS * DAY_MS) : null;
}

export function editDeadline(createdAt: Date | string): Date {
  return new Date(toDate(createdAt).getTime() + REVIEW_EDIT_WINDOW_DAYS * DAY_MS);
}

export type ReviewBlockReason = 'not-completed' | 'expired' | 'reviewed';

export const REVIEW_BLOCK_MESSAGES: Record<ReviewBlockReason, string> = {
  'not-completed': 'Mẹ đánh giá được sau khi đơn đã giao thành công.',
  expired: `Đã quá hạn đánh giá (${REVIEW_WINDOW_DAYS} ngày kể từ khi nhận hàng).`,
  reviewed: 'Mẹ đã đánh giá sản phẩm này trong đơn hàng rồi.',
};

/** Món hàng có được viết đánh giá mới hay không, kèm lý do khi bị chặn. */
export function reviewEligibility({ orderStatus, completedAt, hasReview, now = new Date() }: {
  orderStatus: string; completedAt: Date | string | null | undefined; hasReview: boolean; now?: Date;
}): { ok: true; deadline: Date } | { ok: false; reason: ReviewBlockReason } {
  if (hasReview) return { ok: false, reason: 'reviewed' };
  const deadline = reviewDeadline(completedAt);
  if (orderStatus !== 'COMPLETED' || !deadline) return { ok: false, reason: 'not-completed' };
  if (now.getTime() > deadline.getTime()) return { ok: false, reason: 'expired' };
  return { ok: true, deadline };
}

export function canEditReview({ createdAt, editCount, now = new Date() }: {
  createdAt: Date | string; editCount: number; now?: Date;
}): boolean {
  return editCount < REVIEW_MAX_EDITS && now.getTime() <= editDeadline(createdAt).getTime();
}

/** Che tên kiểu Shopee ("N*****n") khi khách chọn ẩn danh. */
export function maskName(name: string): string {
  const letters = Array.from(name.replace(/\s+/g, ''));
  if (letters.length === 0) return 'Khách hàng';
  return letters.length === 1 ? `${letters[0]}*****` : `${letters[0]}*****${letters[letters.length - 1]}`;
}

export function reviewerName(customerName: string, isAnonymous: boolean): string {
  const name = customerName.trim() || 'Khách hàng';
  return isAnonymous ? maskName(name) : name;
}
