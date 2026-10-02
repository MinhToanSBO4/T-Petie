import type { Metadata } from 'next';
import { EmailAccountForm } from '@/components/auth/EmailAccountForm';
export const metadata: Metadata = { title: 'Xác thực email', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default function Page({ searchParams }: { searchParams: { token?: string; email?: string; sent?: string } }) {
  return <EmailAccountForm mode="verify" token={searchParams.token} initialEmail={searchParams.email} sent={searchParams.sent} />;
}
