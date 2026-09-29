import { redirect } from 'next/navigation';
import { TestimonialManager } from '@/components/admin/TestimonialManager';
import { getStaffSession } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
  if (!(await getStaffSession())) redirect('/dang-nhap?callbackUrl=/admin/feedback');
  const testimonials = await prisma.customerTestimonial.findMany({
    select: { id: true, customerName: true, quote: true, rating: true, location: true,
      sortOrder: true, consentConfirmed: true, isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return <TestimonialManager initialTestimonials={testimonials} />;
}
