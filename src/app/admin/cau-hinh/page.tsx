import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';
import { CommerceManager } from '@/components/admin/CommerceManager';

export const dynamic = 'force-dynamic';

export default async function CommercePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin' || session.user.status !== 'active') redirect('/dang-nhap?callbackUrl=/admin/cau-hinh');
  const [settings, coupons] = await Promise.all([
    prisma.commerceSetting.findUnique({ where: { id: 'default' } }),
    prisma.coupon.findMany({ orderBy: { code: 'asc' } }),
  ]);
  if (!settings) throw new Error('Chưa có cấu hình bán hàng');
  return <CommerceManager initialSettings={{ shippingFee: Number(settings.shippingFee), freeShippingThreshold: Number(settings.freeShippingThreshold) }}
    initialCoupons={coupons.map((coupon) => ({ code: coupon.code, type: coupon.type, value: coupon.value,
      minSubtotal: Number(coupon.minSubtotal), active: coupon.active, requiresLogin: coupon.requiresLogin,
      usedCount: coupon.usedCount, usageLimit: coupon.usageLimit }))} />;
}
