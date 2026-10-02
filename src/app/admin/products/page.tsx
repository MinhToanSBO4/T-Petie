import { requireAdminPage } from '@/server/auth/staff-session';
import { ProductManager } from '@/components/admin/ProductManager';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  await requireAdminPage('/admin/products');
  return <ProductManager canCreateProduct />;
}
