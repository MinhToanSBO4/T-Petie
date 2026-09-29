'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { FilterBar } from '@/components/filter/FilterBar';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';

function BeGaiContent() {
  const { products: allProducts, loading, error } = useCatalogProducts();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState('all');

  const filteredProducts = useMemo(() => {
    let list = allProducts.filter((p) => p.category === 'be-gai');

    if (searchQuery) {
      list = allProducts.filter((p) => 
        p.name.toLowerCase().includes(searchQuery) ||
        (p.description && p.description.toLowerCase().includes(searchQuery))
      );
    }

    if (priceRange === 'under-200') {
      list = list.filter((p) => p.basePrice < 200000);
    } else if (priceRange === '200-300') {
      list = list.filter((p) => p.basePrice >= 200000 && p.basePrice <= 300000);
    } else if (priceRange === 'above-300') {
      list = list.filter((p) => p.basePrice > 300000);
    }

    if (sortBy === 'best-seller') {
      list.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.basePrice - a.basePrice);
    }

    return list;
  }, [allProducts, sortBy, priceRange, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Thời Trang Bé Gái', href: '/be-gai' }]} />

      {/* Tiêu đề & Giới thiệu */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-charcoal-900 mb-2">
          {searchQuery ? `Kết quả tìm kiếm cho "${searchParams.get('q')}"` : 'Thời Trang Bé Gái Ngọt Ngào 🌸'}
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-600 max-w-2xl leading-relaxed">
          {searchQuery 
            ? `Tìm thấy ${filteredProducts.length} sản phẩm phù hợp với tìm kiếm của bạn.` 
            : 'Tổng hợp tất cả các mẫu váy công chúa voan tơ, áo sơ mi cổ sen thêu tay và set bộ thô đũi organic cao cấp cho bé gái từ 1 đến 5 tuổi.'}
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar
        activeSubcategory="all"
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedPriceRange={priceRange}
        onPriceChange={setPriceRange}
        totalResults={filteredProducts.length}
      />

      {/* Product Grid */}
      {loading ? <ProductGridSkeleton /> : error ? <p role="alert" className="py-12 text-center text-red-700">{error}</p> : <ProductGrid products={filteredProducts} />}
    </div>
  );
}

export default function BeGaiAllPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey-500"></div>
      </div>
    }>
      <BeGaiContent />
    </Suspense>
  );
}
