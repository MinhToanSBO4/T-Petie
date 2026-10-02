import { requireAdminPage } from '@/server/auth/staff-session';
import { CommerceManager } from '@/components/admin/CommerceManager';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export default async function CommercePage() {
  await requireAdminPage('/admin/settings');
  const settings = await prisma.commerceSetting.findUnique({ where: { id: 'default' } });
  // Database mới chưa có cấu hình: hiện form trống để admin nhập lần đầu.
  return <CommerceManager initialSettings={settings && { shippingFee: Number(settings.shippingFee),
    freeShippingThreshold: Number(settings.freeShippingThreshold) }} />;
}
