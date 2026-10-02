'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FilterBar } from '@/components/filter/FilterBar';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import {
  activeFilterCount, catalogFacets, catalogParams, EMPTY_FILTERS, filterCatalog, parseCatalogParams, type CatalogFilters,
} from '@/lib/catalog/filters';
import type { ProductSubcategory } from '@/types/product';

function Browser({ subcategory }: { subcategory?: ProductSubcategory }) {
  const { products, loading, error } = useCatalogProducts();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => parseCatalogParams(searchParams), [searchParams]);
  const base = useMemo(() => products.filter((product) => product.category === 'girls'
    && (!subcategory || product.subcategory === subcategory)), [products, subcategory]);
  const results = useMemo(() => filterCatalog(base, filters), [base, filters]);
  const facets = useMemo(() => catalogFacets(base, filters), [base, filters]);

  // Bộ lọc nằm trên URL: chia sẻ được, F5 hay bấm "Quay lại" vẫn giữ đúng danh sách đang xem.
  const apply = useCallback((next: CatalogFilters) => {
    const query = catalogParams(subcategory ? { ...next, types: [] } : next);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, subcategory]);
  const countFor = useCallback((draft: CatalogFilters) => filterCatalog(base, draft).length, [base]);
  const facetsFor = useCallback((draft: CatalogFilters) => catalogFacets(base, draft), [base]);
  const filtered = activeFilterCount(filters) > 0;

  return <>
    {filters.q && <div className="mb-6">
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-charcoal-900 sm:text-3xl">
        {`Kết quả tìm kiếm cho "${filters.q}"`}
      </h1>
      <p className="max-w-2xl text-xs leading-relaxed text-charcoal-600 sm:text-sm">
        {loading ? 'Đang tìm sản phẩm…' : `Tìm thấy ${results.length} sản phẩm phù hợp với tìm kiếm của bạn.`}
      </p>
    </div>}
    <FilterBar filters={filters} facets={facets} facetsFor={facetsFor} total={loading ? undefined : results.length}
      onChange={apply} countFor={countFor} showTypes={!subcategory} />
    {loading ? <ProductGridSkeleton />
      : error ? <p role="alert" className="py-12 text-center text-red-700">{error}</p>
        : results.length === 0 && (filtered || filters.q) ? <div className="rounded-3xl border border-cream-200 bg-white px-4 py-14 text-center shadow-card">
          <div className="mb-3 text-4xl" aria-hidden>🧸</div>
          <h2 className="mb-1 font-heading text-base font-bold text-charcoal-900">Chưa có mẫu phù hợp</h2>
          <p className="mx-auto mb-4 max-w-sm text-xs text-charcoal-500">
            {filtered ? 'Mẹ thử bỏ bớt bộ lọc, chọn thêm size hoặc nới khoảng giá nhé.' : 'Mẹ thử từ khóa ngắn hơn, ví dụ "váy", "set đồ" hoặc tên bộ sưu tập nhé.'}
          </p>
          {filtered && <button type="button" onClick={() => apply({ ...EMPTY_FILTERS, q: filters.q, sort: filters.sort })}
            className="min-h-11 rounded-full bg-honey-500 px-5 text-xs font-bold text-white shadow-sm hover:bg-honey-600">Xóa tất cả bộ lọc</button>}
        </div>
          : <ProductGrid products={results} />}
  </>;
}

/** Danh sách sản phẩm có tìm kiếm, bộ lọc và sắp xếp; `subcategory` giới hạn trong một loại (trang áo, quần, váy, set đồ). */
export function CatalogBrowser({ subcategory }: { subcategory?: ProductSubcategory }) {
  return <Suspense fallback={<div className="animate-fade-in space-y-6">
    <div className="h-5 w-full rounded-lg shimmer" />
    <ProductGridSkeleton />
  </div>}>
    <Browser subcategory={subcategory} />
  </Suspense>;
}
