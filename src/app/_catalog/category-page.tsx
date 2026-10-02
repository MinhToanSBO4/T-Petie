import type { Metadata } from 'next';
import { CategoryHero } from '@/components/collection/CategoryHero';
import { activeFilterCount, catalogParamsFrom, parseCatalogParams } from '@/lib/catalog/filters';
import { CATEGORY_PAGE_LABELS } from '@/lib/content/site-content';
import type { CatalogScope } from '@/lib/catalog/scope';
import { getCategoryPage } from '@/server/content/site-content';
import { CatalogSection, type SearchParams } from './catalog-section';

type CategoryId = keyof typeof CATEGORY_PAGE_LABELS;

const SCOPES: Record<CategoryId, CatalogScope> = {
  girls: { kind: 'all' },
  tops: { kind: 'type', type: 'ao' },
  bottoms: { kind: 'type', type: 'quan' },
  dresses: { kind: 'type', type: 'vay' },
  sets: { kind: 'type', type: 'set-do' },
};

/**
 * Tiêu đề, mô tả và canonical của trang danh mục. Trang có bộ lọc/từ khóa không cho lập chỉ mục (tránh hàng trăm
 * biến thể URL trùng nội dung), trang 2, 3… vẫn được lập chỉ mục với canonical của chính nó.
 */
export async function categoryMetadata(id: CategoryId, searchParams: SearchParams): Promise<Metadata> {
  const route = CATEGORY_PAGE_LABELS[id];
  const category = await getCategoryPage(id);
  const filters = parseCatalogParams(catalogParamsFrom(searchParams));
  const name = category?.title || route.label;
  const title = filters.page > 1 ? `${name} – trang ${filters.page} | T'Petie` : `${name} | T'Petie`;
  const description = category?.description?.replace(/\s+/g, ' ').trim().slice(0, 160)
    || `${route.label} T'Petie: thiết kế cho bé gái, chất liệu mềm mát, chọn theo size, màu và khoảng giá.`;
  const filtered = activeFilterCount(filters) > 0 || Boolean(filters.q);
  return {
    title, description,
    alternates: { canonical: filters.page > 1 ? `${route.href}?page=${filters.page}` : route.href },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title, description, images: category?.imageUrl ? [category.imageUrl] : undefined },
  };
}

/** Trang danh mục: ảnh chủ đề ở trang đầu khi chưa lọc (lọc/sang trang thì sản phẩm lên ngay đầu), rồi danh sách. */
export async function CategoryCatalogPage({ id, searchParams }: { id: CategoryId; searchParams: SearchParams }) {
  const route = CATEGORY_PAGE_LABELS[id];
  const category = await getCategoryPage(id);
  const filters = parseCatalogParams(catalogParamsFrom(searchParams));
  const browsing = activeFilterCount(filters) > 0 || filters.page > 1;
  const heading = category?.title || route.label;
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
      {/* Có từ khóa tìm kiếm thì danh sách tự hiện tiêu đề "Kết quả tìm kiếm…" làm tiêu đề trang. */}
      {!filters.q && (browsing || !category?.title
        ? <h1 className="mb-4 font-heading text-2xl font-extrabold text-charcoal-900 sm:text-3xl">{heading}</h1>
        : <CategoryHero page={category} />)}
      <CatalogSection scope={SCOPES[id]} searchParams={searchParams} basePath={route.href} />
    </div>
  );
}
