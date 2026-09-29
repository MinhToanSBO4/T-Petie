import { NextResponse } from 'next/server';
import { parseTestimonialInput } from '@/lib/content/testimonial-input';
import { getStaffSession } from '@/server/auth/staff-session';
import { invalidateTestimonials } from '@/server/content/invalidate';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const testimonials = await prisma.customerTestimonial.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ testimonials }, { headers: { 'Cache-Control': 'no-store' } });
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
