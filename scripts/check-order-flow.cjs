const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const { randomUUID, randomInt } = require('node:crypto');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const cookie = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');

async function adminCookie() {
  const csrf = await fetch(new URL('/api/auth/csrf', base));
  const login = await fetch(new URL('/api/auth/callback/credentials', base), { method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie(csrf) },
    body: new URLSearchParams({ csrfToken: (await csrf.json()).csrfToken, email: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_INITIAL_PASSWORD, callbackUrl: new URL('/admin', base).toString(), json: 'true' }) });
  return [cookie(csrf), cookie(login)].filter(Boolean).join('; ');
}

async function main() {
  const variant = await prisma.productVariant.findFirst({ where: { stock: { gte: 1 }, isActive: true, product: { isActive: true } }, include: { product: true } });
  if (!variant) throw new Error('No active variant in stock');
  const couponBefore = await prisma.coupon.findUnique({ where: { code: 'TPETIE20' } });
  const phone = `09${String(randomInt(0, 100000000)).padStart(8, '0')}`;
  const key = randomUUID();
  let orderId;
  try {
    const input = { fullName: 'Kiểm thử tự động', phone, address: 'Địa chỉ kiểm thử', city: 'Hà Nội', district: 'Cầu Giấy',
      couponCode: 'TPETIE20', items: [{ productId: variant.productId, selectedSize: variant.size, quantity: 1 }] };
    const request = () => fetch(new URL('/api/checkout', base), { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, origin: base }, body: JSON.stringify(input) });
    const created = await request();
    const result = await created.json();
    if (created.status !== 201 || !result.orderId) throw new Error(`Checkout failed: HTTP ${created.status} ${result.message || ''}`);
    orderId = result.orderId;
    const retried = await request();
    const retryResult = await retried.json();
    if (retried.status !== 201 || retryResult.orderId !== orderId) throw new Error('Idempotent retry created a different order');
    const stored = await prisma.order.findUnique({ where: { orderCode: orderId }, include: { items: true } });
    const stockAfter = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    const couponAfter = await prisma.coupon.findUnique({ where: { code: 'TPETIE20' } });
    if (!stored || stored.items.length !== 1 || stored.couponCode !== 'TPETIE20' ||
        Number(stored.totalAmount) !== result.totalAmount || stockAfter.stock !== variant.stock - 1 ||
        couponAfter.usedCount !== couponBefore.usedCount + 1) throw new Error('Order, stock, or coupon usage was not persisted correctly');
    const cancel = await fetch(new URL(`/api/admin/orders/${orderId}`, base), { method: 'PATCH',
      headers: { 'Content-Type': 'application/json', cookie: await adminCookie(), origin: base }, body: JSON.stringify({ status: 'CANCELLED' }) });
    if (!cancel.ok) throw new Error(`Admin cancel failed: HTTP ${cancel.status} ${(await cancel.json()).error || ''}`);
    const restored = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    const couponRestored = await prisma.coupon.findUnique({ where: { code: 'TPETIE20' } });
    if (restored.stock !== variant.stock || couponRestored.usedCount !== couponBefore.usedCount) throw new Error('Cancel did not restore stock and coupon usage');
    console.log('COD checkout, idempotent retry, DB order, stock/coupon debit, admin cancellation, and restoration passed');
  } finally {
    if (orderId) {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { orderCode: orderId }, include: { items: true } });
        if (!order) return;
        if (order.orderStatus !== 'CANCELLED') {
          for (const item of order.items) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
          if (order.couponCode) await tx.coupon.update({ where: { code: order.couponCode }, data: { usedCount: { decrement: 1 } } });
        }
        await tx.orderItem.deleteMany({ where: { orderId: order.id } });
        await tx.order.delete({ where: { id: order.id } });
      });
      console.log('Temporary test order removed from database');
    }
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
