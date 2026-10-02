'use client';

import type { ProductCardData } from '@/types/product';
import { ProductCard } from './ProductCard';

/** Lưới thẻ sản phẩm; `priorityCount` thẻ đầu tải ảnh ngay (nằm trong màn hình đầu tiên). */
export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-cream-200 bg-white px-4 py-16 text-center shadow-card">
        <div className="mb-3 text-4xl" aria-hidden>🧸</div>
        <h3 className="mb-1 font-heading text-base font-bold text-charcoal-900">
          Chưa tìm thấy sản phẩm phù hợp
        </h3>
        <p className="mx-auto max-w-sm text-xs text-charcoal-400">
          Mẹ hãy thử chọn lại bộ lọc hoặc tìm kiếm với từ khoá khác nhé!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}
