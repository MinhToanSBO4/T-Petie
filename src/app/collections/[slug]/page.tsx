import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDown, ArrowLeft } from 'lucide-react';
import { getCollections } from '@/server/catalog/queries';
import { CatalogSection, type SearchParams } from '@/app/_catalog/catalog-section';
import { LookbookGallery } from '@/components/collection/LookbookGallery';
import { cloudinaryImage, cloudinarySrcSet } from '@/lib/media/cloudinary-url';

interface PageProps {
  params: {
    slug: string;
  };
  searchParams: SearchParams;
}


export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const collection = (await getCollections()).find((item) => item.id === params.slug);
  if (!collection) return {};
  const description = (collection.subtitle || collection.story).replace(/\s+/g, ' ').trim().slice(0, 160) || undefined;
  const title = `${collection.title} | Bộ sưu tập T'Petie`;
  return { title, description,
    openGraph: { title, description, type: 'website', images: collection.bannerImage ? [collection.bannerImage] : undefined } };
}

/**
 * Trang một bộ sưu tập: banner nguyên tỉ lệ, câu chuyện, lookbook rồi mới tới các thiết kế,
 * để bộ sưu tập được kể như một câu chuyện thay vì chỉ là một danh sách sản phẩm.
 */
export default async function CollectionDetailPage({ params, searchParams }: PageProps) {
  const collections = await getCollections();
  const collection = collections.find((c) => c.id === params.slug);
  if (!collection) notFound();

  const others = collections.filter((item) => item.id !== collection.id).slice(0, 3);
  // Số thiết kế lấy từ danh sách mã sản phẩm của bộ sưu tập (đã cache); danh sách thẻ do CatalogSection tải theo trang.
  const productsInCollection = collection.featuredProductIds;

  return <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
    <Link href="/collections" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-charcoal-600 hover:text-charcoal-900">
      <ArrowLeft className="h-4 w-4" aria-hidden />Tất cả bộ sưu tập
    </Link>

    <div className="mt-3 overflow-hidden rounded-[28px] bg-cream-100">
      {/* Banner đã có chữ thiết kế trong ảnh nên giữ nguyên tỉ lệ, không cắt và không phủ chữ lên. */}
      <img src={cloudinaryImage(collection.bannerImage, { width: 1600 })}
        srcSet={cloudinarySrcSet(collection.bannerImage, [800, 1200, 1600, 2200])} sizes="(min-width: 1152px) 1152px, 100vw"
        alt={collection.title} fetchPriority="high" className="mx-auto block h-auto max-h-[75vh] w-full object-contain" />
    </div>

    <section className="mt-10 grid gap-8 md:mt-14 md:grid-cols-12 md:gap-10" aria-labelledby="collection-title">
      <div className="md:col-span-5">
        {collection.season && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-500">{collection.season}</p>}
        <h1 id="collection-title" className="mt-2 font-serif text-4xl font-semibold leading-tight text-charcoal-900 sm:text-5xl">{collection.title}</h1>
        {collection.subtitle && <p className="mt-4 text-base leading-relaxed text-charcoal-700">{collection.subtitle}</p>}
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-cream-200 py-4 text-sm">
          <div><dt className="text-xs text-charcoal-500">Thiết kế</dt><dd className="font-semibold text-charcoal-900">{productsInCollection.length}</dd></div>
          {collection.lookbookImages.length > 0 && <div><dt className="text-xs text-charcoal-500">Ảnh lookbook</dt>
            <dd className="font-semibold text-charcoal-900">{collection.lookbookImages.length}</dd></div>}
          {collection.badge && <div><dt className="text-xs text-charcoal-500">Phiên bản</dt><dd className="font-semibold text-charcoal-900">{collection.badge}</dd></div>}
        </dl>
        {productsInCollection.length > 0 && <a href="#thiet-ke"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-charcoal-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-charcoal-800">
          Xem {productsInCollection.length} thiết kế<ArrowDown className="h-4 w-4" aria-hidden />
        </a>}
      </div>
      {collection.story && <div className="md:col-span-6 md:col-start-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-500">Câu chuyện</p>
        <p className="mt-3 whitespace-pre-line text-base leading-8 text-charcoal-700">{collection.story}</p>
      </div>}
    </section>

    {collection.lookbookImages.length > 0 && <section className="mt-16 sm:mt-20" aria-labelledby="lookbook-title">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-cream-200 pb-4">
        <h2 id="lookbook-title" className="font-serif text-2xl font-semibold text-charcoal-900 sm:text-3xl">Lookbook</h2>
        <p className="text-sm text-charcoal-500">Bấm vào ảnh để xem lớn</p>
      </div>
      <LookbookGallery images={collection.lookbookImages} title={collection.title} />
    </section>}

    <section id="thiet-ke" className="mt-16 scroll-mt-24 sm:mt-20" aria-labelledby="designs-title">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-cream-200 pb-4">
        <h2 id="designs-title" className="font-serif text-2xl font-semibold text-charcoal-900 sm:text-3xl">Các thiết kế trong bộ sưu tập</h2>
        <p className="text-sm text-charcoal-500">{productsInCollection.length} sản phẩm</p>
      </div>
      {productsInCollection.length > 0
        ? <CatalogSection scope={{ kind: 'collection', slug: collection.id }} searchParams={searchParams}
            basePath={`/collections/${collection.id}`} layout="compact" />
        : <p className="rounded-2xl border border-dashed border-cream-300 p-8 text-center text-sm text-charcoal-600">Các thiết kế của bộ sưu tập sẽ sớm được ra mắt.</p>}
    </section>

    {others.length > 0 && <section className="mt-20 border-t border-cream-200 pt-12" aria-labelledby="other-collections-title">
      <h2 id="other-collections-title" className="font-serif text-2xl font-semibold text-charcoal-900">Bộ sưu tập khác</h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-3">
        {others.map((item) => <li key={item.id}>
          <Link href={`/collections/${item.id}`} className="group block">
            <span className="block overflow-hidden rounded-2xl bg-cream-100">
              <img src={cloudinaryImage(item.bannerImage, { width: 720 })} srcSet={cloudinarySrcSet(item.bannerImage, [480, 720, 1080])}
                sizes="(min-width: 640px) 33vw, 100vw" alt="" loading="lazy"
                className="block aspect-[2.6/1] w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03]" />
            </span>
            {item.season && <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.16em] text-charcoal-500">{item.season}</span>}
            <span className="mt-1 block font-serif text-xl font-semibold text-charcoal-900 group-hover:underline group-hover:underline-offset-4">{item.title}</span>
          </Link>
        </li>)}
      </ul>
    </section>}
  </div>;
}
