import { requireAdminPage } from '@/server/auth/staff-session';
import { OrderManager } from '@/components/admin/OrderManager';
import { parseOrdersLink } from '@/lib/orders/status';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({ searchParams }: { searchParams: { tab?: string; order?: string } }) {
  await requireAdminPage('/admin/orders');
  return <div className="space-y-4">
    <h1 className="text-3xl font-bold">Đơn hàng</h1>
    <OrderManager {...parseOrdersLink(searchParams)} />
  </div>;
}
