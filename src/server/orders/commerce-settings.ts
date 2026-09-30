import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db/client';

export const COMMERCE_TAG = 'commerce';

export type CommerceSettings = { shippingFee: number; freeShippingThreshold: number };

/**
 * Cấu hình bán hàng công khai (phí giao hàng, ngưỡng miễn phí) đọc từ database.
 * Giao diện dùng chung nguồn này để không còn con số viết cứng trong mã nguồn.
 */
export const getCommerceSettings = unstable_cache(async (): Promise<CommerceSettings | null> => {
  const row = await prisma.commerceSetting.findUnique({ where: { id: 'default' } });
  return row ? { shippingFee: Number(row.shippingFee), freeShippingThreshold: Number(row.freeShippingThreshold) } : null;
}, ['commerce-settings'], { revalidate: 300, tags: [COMMERCE_TAG] });
