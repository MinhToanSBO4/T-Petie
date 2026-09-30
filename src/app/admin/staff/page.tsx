import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/options';
import { StaffManager } from '@/components/admin/StaffManager';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active') redirect('/login?callbackUrl=/admin/staff');
  if (session.user.role !== 'admin') redirect('/admin/products');
  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <div><h1 className="text-3xl font-bold font-heading mt-2">Tài khoản nhân viên</h1>
      <p className="text-charcoal-600 text-sm mt-1">Tạo, khóa/mở và đặt lại mật khẩu nhân viên.</p></div>
    <StaffManager />
  </main>;
}
