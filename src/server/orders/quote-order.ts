import 'server-only';
import { prisma } from '@/server/db/client';
import { priceOrder } from '@/lib/orders/pricing';
import { calculateTotals } from '@/lib/orders/commerce-pricing';
import { findRequestedVariant } from '@/lib/orders/variant-match';

export type QuoteItem = { productId: string; selectedSize: string; quantity: number };

export async function quoteOrder(items: QuoteItem[], couponCode: string | undefined, authenticated: boolean) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 30 ||
      items.some((item) => !item || typeof item.productId !== 'string' ||
        typeof item.selectedSize !== 'string' || !Number.isInteger(item.quantity))) {
    throw new Error('Giỏ hàng không hợp lệ');
  }
  const normalizedCode = couponCode?.trim().toUpperCase() || null;
  if (normalizedCode && !/^[A-Z0-9_-]{3,30}$/.test(normalizedCode)) throw new Error('Mã giảm giá không hợp lệ');
  const [settings, coupon, variants] = await Promise.all([
    prisma.commerceSetting.findUnique({ where: { id: 'default' } }),
    normalizedCode ? prisma.coupon.findUnique({ where: { code: normalizedCode } }) : Promise.resolve(null),
    prisma.productVariant.findMany({
      where: { productId: { in: [...new Set(items.map((item) => item.productId))] }, isActive: true, product: { isActive: true } },
      // Chỉ lấy đúng trường cần để tính giá, không kéo theo mô tả/thông số dài của sản phẩm.
      select: { id: true, productId: true, sku: true, size: true, price: true, stock: true, isActive: true,
        product: { select: { name: true, isActive: true } } },
    }),
  ]);
  if (!settings) throw new Error('Chưa cấu hình phí giao hàng');
  if (normalizedCode && !coupon) throw new Error('Mã giảm giá không hợp lệ');
  const requested = items.map((item) => {
    const found = findRequestedVariant(variants, item.productId, item.selectedSize);
    return { variantId: found?.id || '', quantity: item.quantity };
  });
  const priced = priceOrder(requested, variants.map((variant) => ({
    id: variant.id, productId: variant.productId, name: variant.product.name,
    size: variant.size, price: Number(variant.price), stock: variant.stock,
    active: variant.isActive && variant.product.isActive,
  })));
  const totals = calculateTotals(priced.subtotal, {
    shippingFee: Number(settings.shippingFee), freeShippingThreshold: Number(settings.freeShippingThreshold),
  }, coupon && {
    code: coupon.code, type: coupon.type, value: coupon.value,
    minSubtotal: Number(coupon.minSubtotal), active: coupon.active,
    requiresLogin: coupon.requiresLogin, startsAt: coupon.startsAt, expiresAt: coupon.expiresAt,
    usageLimit: coupon.usageLimit, usedCount: coupon.usedCount,
  }, authenticated);
  return { ...totals, freeShippingThreshold: Number(settings.freeShippingThreshold),
    couponCode: normalizedCode, coupon, items: priced.items, variants };
}
