'use client';

import { useCallback, useEffect, useMemo, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FilterBar, type CatalogPreview, type FilterOptions } from '@/components/filter/FilterBar';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Pagination } from '@/components/catalog/Pagination';
import { activeFilterCount, catalogParams, EMPTY_FILTERS, type CatalogFacets, type CatalogFilters } from '@/lib/catalog/filters';
import { defaultSortFor, scopeParam, type CatalogScope } from '@/lib/catalog/scope';
import type { ProductCardData } from '@/types/product';

export type CatalogViewListing = { items: ProductCardData[]; total: number; page: number; pages: number; facets: CatalogFacets };

/**
 * Danh sách sản phẩm có bộ lọc, sắp xếp và phân trang. Máy chủ đã lọc và cắt đúng trang (HTML có sẵn sản phẩm);
 * đổi bộ lọc hay trang chỉ đổi URL, máy chủ dựng lại trang mới trong lúc danh sách cũ mờ đi. Bộ lọc nằm trên URL
 * nên chia sẻ được, F5 hay bấm "Quay lại" vẫn đúng danh sách đang xem.
 * Thanh lọc nằm phía trên lưới sản phẩm: mỗi nhóm lọc mở một dropdown (điện thoại: tấm chọn trượt từ dưới lên).
 */
export function CatalogView({ listing, filters, scope, basePath, emptyText }: {
  listing: CatalogViewListing; filters: CatalogFilters; scope: CatalogScope; basePath: string; emptyText?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const resultsRef = useRef<HTMLDivElement>(null);
  const scrollAfterUpdate = useRef(false);
  const defaultSort = defaultSortFor(scope);
  const scopeKey = scopeParam(scope);
  const current = useMemo(() => ({ ...filters, page: listing.page }), [filters, listing.page]);
  const options: FilterOptions = { showTypes: scope.kind !== 'type', showSale: scope.kind !== 'sale', showCollections: scope.kind !== 'collection' };

  const hrefFor = useCallback((next: CatalogFilters) => {
    const query = catalogParams(next, defaultSort);
    return query ? `${basePath}?${query}` : basePath;
  }, [basePath, defaultSort]);

  /** Đổi bộ lọc/sắp xếp thì về trang 1; `keepPage` khi bấm chuyển trang. */
  const navigate = useCallback((next: CatalogFilters, keepPage = false) => {
    const target = keepPage ? next : { ...next, page: 1 };
    scrollAfterUpdate.current = keepPage;
    startTransition(() => router.push(hrefFor(target), { scroll: false }));
  }, [hrefFor, router]);

  // Sang trang khác: cuộn về đầu danh sách khi trang mới đã hiện (không cuộn khi chỉ đổi bộ lọc).
  useEffect(() => {
    if (!scrollAfterUpdate.current || pending) return;
    scrollAfterUpdate.current = false;
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [listing, pending]);

  const preview = useCallback(async (draft: CatalogFilters, signal: AbortSignal): Promise<CatalogPreview> => {
    const query = catalogParams({ ...draft, page: 1 }, defaultSort);
    const response = await fetch(`/api/products?scope=${encodeURIComponent(scopeKey)}&limit=0&facets=1${query ? `&${query}` : ''}`,
      { signal, cache: 'no-store' });
    if (!response.ok) throw new Error('preview failed');
    const data = await response.json();
    return { total: data.total, facets: data.facets };
  }, [defaultSort, scopeKey]);

  const filtered = activeFilterCount(current) > 0;

  return <div>
    <div ref={resultsRef} className="min-w-0 scroll-mt-28">
      {current.q && <div className="mb-5">
        <h1 className="mb-1 font-heading text-2xl font-extrabold text-charcoal-900 sm:text-3xl">{`Kết quả tìm kiếm cho "${current.q}"`}</h1>
        <p className="text-xs text-charcoal-600 sm:text-sm">Tìm thấy {listing.total} sản phẩm phù hợp.</p>
      </div>}
      <FilterBar filters={current} facets={listing.facets} total={listing.total} options={options} preview={preview}
        onChange={(next) => navigate(next)} />

      <div aria-busy={pending} className={`transition-opacity duration-200 ${pending ? 'pointer-events-none opacity-50' : ''}`}>
        {listing.items.length === 0
          ? <div className="rounded-3xl border border-cream-200 bg-white px-4 py-14 text-center shadow-card">
              <div className="mb-3 text-4xl" aria-hidden>🧸</div>
              <h2 className="mb-1 font-heading text-base font-bold text-charcoal-900">
                {filtered || current.q ? 'Chưa có mẫu phù hợp' : emptyText || 'Chưa có sản phẩm'}
              </h2>
              <p className="mx-auto mb-4 max-w-sm text-xs text-charcoal-500">
                {filtered ? 'Mẹ thử bỏ bớt bộ lọc, chọn thêm size hoặc nới khoảng giá nhé.'
                  : current.q ? 'Mẹ thử từ khóa ngắn hơn, ví dụ "váy", "set đồ" hoặc tên bộ sưu tập nhé.' : 'Shop đang cập nhật mẫu mới, mẹ quay lại sau nhé.'}
              </p>
              {filtered && <button type="button" onClick={() => navigate({ ...EMPTY_FILTERS, q: current.q, sort: current.sort })}
                className="min-h-11 rounded-full bg-honey-500 px-5 text-xs font-bold text-white shadow-sm hover:bg-honey-600">Xóa tất cả bộ lọc</button>}
            </div>
          : <ProductGrid products={listing.items} priorityCount={listing.page === 1 ? 4 : 0} />}
      </div>

      <Pagination page={listing.page} pages={listing.pages} hrefFor={(page) => hrefFor({ ...current, page })}
        onPage={(page) => navigate({ ...current, page }, true)} />
    </div>
  </div>;
}
