import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from './options';

export async function getStaffSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.status === 'active' && ['admin', 'staff'].includes(session.user.role)
    ? session : null;
}
