import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Heart, Star, ShieldCheck, Flame } from 'lucide-react';
import { getProducts, getCollections } from '@/lib/catalog';
import { ProductGrid } from '@/components/product/ProductGrid';
import { LookbookCarousel } from '@/components/collection/LookbookCarousel';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { FeatureCarousel } from '@/components/home/FeatureCarousel';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [products, collections] = await Promise.all([getProducts(), getCollections()]);

  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 8);
  const newArrivals = products.filter((p) => p.isNewArrival);
  const flashSaleProducts = products.filter((p) => p.isSale);

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* 1. HERO BANNER SECTION */}
      <section className="relative px-4 sm:px-6 pt-4 max-w-6xl mx-auto">
        <HeroCarousel />
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
      <section id="flash-sale" className="px-4 sm:px-6 max-w-6xl mx-auto">
        <Link 
          href="/sale"
          className="block relative w-full rounded-3xl overflow-hidden shadow-soft hover:shadow-md transition-shadow bg-[#f9f0e0]"
          style={{ aspectRatio: '3168 / 1344' }}
          data-track="home-flash-sale-banner"
        >
          <Image
            src="https://i.ibb.co/r2z85170/banner-uu-dai-png.png"
            alt="Ưu đãi độc quyền - Giảm đến 30%"
            fill
            priority
            quality={100}
            sizes="100vw"
            className="object-contain"
          />
        </Link>
      </section>

      {/* 5. BỘ SƯU TẬP LOOKBOOK CAROUSEL (4 BST) */}
      <section id="collections" className="px-4 sm:px-6 max-w-6xl mx-auto">
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

        <LookbookCarousel collections={collections} />
      </section>

      {/* 6. VÌ SAO MẸ YÊU THÍCH T'PETIE */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto pb-10">
        <FeatureCarousel />
      </section>
    </div>
  );
}
