import { requireStaffAreaPage } from '@/server/auth/staff-session';
import { CollectionManager } from '@/components/admin/CollectionManager';

export const dynamic = 'force-dynamic';

export default async function StaffCollectionsPage() {
  await requireStaffAreaPage('/staff/collections');
  return <CollectionManager />;
}
