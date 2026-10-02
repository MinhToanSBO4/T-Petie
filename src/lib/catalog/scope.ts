import { TYPE_OPTIONS, type SortKey } from '@/lib/catalog/filters';
import type { ProductSubcategory } from '@/types/product';

/**
 * Phạm vi của một trang danh sách: toàn bộ, một loại (áo/quần/váy/set), hàng đang ưu đãi hoặc một bộ sưu tập.
 * Bộ lọc của khách áp dụng bên trong phạm vi này.
 */
export type CatalogScope =
  | { kind: 'all' }
  | { kind: 'type'; type: ProductSubcategory }
  | { kind: 'sale' }
  | { kind: 'collection'; slug: string };

/** Cách sắp xếp mặc định theo phạm vi: trang ưu đãi xếp giảm nhiều nhất lên đầu. */
export function defaultSortFor(scope: CatalogScope): SortKey {
  return scope.kind === 'sale' ? 'discount' : 'newest';
}

/** Chuỗi phạm vi cho API (`all`, `sale`, `type:ao`, `collection:hoc-xinh`), dùng khi trình duyệt hỏi số kết quả/gợi ý. */
export function scopeParam(scope: CatalogScope): string {
  if (scope.kind === 'type') return `type:${scope.type}`;
  if (scope.kind === 'collection') return `collection:${scope.slug}`;
  return scope.kind;
}

export function parseScopeParam(value: string | null): CatalogScope {
  if (value === 'sale') return { kind: 'sale' };
  if (value?.startsWith('type:')) {
    const type = TYPE_OPTIONS.find((option) => option.value === value.slice(5));
    if (type) return { kind: 'type', type: type.value };
  }
  if (value?.startsWith('collection:') && /^[a-z0-9-]{1,100}$/.test(value.slice(11))) {
    return { kind: 'collection', slug: value.slice(11) };
  }
  return { kind: 'all' };
}
