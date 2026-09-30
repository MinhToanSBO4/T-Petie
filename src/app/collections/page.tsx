import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Sparkles, ArrowRight } from 'lucide-react';
import { getCollections, getProducts } from '@/server/catalog/queries';
import { ProductGrid } from '@/components/product/ProductGrid';

export const revalidate = 60;

export default async function CollectionsPage() {
  const [collections, products] = await Promise.all([getCollections(), getProducts()]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 pb-8 space-y-8">
      <Breadcrumb items={[{ label: 'Bộ Sưu Tập Lookbook', href: '/collections' }]} />

      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto py-6">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-honey-100 text-honey-700 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-honey-500" />
          <span>Lookbook &amp; Storytelling</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-charcoal-900 mb-3">
          Bộ Sưu Tập T&apos;Petie
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
          Mỗi bộ sưu tập là một câu chuyện cảm hứng riêng, nâng niu trọn vẹn những khoảnh khắc ngọt ngào và đáng nhớ nhất trong tuổi thơ của bé.
        </p>
      </div>

      <section aria-label="Sản phẩm trong bộ sưu tập" className="space-y-4">
        <h2 className="text-xl font-bold font-heading text-charcoal-900">Sản phẩm trong bộ sưu tập</h2>
        <ProductGrid products={products.filter((product) => !!product.collectionId)} />
      </section>

      {/* Grid 4 Bộ Sưu Tập */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {collections.map((col) => (
          <div
            key={col.id}
            className="group bg-white rounded-3xl overflow-hidden border border-cream-200 shadow-card hover:shadow-soft transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Banner Cover */}
              <div className="relative w-full aspect-[16/9] bg-cream-100 overflow-hidden">
                <Image
                  src={col.bannerImage}
                  alt={col.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                {col.badge && (
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-charcoal-900 text-xs font-bold shadow-sm">
                      {col.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Thông tin */}
              <div className="p-5 sm:p-6 space-y-2">
                {col.season && (
                  <span className="text-xs font-bold text-honey-600 uppercase tracking-wider block">
                    {col.season}
                  </span>
                )}
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-charcoal-900 group-hover:text-honey-600 transition-colors">
                  {col.title}
                </h2>
                {col.story && (
                  <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                    {col.story}
                  </p>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <div className="p-5 sm:p-6 pt-0">
              <Link
                href={`/collections/${col.id}`}
                data-track={`view-lookbook-${col.id}`}
                className="w-full py-3 rounded-full bg-cream-100 group-hover:bg-honey-500 group-hover:text-white text-charcoal-900 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-2xs"
              >
                <span>Xem Chi Tiết BST &amp; Sản Phẩm</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
