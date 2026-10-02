'use client';

import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import type { ProductSubcategory } from '@/types/product';

/** Danh sách sản phẩm của một trang danh mục con (áo, quần, váy, set đồ) kèm bộ lọc. */
export function CategoryProductList({ subcategory }: { subcategory: string }) {
  return <CatalogBrowser subcategory={subcategory as ProductSubcategory} />;
}
