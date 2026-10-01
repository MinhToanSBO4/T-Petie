import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/session';
import { getProductReviewPage, getProductReviewSummary } from '@/server/content/reviews';
import { createVerifiedReview } from '@/server/reviews/submit-review';
import { readReviewRequest, reviewErrorResponse } from '@/server/reviews/review-request';
import { allowAttempt } from '@/server/security/rate-limit';
import { clientIp } from '@/server/security/client-ip';
import { isSameOrigin } from '@/server/security/origin';
import { parseOrderItemId, parseReviewFields } from '@/lib/content/review-input';
import { parseReviewFilter } from '@/lib/reviews/filters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Đánh giá đã duyệt của một sản phẩm (công khai): tổng quan + một trang theo bộ lọc. */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const productId = searchParams.get('productId') || '';
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(productId)) {
    return NextResponse.json({ error: 'Sản phẩm không hợp lệ' }, { status: 400 });
  }
  const filter = parseReviewFilter(searchParams.get('filter'));
  const page = Math.min(100, Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1));
  const [summary, list] = await Promise.all([getProductReviewSummary(productId), getProductReviewPage(productId, filter, page)]);
  return NextResponse.json({ summary, filter, ...list }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Khách đánh giá một món đã mua. Máy chủ tự kiểm tra món thuộc đơn của chính khách, đơn đã hoàn tất
 * và còn hạn; giao diện chỉ gửi mã món hàng.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: 'Mẹ vui lòng đăng nhập để gửi đánh giá' }, { status: 401 });
  if (!(await allowAttempt(`review:${clientIp(request)}:${session.user.id}`, 10))) {
    return NextResponse.json({ error: 'Mẹ đã gửi quá nhiều đánh giá. Vui lòng chờ 10 phút.' }, { status: 429 });
  }
  try {
    const { data, files } = await readReviewRequest(request);
    const fields = parseReviewFields(data);
    const id = await createVerifiedReview({ userId: session.user.id, customerName: session.user.name || '',
      orderItemId: parseOrderItemId(data.orderItemId), fields, files });
    return NextResponse.json({ id, status: 'pending' }, { status: 201 });
  } catch (error) {
    return reviewErrorResponse(error, 'Không gửi được đánh giá');
  }
}
