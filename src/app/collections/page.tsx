import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCollections, getProducts } from '@/server/catalog/queries';
import { cloudinaryImage, cloudinarySrcSet } from '@/lib/media/cloudinary-url';
import { readableAccent } from '@/lib/content/collection-colors';
import type { Collection } from '@/types/collection';

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Bộ sưu tập | T'Petie",
  description: "Lookbook các bộ sưu tập thời trang bé gái của T'Petie: câu chuyện, chất liệu và những khoảnh khắc của bé qua từng mùa.",
};

/**
 * Trang tổng các bộ sưu tập theo kiểu lookbook tạp chí: mỗi bộ sưu tập là một "chương" với banner nguyên tỉ lệ
 * (banner đã có chữ thiết kế nên không cắt), câu chuyện và vài ảnh lookbook. Sản phẩm nằm trong trang từng bộ sưu tập.
 */
export default async function CollectionsPage() {
  const [collections, products] = await Promise.all([getCollections(), getProducts()]);
  const designCount = (collection: Collection) => products.filter((product) =>
    product.collectionId === collection.id || collection.featuredProductIds.includes(product.id)).length;

  return <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-14">
    <header className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-charcoal-500">Lookbook · {collections.length} bộ sưu tập</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold text-charcoal-900 sm:text-5xl">Bộ sưu tập</h1>
      <p className="mt-4 text-base leading-relaxed text-charcoal-600">
        Mỗi mùa, T&apos;Petie kể một câu chuyện riêng qua chất liệu, màu sắc và những khoảnh khắc của bé.
      </p>
    </header>

    <ol className="mt-12 space-y-20 sm:mt-16 sm:space-y-28">
      {collections.map((collection, index) => <CollectionChapter key={collection.id} collection={collection}
        number={index + 1} designs={designCount(collection)} flip={index % 2 === 1} />)}
    </ol>
  </div>;
}

function CollectionChapter({ collection, number, designs, flip }: {
  collection: Collection; number: number; designs: number; flip: boolean;
}) {
  const href = `/collections/${collection.id}`;
  const looks = collection.lookbookImages.slice(0, 3);
  return <li>
    <article aria-labelledby={`collection-${collection.id}`}>
      <Link href={href} tabIndex={-1} aria-hidden className="group block overflow-hidden rounded-[28px] bg-cream-100">
        <img src={cloudinaryImage(collection.bannerImage, { width: 1600 })}
          srcSet={cloudinarySrcSet(collection.bannerImage, [800, 1200, 1600, 2200])} sizes="(min-width: 1152px) 1152px, 100vw"
          alt="" loading={number === 1 ? 'eager' : 'lazy'}
          className="mx-auto block h-auto max-h-[75vh] w-full object-contain transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.015]" />
      </Link>

      <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-12 md:gap-10">
        {/* Không có ảnh lookbook thì phần chữ chiếm rộng hơn, không để trống nửa trang. */}
        <div className={looks.length === 0 ? 'md:col-span-8' : `md:col-span-5 ${flip ? 'md:order-2 md:col-start-8' : ''}`}>
          <div className="flex items-center gap-4" aria-hidden>
            <span className="font-serif text-4xl lining-nums tabular-nums sm:text-5xl" style={{ color: readableAccent(collection.accentColor) }}>
              {String(number).padStart(2, '0')}
            </span>
            <span className="h-px flex-1 bg-cream-300" />
          </div>
          {collection.season && <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-500">{collection.season}</p>}
          <h2 id={`collection-${collection.id}`} className="mt-2 font-serif text-3xl font-semibold leading-tight text-charcoal-900 sm:text-4xl">
            <Link href={href} className="hover:underline hover:decoration-1 hover:underline-offset-8">{collection.title}</Link>
          </h2>
          {collection.subtitle && <p className="mt-3 text-base leading-relaxed text-charcoal-700">{collection.subtitle}</p>}
          {collection.story && <p className="mt-3 line-clamp-4 text-sm leading-7 text-charcoal-600">{collection.story}</p>}

          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-cream-200 py-4 text-sm">
            <div><dt className="text-xs text-charcoal-500">Thiết kế</dt><dd className="font-semibold text-charcoal-900">{designs}</dd></div>
            {collection.lookbookImages.length > 0 && <div><dt className="text-xs text-charcoal-500">Ảnh lookbook</dt>
              <dd className="font-semibold text-charcoal-900">{collection.lookbookImages.length}</dd></div>}
            {collection.badge && <div><dt className="text-xs text-charcoal-500">Phiên bản</dt><dd className="font-semibold text-charcoal-900">{collection.badge}</dd></div>}
          </dl>

          <Link href={href} data-track={`view-lookbook-${collection.id}`}
            className="group mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-charcoal-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-charcoal-800">
            Xem bộ sưu tập
            <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        {looks.length > 0 && <div className={`md:col-span-7 ${flip ? 'md:order-1 md:col-start-1' : ''}`}>
          <ul className={`grid gap-3 sm:gap-4 ${looks.length === 1 ? 'max-w-[240px] grid-cols-1' : looks.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
            aria-label={`Lookbook ${collection.title}`}>
            {looks.map((url, position) => <li key={url} className={position === 1 && looks.length === 3 ? 'mt-8 sm:mt-12' : ''}>
              <Link href={href} tabIndex={-1} className="group block aspect-[2/3] overflow-hidden rounded-2xl bg-cream-100">
                <img src={cloudinaryImage(url, { width: 480, fill: { height: 720 } })}
                  srcSet={cloudinarySrcSet(url, [320, 480, 720], 2 / 3)} sizes="(min-width: 768px) 22vw, 31vw"
                  alt="" loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]" />
              </Link>
            </li>)}
          </ul>
        </div>}
      </div>
    </article>
  </li>;
}
