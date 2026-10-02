import 'server-only';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/server/db/client';
import { quoteOrder, type QuoteItem } from './quote-order';
import { DASHBOARD_TAG } from '@/server/admin/dashboard';
import { enqueueOrderEmail, scheduleEmailDispatch } from '@/server/email/outbox';
import { normalizeEmail } from '@/lib/email/config';

export type CheckoutInput = {
  fullName: string; phone: string; address: string; city: string; district: string; ward?: string;
  note?: string; couponCode?: string; source?: string; email?: string; items: QuoteItem[];
};

/** Mã chống trùng đã dùng cho một đơn của người khác/số điện thoại khác: trả 409, không phải lỗi máy chủ. */
export class IdempotencyConflictError extends Error {
  constructor() { super('Yêu cầu đặt hàng này đã được dùng cho một đơn khác. Vui lòng tải lại trang rồi đặt lại.'); }
}

/** Đơn đã tạo với mã chống trùng (khách bấm lại sau khi mất kết nối): trả lại đúng đơn đó thay vì tạo đơn mới. */
async function existingOrder(idempotencyKey: string, phone: string, userId: string | undefined) {
  const existing = await prisma.order.findUnique({ where: { idempotencyKey },
    select: { orderCode: true, totalAmount: true, customerPhone: true, userId: true } });
  if (!existing) return null;
  if (existing.customerPhone !== phone || existing.userId !== (userId || null)) throw new IdempotencyConflictError();
  return { orderId: existing.orderCode, totalAmount: Number(existing.totalAmount) };
}

export async function createOrder(input: CheckoutInput, userId: string | undefined, idempotencyKey: string | null) {
  const customerEmail = input.email?.trim() ? normalizeEmail(input.email) : null;
  if (input.email?.trim() && !customerEmail) throw new Error('Email đặt hàng không hợp lệ');
  if (idempotencyKey) {
    const existing = await existingOrder(idempotencyKey, input.phone, userId);
    if (existing) return existing;
  }
  const quote = await quoteOrder(input.items, input.couponCode, !!userId);
  // Khóa các dòng tồn kho theo cùng một thứ tự ở mọi đơn: hai đơn [A, B] và [B, A] cùng lúc không khóa chéo nhau (deadlock).
  const stockUpdates = [...quote.items].sort((a, b) => a.variantId.localeCompare(b.variantId));
  const skuByVariant = new Map(quote.variants.map((variant) => [variant.id, variant.sku]));

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
    if (quote.coupon) {
      // Giành một lượt dùng mã khi mã còn lượt (không so đúng số lượt đã dùng như trước: hai khách dùng cùng mã một lúc
      // thì một người bị báo "mã đã thay đổi" dù mã vẫn còn lượt).
      const claimed = await tx.coupon.updateMany({
        where: { code: quote.coupon.code, active: true,
          OR: [{ usageLimit: null }, { usedCount: { lt: prisma.coupon.fields.usageLimit } }] },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error('Mã giảm giá đã hết lượt sử dụng hoặc vừa ngừng áp dụng');
    }
    for (const item of stockUpdates) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity }, isActive: true },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) throw new Error(`Sản phẩm "${item.productName}" (${item.size}) vừa hết hoặc không đủ số lượng`);
    }
    const created = await tx.order.create({
      data: {
        orderCode: `TP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        idempotencyKey,
        userId,
        customerName: input.fullName,
        customerPhone: input.phone,
        customerEmail,
        shippingAddress: input.address,
        city: input.city,
        district: input.district,
        ward: input.ward || null,
        orderNote: input.note || null,
        source: input.source || null,
        subtotal: BigInt(quote.subtotal), shippingFee: BigInt(quote.shippingFee),
        discountAmount: BigInt(quote.discount), totalAmount: BigInt(quote.total),
        couponCode: quote.couponCode,
        items: { create: quote.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: skuByVariant.get(item.variantId)!,
          size: item.size,
          quantity: item.quantity,
          unitPrice: BigInt(item.unitPrice),
          totalPrice: BigInt(item.totalPrice),
        })) },
        // Mốc đầu tiên của dòng thời gian đơn hàng mà khách xem ở mục Đơn mua.
        statusEvents: { create: { status: 'PENDING' } },
      },
    });
    await enqueueOrderEmail(tx, created.id, `receipt:${created.id}`, 'receipt', 'PENDING');
    return created;
    });
  } catch (error) {
    // Hai lần gửi cùng mã chống trùng gần như đồng thời: lần sau gặp khóa duy nhất, trả lại đơn của lần trước.
    if (idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await existingOrder(idempotencyKey, input.phone, userId);
      if (existing) return existing;
    }
    throw error;
  }
  revalidateTag('products');
  // Đơn mới làm thay đổi doanh thu, số đơn chờ và tồn kho trên trang Tổng quan.
  revalidateTag(DASHBOARD_TAG);
  scheduleEmailDispatch();
  return { orderId: order.orderCode, totalAmount: quote.total };
}
