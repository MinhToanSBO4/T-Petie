const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('node:crypto');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const cookie = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');

async function main() {
  const csrf = await fetch(new URL('/api/auth/csrf', base));
  const login = await fetch(new URL('/api/auth/callback/credentials', base), {
    method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie(csrf) },
    body: new URLSearchParams({ csrfToken: (await csrf.json()).csrfToken,
      email: process.env.ADMIN_USERNAME, password: process.env.ADMIN_INITIAL_PASSWORD,
      callbackUrl: new URL('/admin', base).toString(), json: 'true' }),
  });
  const sessionCookie = [cookie(csrf), cookie(login)].filter(Boolean).join('; ');
  const suffix = randomBytes(5).toString('hex');
  let id;
  try {
    const created = await fetch(new URL('/api/admin/products', base), {
      method: 'POST', headers: { 'Content-Type': 'application/json', cookie: sessionCookie, origin: base },
      body: JSON.stringify({ name: 'Sản phẩm kiểm thử tạm', sku: `TEST-${suffix}`, slug: `test-${suffix}`, price: 123000, size: 'Size Test', stock: 1 }),
    });
    const result = await created.json();
    if (!created.ok || !result.id) throw new Error(`Admin product create failed: HTTP ${created.status} ${result.error || ''}`);
    id = result.id;
    const catalog = await fetch(new URL('/api/products?limit=48', base));
    const products = (await catalog.json()).products;
    const product = products.find((item) => item.id === id);
    if (!product || product.slug !== `test-${suffix}` || product.id === product.slug) throw new Error('Catalog did not preserve database ID and public slug');
    const page = await fetch(new URL(`/products/${product.slug}`, base));
    if (!page.ok) throw new Error(`Product detail failed: HTTP ${page.status}`);
    const quoted = await fetch(new URL('/api/quote', base), { method: 'POST', headers: { 'Content-Type': 'application/json', origin: base },
      body: JSON.stringify({ items: [{ productId: id, selectedSize: 'Size Test', quantity: 1 }] }) });
    const quote = await quoted.json();
    if (!quoted.ok || quote.subtotal !== 123000) throw new Error(`New product quote failed: ${quote.error || quoted.status}`);
    console.log('New admin-created product appears at slug URL and quotes by database ID');
  } finally {
    if (id) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.product.delete({ where: { id } });
      console.log('Temporary test product removed from database');
    }
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
