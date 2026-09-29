'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { getCachedCatalog, loadCatalogProducts } from '@/client/catalog-cache';

export function useCatalogProducts() {
  const [products, setProducts] = useState<Product[]>(() => getCachedCatalog() || []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !getCachedCatalog());
  useEffect(() => {
    let active = true;
    loadCatalogProducts()
      .then((data) => { if (active) { setProducts(data); setError(null); } })
      .catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { products, error, loading };
}
