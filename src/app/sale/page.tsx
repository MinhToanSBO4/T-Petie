import type { Metadata } from 'next';
import Image from 'next/image';
import { CatalogSection, type SearchParams } from '@/app/_catalog/catalog-section';
import { activeFilterCount, catalogParamsFrom, parseCatalogParams } from '@/lib/catalog/filters';
import { defaultSortFor } from '@/lib/catalog/scope';
import { getSiteContent } from '@/server/content/site-content';

type Props = { searchParams: SearchParams };
const SCOPE = { kind: 'sale' } as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const banner = (await getSiteContent()).sale_page;
  const filters = parseCatalogParams(catalogParamsFrom(searchParams), defaultSortFor(SCOPE));
  const name = banner?.title || 'Ưu đãi';
  const title = filters.page > 1 ? `${name} – trang ${filters.page} | T'Petie` : `${name} | T'Petie`;
  const description = banner?.description?.replace(/\s+/g, ' ').trim().slice(0, 160)
    || "Các mẫu đồ bé gái T'Petie đang giảm giá: lọc theo size, loại, màu và khoảng giá.";
  return {
    title, description,
    alternates: { canonical: filters.page > 1 ? `/sale?page=${filters.page}` : '/sale' },
    robots: activeFilterCount(filters) > 0 || filters.q ? { index: false, follow: true } : undefined,
    openGraph: { title, description, images: banner?.bannerUrl ? [banner.bannerUrl] : undefined },
  };
}

/** Trang ưu đãi: banner chương trình ở trang đầu, rồi các mẫu đang giảm giá có bộ lọc, sắp xếp và phân trang. */
export default async function SalePage({ searchParams }: Props) {
  const banner = (await getSiteContent()).sale_page;
  const filters = parseCatalogParams(catalogParamsFrom(searchParams), defaultSortFor(SCOPE));
  const browsing = activeFilterCount(filters) > 0 || filters.page > 1;
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6">
    {!browsing && banner?.bannerUrl && <div className="relative aspect-[3168/1344] overflow-hidden rounded-3xl bg-cream-100">
      <Image src={banner.bannerUrl} alt={banner.bannerAlt || banner.title || 'Ưu đãi T\'Petie'} fill
        sizes="(min-width: 1152px) 1152px, 100vw" className="object-contain" priority />
    </div>}
    {!filters.q && <div>
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">{banner?.title || 'Ưu đãi đang diễn ra'}</h1>
      {!browsing && banner?.description && <p className="mt-2 text-sm text-charcoal-500">{banner.description}</p>}
    </div>}
    <CatalogSection scope={SCOPE} searchParams={searchParams} basePath="/sale"
      emptyText="Chưa có chương trình ưu đãi đang áp dụng" />
  </div>;
}
