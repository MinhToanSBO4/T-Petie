import { NextResponse } from 'next/server';
import { getStaffSession } from '@/server/auth/staff-session';
import { invalidateTestimonials } from '@/server/content/invalidate';
import { isSameOrigin } from '@/server/security/origin';
import { prisma } from '@/server/db/client';
import { table } from '@/server/db/sql';
import { FEEDBACK_ORDER_MAX, parseFeedbackOrder } from '@/lib/content/testimonial-input';

export const dynamic = 'force-dynamic';

/** Feedback đang công bố theo đúng thứ tự khách nhìn thấy (12 ảnh đầu hiện ở trang chủ). */
export async function GET() {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const items = await prisma.customerTestimonial.findMany({
    where: { isPublished: true, consentConfirmed: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: FEEDBACK_ORDER_MAX,
    select: { id: true, imageUrl: true, caption: true },
  });
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Lưu thứ tự hiển thị: `ids` theo thứ tự mới, ảnh đầu tiên hiện trước. Cập nhật cả danh sách bằng một câu lệnh.
 * Feedback thêm sau này có thứ tự 0 nên hiện trước các ảnh đã sắp xếp (ảnh mới lên đầu), cho tới khi sắp xếp lại.
 */
export async function PUT(request: Request) {
  if (!(await getStaffSession())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ' }, { status: 403 });
  let ids: string[];
  try { ids = parseFeedbackOrder(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Dữ liệu không hợp lệ' }, { status: 400 }); }
  const positions = ids.map((_, index) => index + 1);
  const updated = await prisma.$executeRaw`
    UPDATE ${table('customer_testimonials')} AS feedback
    SET "sortOrder" = data.position, "updatedAt" = ${new Date().toISOString()}::timestamp
    FROM unnest(${ids}::text[], ${positions}::int[]) AS data(id, position)
    WHERE feedback."id" = data.id`;
  invalidateTestimonials();
  return NextResponse.json({ success: true, count: updated });
}
