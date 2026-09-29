import 'server-only';
import { randomBytes } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { quoteOrder, type QuoteItem } from './quote-order';

export type CheckoutInput = {
  fullName: string; phone: string; address: string; city: string; district: string; ward?: string;
  note?: string; couponCode?: string; items: QuoteItem[];
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
  const quote = await quoteOrder(input.items, input.couponCode, !!userId);

  const order = await prisma.$transaction(async (tx) => {
    if (quote.coupon) {
      const claimed = await tx.coupon.updateMany({
        where: { code: quote.coupon.code, usedCount: quote.coupon.usedCount, active: true },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error('Mã giảm giá đã thay đổi, vui lòng thử lại');
    }
    for (const item of quote.items) {
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
        subtotal: BigInt(quote.subtotal), shippingFee: BigInt(quote.shippingFee),
        discountAmount: BigInt(quote.discount), totalAmount: BigInt(quote.total),
        couponCode: quote.couponCode,
        items: { create: quote.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: quote.variants.find((variant) => variant.id === item.variantId)!.sku,
          size: item.size,
          quantity: item.quantity,
          unitPrice: BigInt(item.unitPrice),
          totalPrice: BigInt(item.totalPrice),
        })) },
      },
    });
  });
  revalidateTag('products');
  return { orderId: order.orderCode, totalAmount: quote.total };
}
