import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ProductManager } from '@/components/admin/ProductManager';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active' || !['admin', 'staff'].includes(session.user.role)) {
    redirect('/dang-nhap?callbackUrl=/admin/san-pham');
  }
  return <ProductManager canCreateProduct={session.user.role === 'admin'} />;
}
