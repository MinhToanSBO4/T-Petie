import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/session';
import { getReviewTargets } from '@/server/orders/customer-orders';

export const dynamic = 'force-dynamic';

/** Món của sản phẩm mà khách đang đăng nhập đã nhận và còn hạn đánh giá (để hiện nút viết đánh giá). */
export async function GET(request: Request) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ targets: [] }, { headers: { 'Cache-Control': 'no-store' } });
  const productId = new URL(request.url).searchParams.get('productId') || '';
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(productId)) {
    return NextResponse.json({ error: 'Sản phẩm không hợp lệ' }, { status: 400 });
  }
  const targets = await getReviewTargets(session.user.id, productId);
  return NextResponse.json({ targets }, { headers: { 'Cache-Control': 'no-store' } });
}
