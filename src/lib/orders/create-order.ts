import 'server-only';
import { randomBytes } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { priceOrder } from './pricing';

type CheckoutItem = { productId: string; selectedSize: string; quantity: number };
export type CheckoutInput = {
  fullName: string; phone: string; address: string; city: string; district: string; ward?: string;
  note?: string; couponCode?: string; items: CheckoutItem[];
};

export async function createOrder(input: CheckoutInput, userId: string | undefined, idempotencyKey: string | null) {
  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.customerPhone !== input.phone || existing.userId !== (userId || null)) {
        throw new Error('Mã yêu cầu đã được sử dụng');
      }
      return { orderId: existing.orderCode, totalAmount: Number(existing.totalAmount) };
    }
  }
  const products = [...new Set(input.items.map((item) => item.productId))];
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: products }, isActive: true, product: { isActive: true } },
    include: { product: true },
  });
  const requested = input.items.map((item) => {
    const size = item.selectedSize.split(' (')[0].trim();
    const found = variants.find((variant) => variant.productId === item.productId && variant.size === size);
    return { variantId: found?.id || '', quantity: item.quantity };
  });
  const priced = priceOrder(requested, variants.map((variant) => ({
    id: variant.id, productId: variant.productId, name: variant.product.name,
    size: variant.size, price: Number(variant.price), stock: variant.stock,
    active: variant.isActive && variant.product.isActive,
  })));
  const shippingFee = priced.subtotal >= 399000 ? 0 : 30000;
  const code = input.couponCode?.trim().toUpperCase();
  let discount = 0;
  if (code === 'TPETIE20') discount = Math.min(20000, priced.subtotal);
  else if (code === 'MEMBERVIP' && userId) discount = Math.round(priced.subtotal * 0.1);
  else if (code) throw new Error('Mã giảm giá không hợp lệ');
  const totalAmount = priced.subtotal + shippingFee - discount;
  if (!Number.isSafeInteger(totalAmount) || totalAmount < 0) throw new Error('Tổng tiền không hợp lệ');

  const order = await prisma.$transaction(async (tx) => {
    for (const item of priced.items) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity }, isActive: true },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) throw new Error('Số lượng vượt quá tồn kho');
    }
    return tx.order.create({
      data: {
        orderCode: `TP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        idempotencyKey,
        userId,
        customerName: input.fullName,
        customerPhone: input.phone,
        shippingAddress: input.address,
        city: input.city,
        district: input.district,
        ward: input.ward || null,
        orderNote: input.note || null,
        subtotal: BigInt(priced.subtotal), shippingFee: BigInt(shippingFee),
        discountAmount: BigInt(discount), totalAmount: BigInt(totalAmount),
        items: { create: priced.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: variants.find((variant) => variant.id === item.variantId)!.sku,
          size: item.size,
          quantity: item.quantity,
          unitPrice: BigInt(item.unitPrice),
          totalPrice: BigInt(item.totalPrice),
        })) },
      },
    });
  });
  revalidateTag('products');
  return { orderId: order.orderCode, totalAmount };
}
