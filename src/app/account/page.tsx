import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/options';

export default async function AccountEntryPage() {
  const session = await getServerSession(authOptions);
  redirect(session?.user?.status === 'active' ? '/dashboard' : '/login');
}
