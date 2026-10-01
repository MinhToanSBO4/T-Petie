import { NextResponse } from 'next/server';
import { parseTestimonialBatch } from '@/lib/content/testimonial-input';
import { paginated, parsePagination, parseSearch } from '@/lib/pagination';
import { getStaffSession } from '@/server/auth/staff-session';
import { FeedbackInputError, resolveFeedbackImages } from '@/server/content/feedback-admin';
import { invalidateTestimonials } from '@/server/content/invalidate';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 12, 48);
  const search = parseSearch(searchParams);
  const status = searchParams.get('filter') || '';
  const where = {
    ...(search ? { OR: [{ caption: { contains: search, mode: 'insensitive' as const } },
      { product: { name: { contains: search, mode: 'insensitive' as const } } }] } : {}),
    ...(status === 'published' ? { isPublished: true, consentConfirmed: true }
      : status === 'draft' ? { OR: [{ isPublished: false }, { consentConfirmed: false }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.customerTestimonial.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], skip, take,
      include: { product: { select: { name: true } } } }),
    prisma.customerTestimonial.count({ where }),
  ]);
  const items = rows.map((row) => ({ id: row.id, imageUrl: row.imageUrl, imageWidth: row.imageWidth, imageHeight: row.imageHeight,
    caption: row.caption, productId: row.productId, productName: row.product?.name || null, sortOrder: row.sortOrder,
    consentConfirmed: row.consentConfirmed, isPublished: row.isPublished, createdAt: row.createdAt.toISOString() }));
  return NextResponse.json({ ...paginated(items, total, page, limit) }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Thêm một hoặc nhiều ảnh feedback cùng lúc (tối đa 12), giữ đúng thứ tự ảnh đã chọn. */
export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 20000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
    const batch = parseTestimonialBatch(JSON.parse(raw));
    const sizes = await resolveFeedbackImages(batch.items.map((item) => item.imageUrl),
      batch.items.flatMap((item) => item.productId ? [item.productId] : []));
    // Danh sách sắp mới nhất trước khi cùng thứ tự hiển thị, nên ảnh chọn đầu tiên nhận mốc thời gian muộn nhất.
    const base = Date.now();
    const created = await prisma.customerTestimonial.createMany({ data: batch.items.map((item, index) => ({
      ...item, ...sizes.get(item.imageUrl), sortOrder: batch.sortOrder, consentConfirmed: batch.consentConfirmed,
      isPublished: batch.isPublished, createdById: session.user.id, createdAt: new Date(base + batch.items.length - index),
    })) });
    invalidateTestimonials();
    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    if (error instanceof FeedbackInputError || (error instanceof Error && /không hợp lệ|đồng ý/.test(error.message))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Testimonial create failed:', error);
    return NextResponse.json({ error: 'Không tạo được feedback' }, { status: 500 });
  }
}
