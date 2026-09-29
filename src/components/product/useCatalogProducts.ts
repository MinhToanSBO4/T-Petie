'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';

export function useCatalogProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/products?limit=48', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Không tải được sản phẩm');
        return response.json();
      })
      .then((data) => setProducts(data.products || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, []);
  return { products, error };
}
