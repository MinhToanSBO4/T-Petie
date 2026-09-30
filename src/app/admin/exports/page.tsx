import { requireAdminPage } from '@/server/auth/staff-session';
import { ExportManager } from '@/components/admin/ExportManager';

export const dynamic = 'force-dynamic';

export default async function AdminExportsPage() {
  await requireAdminPage('/admin/exports');
  return <ExportManager />;
}
