import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/server/auth/staff-session';
import { loadAccountProfile } from '@/server/auth/account-profile';
import { AccountSettings } from '@/components/admin/AccountSettings';

export const dynamic = 'force-dynamic';

export default async function AdminAccountPage() {
  const session = await requireAdminPage('/admin/account');
  const profile = await loadAccountProfile(session.user.id);
  if (!profile) notFound();
  return <AccountSettings profile={profile} />;
}
