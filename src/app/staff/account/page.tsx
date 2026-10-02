import { notFound } from 'next/navigation';
import { requireStaffAreaPage } from '@/server/auth/staff-session';
import { loadAccountProfile } from '@/server/auth/account-profile';
import { AccountSettings } from '@/components/admin/AccountSettings';

export const dynamic = 'force-dynamic';

export default async function StaffAccountPage() {
  const session = await requireStaffAreaPage('/staff/account');
  const profile = await loadAccountProfile(session.user.id);
  if (!profile) notFound();
  return <AccountSettings profile={profile} />;
}
