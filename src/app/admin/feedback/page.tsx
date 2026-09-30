import { requireStaffPage } from '@/server/auth/staff-session';
import { TestimonialManager } from '@/components/admin/TestimonialManager';

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
  await requireStaffPage('/admin/feedback');
  return <TestimonialManager />;
}
