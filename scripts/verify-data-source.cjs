const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function main() {
  const [dbProducts, dbCollections, dbUsers] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.collection.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.user.count({ where: { deletedAt: null } }),
  ]);
  const [productsResponse, collectionsResponse] = await Promise.all([
    fetch(new URL('/api/products?limit=48', base)),
    fetch(new URL('/api/collections', base)),
  ]);
  if (!productsResponse.ok || !collectionsResponse.ok) throw new Error('Catalog API did not respond successfully');
  const products = await productsResponse.json();
  const collections = await collectionsResponse.json();
  const equal = (left, right) => JSON.stringify(left.sort()) === JSON.stringify(right.sort());
  if (!equal(dbProducts.map((row) => row.slug), products.products.map((row) => row.id)) ||
      !equal(dbCollections.map((row) => row.slug), collections.collections.map((row) => row.id))) {
    throw new Error('API catalog differs from active database records');
  }
  console.log(`DB/API match: ${dbProducts.length} products, ${dbCollections.length} collections; ${dbUsers} active user records in DB`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
