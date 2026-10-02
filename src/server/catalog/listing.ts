import 'server-only';
import { getProducts } from '@/server/catalog/queries';
import {
  CATALOG_PAGE_SIZE, catalogFacets, filterCatalog, isOnSale, type CatalogFacets, type CatalogFilters,
} from '@/lib/catalog/filters';
import type { CatalogScope } from '@/lib/catalog/scope';
import { toProductCard, type Product, type ProductCardData } from '@/types/product';

export type CatalogListing = {
  items: ProductCardData[];
  total: number;
  page: number;
  pages: number;
  facets: CatalogFacets;
};

function inScope(product: Product, scope: CatalogScope) {
  if (scope.kind === 'type') return product.subcategory === scope.type;
  if (scope.kind === 'sale') return isOnSale(product);
  if (scope.kind === 'collection') return product.collectionId === scope.slug;
  return true;
}

/** Bộ lọc trùng với phạm vi thì bỏ (trang Áo không cần lọc loại, trang Ưu đãi không cần "Đang giảm giá"). */
function effectiveFilters(scope: CatalogScope, filters: CatalogFilters): CatalogFilters {
  return {
    ...filters,
    types: scope.kind === 'type' ? [] : filters.types,
    sale: scope.kind === 'sale' ? false : filters.sale,
    collections: scope.kind === 'collection' ? [] : filters.collections,
  };
}

/**
 * Một trang kết quả: tìm kiếm, lọc, sắp xếp và cắt trang trên máy chủ (danh sách sản phẩm đã cache), chỉ gửi xuống
 * trình duyệt đúng số thẻ của trang đang xem kèm số lượng cho từng lựa chọn lọc. Trước đây trình duyệt tải toàn bộ
 * catalog để tự lọc, tốn băng thông và chậm dần theo số sản phẩm.
 */
export async function getCatalogListing(scope: CatalogScope, filters: CatalogFilters,
  options: { limit?: number; facets?: boolean } = {}): Promise<CatalogListing> {
  const limit = Math.max(0, Math.min(48, options.limit ?? CATALOG_PAGE_SIZE));
  const base = (await getProducts()).filter((product) => inScope(product, scope));
  const active = effectiveFilters(scope, filters);
  const results = filterCatalog(base, active);
  const pages = Math.max(1, Math.ceil(results.length / Math.max(1, limit || CATALOG_PAGE_SIZE)));
  const page = Math.min(Math.max(1, filters.page), pages);
  return {
    items: limit ? results.slice((page - 1) * limit, page * limit).map(toProductCard) : [],
    total: results.length,
    page,
    pages,
    facets: options.facets === false ? EMPTY_FACETS : catalogFacets(base, active),
  };
}

const EMPTY_FACETS: CatalogFacets = {
  price: [], sizes: [], colors: [], collections: [], types: [], inStock: 0, sale: 0, isNew: 0, rating4: 0, priceRange: null,
};
