import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';
import { CustomerManager } from '@/components/admin/CustomerManager';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin' || session.user.status !== 'active') redirect('/login?callbackUrl=/admin/customers');
  const customers = await prisma.user.findMany({
    where: { role: 'user', deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { id: true, name: true, email: true, username: true, phone: true, city: true,
      status: true, points: true, createdAt: true, lastLoginAt: true },
  });
  return <CustomerManager initialCustomers={customers.map((customer) => ({
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    lastLoginAt: customer.lastLoginAt?.toISOString() ?? null,
  }))} />;
}
