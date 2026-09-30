import { requireStaffPage } from '@/server/auth/staff-session';
import { ProductManager } from '@/components/admin/ProductManager';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const session = await requireStaffPage('/admin/products');
  return <ProductManager canCreateProduct={session.user.role === 'admin'} />;
}
