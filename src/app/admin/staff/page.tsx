import { requireAdminPage } from '@/server/auth/staff-session';
import { StaffManager } from '@/components/admin/StaffManager';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  await requireAdminPage('/admin/staff');
  return <StaffManager />;
}
