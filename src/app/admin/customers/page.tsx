import { requireAdminPage } from '@/server/auth/staff-session';
import { CustomerManager } from '@/components/admin/CustomerManager';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  await requireAdminPage('/admin/customers');
  return <CustomerManager />;
}
