import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';
import { allowAttempt } from '@/server/security/rate-limit';
import { clientIp } from '@/server/security/client-ip';
import { isSameOrigin } from '@/server/security/origin';
import { parseReviewInput } from '@/lib/content/review-input';

export const dynamic = 'force-dynamic';

/** Danh sách đánh giá đã duyệt của một sản phẩm (công khai). */
export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get('productId') || '';
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(productId)) {
    return NextResponse.json({ error: 'Sản phẩm không hợp lệ' }, { status: 400 });
  }
  const reviews = await prisma.productReview.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, customerName: true, rating: true, content: true, createdAt: true },
  });
  return NextResponse.json({ reviews }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Khách đã đăng nhập gửi đánh giá; đánh giá chờ quản trị viên duyệt. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active') {
    return NextResponse.json({ error: 'Vui lòng đăng nhập để gửi đánh giá' }, { status: 401 });
  }
  if (!(await allowAttempt(`review:${clientIp(request)}:${session.user.id}`, 10))) {
    return NextResponse.json({ error: 'Bạn đã gửi quá nhiều đánh giá. Vui lòng chờ 10 phút.' }, { status: 429 });
  }
  const raw = await request.text();
  if (raw.length > 4000) return NextResponse.json({ error: 'Nội dung quá lớn' }, { status: 413 });
  try {
    const input = parseReviewInput(JSON.parse(raw));
    // Đánh giá phải gắn với sản phẩm đang bán.
    const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
    if (!product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
    const existing = await prisma.productReview.count({ where: { productId: input.productId, userId: session.user.id } });
    if (existing > 0) return NextResponse.json({ error: 'Bạn đã đánh giá sản phẩm này rồi' }, { status: 409 });
    const created = await prisma.productReview.create({ data: { productId: input.productId, userId: session.user.id,
      customerName: session.user.name || 'Khách hàng', rating: input.rating, content: input.content } });
    return NextResponse.json({ id: created.id, status: 'pending' }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    if (error instanceof Error && /không hợp lệ|cần từ/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Review create failed:', error);
    return NextResponse.json({ error: 'Không gửi được đánh giá' }, { status: 500 });
  }
}
