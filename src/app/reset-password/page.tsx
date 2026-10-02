import type { Metadata } from 'next';
import { EmailAccountForm } from '@/components/auth/EmailAccountForm';
export const metadata: Metadata = { title: 'Đặt lại mật khẩu', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default function Page({ searchParams }: { searchParams: { token?: string } }) { return <EmailAccountForm mode="reset" token={searchParams.token} />; }
