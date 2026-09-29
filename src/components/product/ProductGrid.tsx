'use client';

import React from 'react';
import { Product } from '@/types/product';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export function ProductGrid({ products, isLoading = false }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div
            key={n}
            className="bg-white rounded-2xl border border-cream-200 p-3 animate-pulse flex flex-col space-y-3"
          >
            <div className="w-full aspect-square bg-cream-200 rounded-xl" />
            <div className="h-3.5 bg-cream-200 rounded w-3/4" />
            <div className="h-3 bg-cream-200 rounded w-1/2" />
            <div className="h-8 bg-cream-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white rounded-3xl border border-cream-200 shadow-card">
        <div className="text-4xl mb-3">🧸</div>
        <h3 className="text-base font-heading font-bold text-charcoal-900 mb-1">
          Chưa tìm thấy sản phẩm phù hợp
        </h3>
        <p className="text-xs text-charcoal-400 max-w-sm mx-auto">
          Mẹ hãy thử chọn lại bộ lọc hoặc tìm kiếm với từ khoá khác nhé!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
