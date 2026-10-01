import { NextResponse } from 'next/server';
import { parseTestimonialInput } from '@/lib/content/testimonial-input';
import { getStaffSession } from '@/server/auth/staff-session';
import { FeedbackInputError, resolveFeedbackImages } from '@/server/content/feedback-admin';
import { invalidateTestimonials } from '@/server/content/invalidate';
import { prisma } from '@/server/db/client';

type Context = { params: { id: string } };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 4000) return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
    const data = parseTestimonialInput(JSON.parse(raw));
    const sizes = await resolveFeedbackImages([data.imageUrl], data.productId ? [data.productId] : []);
    const updated = await prisma.customerTestimonial.updateMany({ where: { id: params.id },
      data: { ...data, ...sizes.get(data.imageUrl) } });
    if (!updated.count) return NextResponse.json({ error: 'Không tìm thấy feedback' }, { status: 404 });
    invalidateTestimonials();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    if (error instanceof FeedbackInputError || (error instanceof Error && /không hợp lệ|đồng ý/.test(error.message))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Testimonial update failed:', error);
    return NextResponse.json({ error: 'Không lưu được feedback' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  const deleted = await prisma.customerTestimonial.deleteMany({ where: { id: params.id } });
  if (!deleted.count) return NextResponse.json({ error: 'Không tìm thấy feedback' }, { status: 404 });
  invalidateTestimonials();
  return NextResponse.json({ success: true });
}
