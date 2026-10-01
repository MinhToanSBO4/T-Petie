import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/options';
import { safeCallbackPath } from '@/lib/auth-identity';

/** Lối vào tài khoản: đã đăng nhập về trang tài khoản, chưa đăng nhập thì đăng nhập rồi quay lại trang đang mở dở. */
export default async function AccountEntryPage({ searchParams }: { searchParams: { returnUrl?: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.status === 'active') redirect('/dashboard');
  const returnUrl = safeCallbackPath(searchParams.returnUrl);
  redirect(returnUrl ? `/login?callbackUrl=${encodeURIComponent(returnUrl)}` : '/login');
}
