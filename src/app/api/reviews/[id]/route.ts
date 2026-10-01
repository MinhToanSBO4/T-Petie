import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/session';
import { updateOwnReview } from '@/server/reviews/submit-review';
import { readReviewRequest, reviewErrorResponse } from '@/server/reviews/review-request';
import { allowAttempt } from '@/server/security/rate-limit';
import { clientIp } from '@/server/security/client-ip';
import { isSameOrigin } from '@/server/security/origin';
import { parseReviewFields } from '@/lib/content/review-input';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Khách sửa đánh giá của chính mình (một lần trong 30 ngày); bản sửa hiển thị ngay. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(params.id)) return NextResponse.json({ error: 'Không tìm thấy đánh giá' }, { status: 404 });
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: 'Mẹ vui lòng đăng nhập để sửa đánh giá' }, { status: 401 });
  if (!(await allowAttempt(`review:${clientIp(request)}:${session.user.id}`, 10))) {
    return NextResponse.json({ error: 'Mẹ thao tác quá nhiều lần. Vui lòng chờ 10 phút.' }, { status: 429 });
  }
  try {
    const { data, files, keepImageUrls } = await readReviewRequest(request);
    await updateOwnReview({ userId: session.user.id, reviewId: params.id, fields: parseReviewFields(data), keepImageUrls, files });
    return NextResponse.json({ success: true });
  } catch (error) {
    return reviewErrorResponse(error, 'Không lưu được đánh giá');
  }
}
