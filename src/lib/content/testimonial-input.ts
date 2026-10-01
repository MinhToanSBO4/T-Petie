/** Feedback dạng ảnh chụp màn hình tin nhắn: ảnh Cloudinary trong thư viện, chú thích ngắn tùy chọn. */
export const FEEDBACK_CAPTION_MAX = 120;
/** Số ảnh tối đa trong một lần thêm, khớp giới hạn tải nhiều ảnh của thư viện media. */
export const FEEDBACK_BATCH_MAX = 12;

export type TestimonialImageInput = { imageUrl: string; caption: string | null; productId: string | null };
type PublishSettings = { sortOrder: number; consentConfirmed: boolean; isPublished: boolean };
export type TestimonialInput = TestimonialImageInput & PublishSettings;
export type TestimonialBatchInput = PublishSettings & { items: TestimonialImageInput[] };

function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Feedback không hợp lệ');
  return raw as Record<string, unknown>;
}

function feedbackImage(value: unknown): string {
  if (typeof value !== 'string' || value.length > 500) throw new Error('Ảnh feedback không hợp lệ');
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && url.pathname.includes('/image/upload/')) {
      return url.toString();
    }
  } catch { /* URL sai định dạng */ }
  throw new Error('Ảnh feedback không hợp lệ');
}

function optionalCaption(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error('Chú thích feedback không hợp lệ');
  const caption = value.replace(/\s+/g, ' ').trim();
  if (caption.length > FEEDBACK_CAPTION_MAX) throw new Error('Chú thích feedback không hợp lệ');
  return caption || null;
}

function optionalProductId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error('Sản phẩm liên quan không hợp lệ');
  return value;
}

function imageInput(raw: unknown): TestimonialImageInput {
  const input = record(raw);
  return { imageUrl: feedbackImage(input.imageUrl), caption: optionalCaption(input.caption),
    productId: optionalProductId(input.productId) };
}

function publishSettings(input: Record<string, unknown>): PublishSettings {
  const sortOrder = input.sortOrder === undefined ? 0 : input.sortOrder;
  if (!Number.isInteger(sortOrder) || Number(sortOrder) < 0 || Number(sortOrder) > 999 ||
    typeof input.consentConfirmed !== 'boolean' || typeof input.isPublished !== 'boolean') {
    throw new Error('Thiết lập feedback không hợp lệ');
  }
  if (input.isPublished && !input.consentConfirmed) throw new Error('Cần xác nhận sự đồng ý của khách trước khi công bố');
  return { sortOrder: Number(sortOrder), consentConfirmed: input.consentConfirmed, isPublished: input.isPublished };
}

/** Một feedback khi chỉnh sửa. Công bố bắt buộc đã xác nhận khách đồng ý. */
export function parseTestimonialInput(raw: unknown): TestimonialInput {
  const input = record(raw);
  return { ...imageInput(input), ...publishSettings(input) };
}

/** Thêm nhiều ảnh cùng lúc với chung thiết lập công bố; mỗi ảnh có chú thích và sản phẩm riêng. */
export function parseTestimonialBatch(raw: unknown): TestimonialBatchInput {
  const input = record(raw);
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > FEEDBACK_BATCH_MAX) {
    throw new Error('Danh sách ảnh feedback không hợp lệ');
  }
  const items = input.items.map(imageInput);
  if (new Set(items.map((item) => item.imageUrl)).size !== items.length) throw new Error('Danh sách ảnh feedback không hợp lệ');
  return { ...publishSettings(input), items };
}
