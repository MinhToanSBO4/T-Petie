import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { HOME_BLOCK_IDS, orderHomeBlocks, type BlockImage, type HomeBlockId } from '@/lib/content/site-content';
import { getProducts, getCollections } from '@/server/catalog/queries';
import { ProductGrid } from '@/components/product/ProductGrid';
import { LookbookCarousel } from '@/components/collection/LookbookCarousel';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { FeatureCarousel } from '@/components/home/FeatureCarousel';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { getPublishedFeedback } from '@/server/content/testimonials';
import { getSiteContent } from '@/server/content/site-content';
import { HOME_FEEDBACK_LIMIT } from '@/lib/content/testimonial-input';
import { toProductCard, type Product } from '@/types/product';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';

export const revalidate = 60;

export default async function HomePage() {
  const [products, collections, feedback, content] = await Promise.all([
    getProducts(), getCollections(), getPublishedFeedback(), getSiteContent(),
  ]);

  const homepageCollections = collections.filter((collection) => collection.showOnHome);
  const sections = content.home_sections;
  const features = content.home_features;
  const byId = new Map(products.map((product) => [product.id, product]));
  const selectedProducts = (ids: string[] | undefined, fallback: Product[]) => ids?.length
    ? ids.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product))
    : fallback;
  const bestSellers = selectedProducts(sections?.bestSellers.productIds, products.filter((product) => product.isBestSeller)).slice(0, 12).map(toProductCard);
  const flashSaleProducts = selectedProducts(sections?.sale.productIds, products.filter((product) => product.isSale)).slice(0, 12).map(toProductCard);
  const blockImage = (image?: BlockImage) => image?.imageUrl && <img src={cloudinaryImage(image.imageUrl, { width: 1600 })} alt={image.imageAlt || ''}
    className="mb-5 h-40 w-full rounded-3xl object-cover sm:h-56" />;
  const blocks: Record<HomeBlockId, React.ReactNode> = {
    // Điều kiện phải là boolean: biểu thức trả về số 0 (chưa có bộ sưu tập, ảnh hay slide) bị React in ra thành chữ "0".
    hero: (homepageCollections.length > 0 || Boolean(content.home_hero?.imageUrl) || (content.home_hero?.slides.length ?? 0) > 0) && <section className="relative w-full px-4 pt-4 sm:px-6"><div className="mx-auto max-w-6xl"><HeroCarousel collections={homepageCollections} hero={content.home_hero} /></div></section>,
    bestSellers: bestSellers.length > 0 && <section id="best-seller" className="mx-auto w-full max-w-6xl px-4 sm:px-6">{blockImage(sections?.bestSellers)}<div className="mb-6 flex items-center justify-between"><h2 className="font-heading text-lg font-bold text-charcoal-900 sm:text-2xl">{sections?.bestSellers.title}</h2>{sections?.bestSellers.linkLabel && <Link href={sections.bestSellers.linkHref || '/'} className="flex items-center space-x-1 text-xs font-bold text-honey-600 hover:text-honey-700"><span>{sections.bestSellers.linkLabel}</span><ArrowRight className="h-3.5 w-3.5" /></Link>}</div><ProductGrid products={bestSellers} /></section>,
    sale: flashSaleProducts.length > 0 && <section id="flash-sale" className="mx-auto w-full max-w-6xl px-4 sm:px-6">{blockImage(sections?.sale)}<div className="mb-6 flex items-center justify-between"><h2 className="font-heading text-lg font-bold sm:text-2xl">{sections?.sale.title}</h2>{sections?.sale.linkLabel && <Link href={sections.sale.linkHref || '/'} className="text-xs font-bold text-honey-600 hover:text-honey-700">{sections.sale.linkLabel}</Link>}</div><ProductGrid products={flashSaleProducts.slice(0, 8)} /></section>,
    collections: homepageCollections.length > 0 && <section id="collections" className="mx-auto w-full max-w-6xl px-4 sm:px-6">{blockImage(sections?.collections)}<div className="mb-4 flex items-center justify-between"><div>{sections?.collections.eyebrow && <div className="mb-1 flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-honey-600"><Sparkles className="h-3.5 w-3.5" /><span>{sections.collections.eyebrow}</span></div>}<h2 className="font-heading text-lg font-bold text-charcoal-900 sm:text-2xl">{sections?.collections.title}</h2></div>{sections?.collections.linkLabel && <Link href={sections.collections.linkHref || '/'} className="flex items-center space-x-1 text-xs font-bold text-honey-600 hover:text-honey-700"><span>{sections.collections.linkLabel}</span><ArrowRight className="h-3.5 w-3.5" /></Link>}</div><LookbookCarousel collections={homepageCollections} /></section>,
    features: features && features.items.length > 0 && <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6"><FeatureCarousel section={features} /></section>,
    testimonials: <TestimonialsSection feedback={feedback.slice(0, HOME_FEEDBACK_LIMIT)} feedbackTotal={feedback.length} section={content.testimonials_section} />,
  };
  const order = content.home_layout?.order || HOME_BLOCK_IDS;
  return <div className="flex flex-col gap-10 sm:gap-14">{orderHomeBlocks(blocks, order).map((block, index) => <React.Fragment key={order[index]}>{block}</React.Fragment>)}</div>;
}
