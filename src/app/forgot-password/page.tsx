import type { Metadata } from 'next';
import { EmailAccountForm } from '@/components/auth/EmailAccountForm';
export const metadata: Metadata = { title: 'Quên mật khẩu', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default function Page() { return <EmailAccountForm mode="forgot" />; }
