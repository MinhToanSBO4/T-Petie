import 'server-only';
import { NextResponse } from 'next/server';
import { REVIEW_BODY_MAX_BYTES, ReviewError } from './submit-review';

export type ReviewRequest = { data: Record<string, unknown>; files: File[]; keepImageUrls: string[] };

const FIELDS = ['orderItemId', 'rating', 'content', 'sizeFit', 'isAnonymous'] as const;

/**
 * Đọc đánh giá gửi dạng JSON (không ảnh) hoặc multipart (kèm ảnh đã nén ở trình duyệt).
 * Chỉ lấy đúng các trường đã biết; ảnh nằm ở trường `images`, ảnh cũ muốn giữ ở `keepImages`.
 */
export async function readReviewRequest(request: Request): Promise<ReviewRequest> {
  if (Number(request.headers.get('content-length') || 0) > REVIEW_BODY_MAX_BYTES) {
    throw new ReviewError('Ảnh quá lớn, mẹ bớt ảnh rồi gửi lại giúp shop nhé', 413);
  }
  if ((request.headers.get('content-type') || '').startsWith('multipart/form-data')) {
    let form: FormData;
    try { form = await request.formData(); } catch { throw new ReviewError('Dữ liệu không hợp lệ', 400); }
    const data: Record<string, unknown> = {};
    for (const key of FIELDS) {
      const value = form.get(key);
      if (typeof value === 'string') data[key] = value;
    }
    const uploads = form.getAll('images');
    const files = uploads.filter((value): value is File => value instanceof File);
    if (files.length !== uploads.length) throw new ReviewError('Ảnh không hợp lệ', 400);
    const keepImageUrls = form.getAll('keepImages').filter((value): value is string => typeof value === 'string');
    return { data, files, keepImageUrls };
  }
  const raw = await request.text();
  if (raw.length > 8000) throw new ReviewError('Dữ liệu quá lớn', 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new ReviewError('Dữ liệu không hợp lệ', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ReviewError('Dữ liệu không hợp lệ', 400);
  const input = body as Record<string, unknown>;
  const data = Object.fromEntries(FIELDS.filter((key) => key in input).map((key) => [key, input[key]]));
  const keepImageUrls = Array.isArray(input.keepImages) ? input.keepImages.filter((value): value is string => typeof value === 'string') : [];
  return { data, files: [], keepImageUrls };
}

/** Lỗi nghiệp vụ và lỗi kiểm tra đầu vào hiển thị cho khách; lỗi hệ thống chỉ ghi log. */
export function reviewErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ReviewError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && /không hợp lệ|tối đa/.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(`${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
