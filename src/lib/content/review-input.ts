export type ReviewInput = { productId: string; rating: number; content: string };

/** Đánh giá khách gửi: 1–5 sao, nội dung 10–2000 ký tự. */
export function parseReviewInput(raw: unknown): ReviewInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Đánh giá không hợp lệ');
  const input = raw as Record<string, unknown>;
  if (typeof input.productId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.productId)) {
    throw new Error('Đánh giá không hợp lệ');
  }
  if (!Number.isInteger(input.rating) || Number(input.rating) < 1 || Number(input.rating) > 5) {
    throw new Error('Số sao đánh giá không hợp lệ');
  }
  if (typeof input.content !== 'string' || input.content.trim().length < 10 || input.content.length > 2000) {
    throw new Error('Nội dung đánh giá cần từ 10 đến 2000 ký tự');
  }
  return { productId: input.productId, rating: Number(input.rating), content: input.content.trim() };
}
