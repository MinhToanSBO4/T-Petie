import { requireStaffAreaPage } from '@/server/auth/staff-session';
import { ReviewManager } from '@/components/admin/ReviewManager';

export const dynamic = 'force-dynamic';

export default async function StaffReviewsPage() {
  await requireStaffAreaPage('/staff/reviews');
  return <ReviewManager />;
}
