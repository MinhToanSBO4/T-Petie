import { requireStaffPage } from '@/server/auth/staff-session';
import { ReviewManager } from '@/components/admin/ReviewManager';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  await requireStaffPage('/admin/reviews');
  return <ReviewManager />;
}
