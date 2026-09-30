import { NextResponse } from 'next/server';
import { parseTestimonialInput } from '@/lib/content/testimonial-input';
import { paginated, parsePagination, parseSearch } from '@/lib/pagination';
import { getStaffSession } from '@/server/auth/staff-session';
import { invalidateTestimonials } from '@/server/content/invalidate';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const { page, limit, skip, take } = parsePagination(searchParams, 10, 50);
  const search = parseSearch(searchParams);
  const status = searchParams.get('filter') || '';
  const where = {
    ...(search ? { OR: [{ customerName: { contains: search, mode: 'insensitive' as const } },
      { quote: { contains: search, mode: 'insensitive' as const } },
      { location: { contains: search, mode: 'insensitive' as const } }] } : {}),
    ...(status === 'published' ? { isPublished: true, consentConfirmed: true }
      : status === 'draft' ? { OR: [{ isPublished: false }, { consentConfirmed: false }] } : {}),
  };
  const [testimonials, total] = await Promise.all([
    prisma.customerTestimonial.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], skip, take }),
    prisma.customerTestimonial.count({ where }),
  ]);
  return NextResponse.json({ ...paginated(testimonials, total, page, limit) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 4000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
    const data = parseTestimonialInput(JSON.parse(raw));
    const created = await prisma.customerTestimonial.create({ data: { ...data, createdById: session.user.id } });
    invalidateTestimonials();
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    if (error instanceof Error && /không hợp lệ|đồng ý/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Testimonial create failed:', error);
    return NextResponse.json({ error: 'Không tạo được feedback' }, { status: 500 });
  }
}
