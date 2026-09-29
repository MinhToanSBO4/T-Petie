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
  const productSlugs = dbProducts.map((row) => row.slug);
  const apiProductSlugs = products.products.map((row) => row.slug);
  const collectionSlugs = dbCollections.map((row) => row.slug);
  const apiCollectionSlugs = collections.collections.map((row) => row.id);
  if (!equal(productSlugs, apiProductSlugs) || !equal(collectionSlugs, apiCollectionSlugs)) {
    throw new Error(`API catalog differs from active database records: products DB=${productSlugs.length} API=${apiProductSlugs.length}, collections DB=${collectionSlugs.length} API=${apiCollectionSlugs.length}; missing products=${productSlugs.filter((slug) => !apiProductSlugs.includes(slug)).join(',')}; extra products=${apiProductSlugs.filter((slug) => !productSlugs.includes(slug)).join(',')}`);
  }
  console.log(`DB/API match: ${dbProducts.length} products, ${dbCollections.length} collections; ${dbUsers} active user records in DB`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
