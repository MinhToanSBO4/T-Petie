import { requireAdminPage } from '@/server/auth/staff-session';
import { CommerceManager } from '@/components/admin/CommerceManager';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export default async function CommercePage() {
  await requireAdminPage('/admin/settings');
  const settings = await prisma.commerceSetting.findUnique({ where: { id: 'default' } });
  if (!settings) throw new Error('Chưa có cấu hình bán hàng');
  return <CommerceManager initialSettings={{ shippingFee: Number(settings.shippingFee),
    freeShippingThreshold: Number(settings.freeShippingThreshold) }} />;
}
