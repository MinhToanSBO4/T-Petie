import { requireStaffPage } from '@/server/auth/staff-session';
import { CollectionManager } from '@/components/admin/CollectionManager';

export const dynamic = 'force-dynamic';

export default async function AdminCollectionsPage() {
  await requireStaffPage('/admin/collections');
  return <CollectionManager />;
}
