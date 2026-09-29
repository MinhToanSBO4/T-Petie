const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const assert = require('node:assert/strict');
loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function main() {
  const [dbProducts, dbCollections, dbUsers, sizeGuide, homeFeatures] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.collection.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.siteContent.findUnique({ where: { key: 'size_guide' }, select: { data: true } }),
    prisma.siteContent.findUnique({ where: { key: 'home_features' }, select: { data: true } }),
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
  const guideResponse = await fetch(new URL('/api/site-content/size-guide', base));
  if (!guideResponse.ok || !sizeGuide) throw new Error('Size guide is missing from DB or API');
  const guide = await guideResponse.json();
  assert.deepEqual(guide, sizeGuide.data, 'Size guide API differs from DB');
  if (!homeFeatures || !Array.isArray(homeFeatures.data) || homeFeatures.data.length === 0) {
    throw new Error('Home features are missing from DB');
  }
  const homeResponse = await fetch(base);
  if (!homeResponse.ok) throw new Error('Homepage did not respond successfully');
  const html = await homeResponse.text();
  const rendered = (feature) => html.includes(feature.title) || html.includes(feature.title.replaceAll('&', '&amp;'));
  if (homeFeatures.data.some((feature) => !rendered(feature))) {
    const missing = homeFeatures.data.filter((feature) => !rendered(feature)).map((feature) => feature.id);
    throw new Error(`Homepage does not render DB feature ids: ${missing.join(', ')}`);
  }
  console.log(`DB/API match: ${dbProducts.length} products, ${dbCollections.length} collections; ${dbUsers} active user records, size guide and ${homeFeatures.data.length} home features`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
