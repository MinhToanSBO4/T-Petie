import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Heart, Star, ShieldCheck, Flame } from 'lucide-react';
import { getProducts, getCollections } from '@/server/catalog/queries';
import { ProductGrid } from '@/components/product/ProductGrid';
import { LookbookCarousel } from '@/components/collection/LookbookCarousel';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { FeatureCarousel } from '@/components/home/FeatureCarousel';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { getPublishedTestimonials } from '@/server/content/testimonials';
import { getHomeFeatures } from '@/server/content/site-content';

export const revalidate = 60;

export default async function HomePage() {
  const [products, collections, testimonials, homeFeatures] = await Promise.all([
    getProducts(), getCollections(), getPublishedTestimonials(), getHomeFeatures(),
  ]);

  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 8);
  const newArrivals = products.filter((p) => p.isNewArrival);
  const flashSaleProducts = products.filter((p) => p.isSale);
  const homepageCollections = collections.filter((collection) => collection.showOnHome);

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* 1. HERO BANNER SECTION */}
      <section className="relative px-4 sm:px-6 pt-4 max-w-6xl mx-auto">
        {homepageCollections.length > 0 && <HeroCarousel collections={homepageCollections} />}
      </section>



      {/* 3. BEST SELLERS GRID */}
      <section id="best-seller" className="px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold font-heading text-charcoal-900">
              Sản Phẩm Bán Chạy Nhất
            </h2>
          </div>
          <Link
            href="/be-gai"
            className="text-xs font-bold text-honey-600 hover:text-honey-700 flex items-center space-x-1"
          >
            <span>Khám phá thêm</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ProductGrid products={bestSellers} />
      </section>

      {/* 4. FLASH SALE BANNER SECTION */}
      {flashSaleProducts.length > 0 && <section id="flash-sale" className="px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between"><h2 className="font-heading text-lg font-bold sm:text-2xl">Sản phẩm đang ưu đãi</h2>
          <Link href="/sale" className="text-xs font-bold text-honey-600">Xem tất cả →</Link></div>
        <ProductGrid products={flashSaleProducts.slice(0, 8)} />
      </section>}

      {/* 5. BỘ SƯU TẬP LOOKBOOK CAROUSEL (4 BST) */}
      {homepageCollections.length > 0 && <section id="collections" className="px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-honey-600 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chuyện Của Mùa</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold font-heading text-charcoal-900">
              Bộ Sưu Tập Nổi Bật
            </h2>
          </div>
          <Link
            href="/bo-suu-tap"
            className="text-xs font-bold text-honey-600 hover:text-honey-700 flex items-center space-x-1"
          >
            <span>Xem Lookbook</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <LookbookCarousel collections={homepageCollections} />
      </section>}

      {/* 6. VÌ SAO MẸ YÊU THÍCH T'PETIE */}
      {homeFeatures.length > 0 && <section className="px-4 sm:px-6 max-w-6xl mx-auto pb-10">
        <FeatureCarousel features={homeFeatures} />
      </section>}
      <TestimonialsSection testimonials={testimonials} />
    </div>
  );
}
