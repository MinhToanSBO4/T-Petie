import { requireAdminPage } from '@/server/auth/staff-session';
import { ReviewManager } from '@/components/admin/ReviewManager';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  await requireAdminPage('/admin/reviews');
  return <ReviewManager />;
}
