import React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Sparkles } from 'lucide-react';
import { getCollections, getProducts } from '@/server/catalog/queries';
import { ProductGrid } from '@/components/product/ProductGrid';

interface PageProps {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function CollectionDetailPage({ params }: PageProps) {
  const [collections, allProducts] = await Promise.all([getCollections(), getProducts()]);

  const collection = collections.find((c) => c.id === params.slug);

  if (!collection) {
    notFound();
  }

  // Lọc các sản phẩm thuộc BST này
  const productsInCollection = allProducts.filter(
    (p) => p.collectionId === collection.id || collection.featuredProductIds?.includes(p.id)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 pb-8 space-y-8">
      <Breadcrumb
        items={[
          { label: 'Bộ Sưu Tập', href: '/bo-suu-tap' },
          { label: collection.title, href: `/bo-suu-tap/${collection.id}` },
        ]}
      />

      {/* Hero Banner BST */}
      <div className="relative rounded-3xl overflow-hidden bg-cream-100 border border-cream-200 shadow-soft">
        {/* Banner image tự động co giãn theo tỷ lệ gốc 100% trên cả Mobile & PC không bị cắt xén */}
        <img
          src={collection.bannerImage}
          alt={collection.title}
          className="w-full h-auto object-contain block"
        />

        {/* Ẩn Text overlay trên banner cho các BST đã có sẵn Typography trong ảnh thiết kế (Học Xinh Kem, Hạ Mật, Trung Thu, Khánh Vy), các BST khác nếu có vẫn hiển thị */}
        {!['hoc-xinh-kem', 'ha-mat', 'trung-thu-kem-com', 'khanh-vy'].includes(collection.id) && (
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent flex items-end p-5 sm:p-8 z-10">
            <div className="max-w-md text-white">
              {collection.season && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-honey-500 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 shadow-sm">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {collection.season}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-heading mb-1.5 leading-tight drop-shadow-sm">
                {collection.title}
              </h1>
              {collection.subtitle && (
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed drop-shadow-sm line-clamp-2">
                  {collection.subtitle}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold font-heading">Sản phẩm {collection.title}</h2>
        <ProductGrid products={productsInCollection} />
      </section>

      {/* Câu Chuyện Cảm Hứng & Lookbook */}
      {(Boolean(collection.story) || (Boolean(collection.lookbookImages) && collection.lookbookImages.length > 0)) && (
        <div className="bg-cream-100/60 rounded-3xl p-6 sm:p-8 border border-cream-200">
          {collection.story && (
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-honey-600 uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-honey-500" />
                <span>Cảm Hứng Thiết Kế</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold font-heading text-charcoal-900 mb-3">
                Câu chuyện đằng sau {collection.title}
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-700 leading-relaxed max-w-3xl">
                {collection.story}
              </p>
            </div>
          )}

          {/* Gallery Lookbook nếu có */}
          {collection.lookbookImages && collection.lookbookImages.length > 0 && (
            <div className={collection.story ? 'mt-6 pt-6 border-t border-cream-200' : ''}>
              <h3 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-3">
                Khoảnh Khắc Lookbook Cùng Bé
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {collection.lookbookImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-cream-200">
                    <Image
                      src={img}
                      alt={`${collection.title} lookbook ${idx + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
