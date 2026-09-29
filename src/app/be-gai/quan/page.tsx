'use client';

import React, { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { FilterBar } from '@/components/filter/FilterBar';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useCatalogProducts } from '@/components/product/useCatalogProducts';

export default function BeGaiQuanPage() {
  const { products: allProducts } = useCatalogProducts();
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState('all');

  const filteredProducts = useMemo(() => {
    let list = allProducts.filter((p) => p.category === 'be-gai' && p.subcategory === 'quan');

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
  }, [allProducts, sortBy, priceRange]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <Breadcrumb
        items={[
          { label: 'Bé Gái', href: '/be-gai' },
          { label: 'Quần Bloomer & Yếm', href: '/be-gai/quan' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-charcoal-900 mb-2">
          Quần Bloomer &amp; Quần Yếm Bé Gái 🩳
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-600 max-w-2xl leading-relaxed">
          Quần bloomer bí bồng dễ thương và yếm thô đũi mát mẻ, thiết kế lưng chun co giãn êm ái cho bé thoải mái đóng bỉm.
        </p>
      </div>

      <FilterBar
        activeSubcategory="quan"
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedPriceRange={priceRange}
        onPriceChange={setPriceRange}
        totalResults={filteredProducts.length}
      />

      <ProductGrid products={filteredProducts} />
    </div>
  );
}
