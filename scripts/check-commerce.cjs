const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const cookie = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');

async function main() {
  const productsResponse = await fetch(new URL('/api/products?limit=48', base));
  const products = (await productsResponse.json()).products;
  const product = products.find((row) => row.sizes?.some((size) => size.stock > 0));
  if (!product) throw new Error('No product with stock for quote check');
  const size = product.sizes.find((entry) => entry.stock > 0);
  const item = { productId: product.id, selectedSize: size.size, quantity: 1 };
  const post = (couponCode) => fetch(new URL('/api/quote', base), { method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: base }, body: JSON.stringify({ items: [item], couponCode }) });
  const [settings, coupon] = await Promise.all([
    prisma.commerceSetting.findUnique({ where: { id: 'default' } }),
    prisma.coupon.findUnique({ where: { code: 'TPETIE20' } }),
  ]);
  const normal = await post(undefined);
  const quote = await normal.json();
  if (!normal.ok) {
    const row = await prisma.product.findUnique({ where: { id: product.id }, include: { variants: { select: { size: true, stock: true } } } });
    throw new Error(`Quote failed: ${quote.error || normal.status}; productId=${product.id}, slug=${product.slug}, size=${size.size}, DB match=${!!row}, DB sizes=${row?.variants.map((entry) => entry.size).join(',') || ''}`);
  }
  const expectedShipping = size.price >= Number(settings.freeShippingThreshold) ? 0 : Number(settings.shippingFee);
  if (quote.subtotal !== size.price || quote.shippingFee !== expectedShipping || quote.total !== size.price + expectedShipping) throw new Error('Quote does not match DB price and policy');
  const discounted = await post(coupon.code);
  const result = await discounted.json();
  if (!discounted.ok || result.discountAmount !== Math.min(coupon.value, size.price)) throw new Error(`Coupon quote mismatch: ${result.error || discounted.status}`);
  const invalid = await post('UNKNOWN_CODE');
  if (invalid.status !== 400) throw new Error('Unknown coupon was accepted');
  const anonymous = await fetch(new URL('/api/admin/commerce', base));
  if (anonymous.status !== 403) throw new Error('Anonymous commerce access was allowed');
  const csrf = await fetch(new URL('/api/auth/csrf', base));
  const login = await fetch(new URL('/api/auth/callback/credentials', base), { method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie(csrf) },
    body: new URLSearchParams({ csrfToken: (await csrf.json()).csrfToken, email: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_INITIAL_PASSWORD, callbackUrl: new URL('/admin', base).toString(), json: 'true' }) });
  const sessionCookie = [cookie(csrf), cookie(login)].filter(Boolean).join('; ');
  const admin = await fetch(new URL('/api/admin/commerce', base), { headers: { cookie: sessionCookie } });
  const config = await admin.json();
  if (!admin.ok || !config.settings || !config.coupons?.length) throw new Error('Admin commerce settings unavailable');
  const save = await fetch(new URL('/api/admin/commerce', base), { method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: sessionCookie, origin: base },
    body: JSON.stringify({ kind: 'settings', ...config.settings }) });
  if (!save.ok) throw new Error(`Admin settings save failed: HTTP ${save.status}`);
  const bad = await fetch(new URL('/api/admin/commerce', base), { method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: sessionCookie, origin: base },
    body: JSON.stringify({ kind: 'coupon', code: 'BADPERCENT', type: 'PERCENT', value: 120,
      minSubtotal: 0, active: true, requiresLogin: false }) });
  if (bad.status !== 400) throw new Error('Invalid admin coupon was accepted');
  console.log(`Commerce quote matches DB: product ${product.sku}, shipping ${quote.shippingFee}, coupon discount ${result.discountAmount}; invalid coupon rejected`);
  console.log('Admin commerce settings read/write and invalid input checks passed');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
