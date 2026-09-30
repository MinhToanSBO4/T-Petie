'use client';

import { useMemo, useState } from 'react';
import { FilterBar } from '@/components/filter/FilterBar';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';

/** Danh sách sản phẩm của một trang danh mục con (áo, quần, váy, set đồ). */
export function CategoryProductList({ subcategory }: { subcategory: string }) {
  const { products: allProducts, loading, error } = useCatalogProducts();
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState('all');

  const filteredProducts = useMemo(() => {
    let list = allProducts.filter((p) => p.category === 'girls' && p.subcategory === subcategory);

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
  }, [allProducts, sortBy, priceRange, subcategory]);

  return <>
    <FilterBar
      activeSubcategory={subcategory}
      sortBy={sortBy}
      onSortChange={setSortBy}
      selectedPriceRange={priceRange}
      onPriceChange={setPriceRange}
      totalResults={filteredProducts.length}
    />
    {loading ? <ProductGridSkeleton /> : error ? <p role="alert" className="py-12 text-center text-red-700">{error}</p> : <ProductGrid products={filteredProducts} />}
  </>;
}
