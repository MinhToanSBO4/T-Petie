import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/options';
import { ExportManager } from '@/components/admin/ExportManager';

export const dynamic = 'force-dynamic';

export default async function AdminExportsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin' || session.user.status !== 'active') redirect('/login?callbackUrl=/admin/exports');
  return <ExportManager />;
}
