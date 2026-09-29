import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Product } from '../src/types/product';
import type { Collection } from '../src/types/collection';

const prisma = new PrismaClient();
const read = <T>(name: string): T => JSON.parse(readFileSync(join(process.cwd(), 'prisma', 'seed-data', name), 'utf8')) as T;

async function main() {
  const collections = read<Collection[]>('collections.json');
  const products = read<Product[]>('products.json');
  await prisma.category.upsert({
    where: { slug: 'be-gai' },
    update: { name: 'Thời trang bé gái' },
    create: { id: 'be-gai', slug: 'be-gai', name: 'Thời trang bé gái' },
  });

  for (const collection of collections) {
    await prisma.collection.upsert({
      where: { slug: collection.id },
      update: { title: collection.title, subtitle: collection.subtitle, story: collection.story,
        bannerUrl: collection.bannerImage, lookbookUrls: collection.lookbookImages,
        themeColor: collection.themeColor, accentColor: collection.accentColor,
        season: collection.season, badge: collection.badge },
      create: { id: collection.id, slug: collection.id, title: collection.title,
        subtitle: collection.subtitle, story: collection.story, bannerUrl: collection.bannerImage,
        lookbookUrls: collection.lookbookImages, themeColor: collection.themeColor,
        accentColor: collection.accentColor, season: collection.season, badge: collection.badge },
    });
  }

  for (const product of products) {
    const saved = await prisma.product.upsert({
      where: { slug: product.id },
      update: { name: product.name, categoryName: product.categoryName, subcategory: product.subcategory,
        subcategoryName: product.subcategoryName, material: product.material,
        materialFeatures: product.materialFeatures, description: product.description,
        specifications: product.specifications, promotion: product.promotion,
        orderNote: product.orderNote, careInstructions: product.careInstructions,
        origin: product.origin, colorName: product.colorName, colorHex: product.colorHex,
        basePrice: BigInt(product.basePrice), originalPrice: product.originalPrice ? BigInt(product.originalPrice) : null,
        discountPercent: product.discountPercent || 0, saleCampaign: product.saleCampaign,
        isBestSeller: !!product.isBestSeller, isNewArrival: !!product.isNewArrival,
        isSale: !!product.isSale, rating: product.rating, reviewCount: product.reviewCount,
        categoryId: product.category === 'be-gai' ? 'be-gai' : null,
        collectionId: product.collectionId || null },
      create: { id: product.id, slug: product.id, sku: product.sku, name: product.name,
        categoryName: product.categoryName, subcategory: product.subcategory,
        subcategoryName: product.subcategoryName, material: product.material,
        materialFeatures: product.materialFeatures, description: product.description,
        specifications: product.specifications, promotion: product.promotion,
        orderNote: product.orderNote, careInstructions: product.careInstructions,
        origin: product.origin, colorName: product.colorName, colorHex: product.colorHex,
        basePrice: BigInt(product.basePrice), originalPrice: product.originalPrice ? BigInt(product.originalPrice) : null,
        discountPercent: product.discountPercent || 0, saleCampaign: product.saleCampaign,
        isBestSeller: !!product.isBestSeller, isNewArrival: !!product.isNewArrival,
        isSale: !!product.isSale, rating: product.rating, reviewCount: product.reviewCount,
        categoryId: product.category === 'be-gai' ? 'be-gai' : null,
        collectionId: product.collectionId || null },
    });
    for (const [index, url] of product.images.entries()) {
      await prisma.productImage.upsert({
        where: { id: `${saved.id}-image-${index}` },
        update: { url, sortOrder: index, isPrimary: index === 0 },
        create: { id: `${saved.id}-image-${index}`, productId: saved.id, url,
          altText: product.name, sortOrder: index, isPrimary: index === 0 },
      });
    }
    for (const size of product.sizes) {
      await prisma.productVariant.upsert({
        where: { productId_size: { productId: saved.id, size: size.size } },
        update: { price: BigInt(size.price),
          weightRange: size.weightRange, ageRange: size.ageRange },
        create: { productId: saved.id, sku: `${product.sku}-${size.size.replace(/\s+/g, '-')}`,
          size: size.size, price: BigInt(size.price), stock: size.stock,
          weightRange: size.weightRange, ageRange: size.ageRange },
      });
    }
  }
  console.log(`Catalog seeded: ${products.length} products, ${collections.length} collections.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
