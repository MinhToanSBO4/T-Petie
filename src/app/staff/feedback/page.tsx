import { requireStaffAreaPage } from '@/server/auth/staff-session';
import { TestimonialManager } from '@/components/admin/TestimonialManager';
import { loadFeedbackProductOptions } from '@/server/content/site-content-editor';

export const dynamic = 'force-dynamic';

export default async function StaffFeedbackPage() {
  await requireStaffAreaPage('/staff/feedback');
  return <TestimonialManager products={await loadFeedbackProductOptions()} />;
}
