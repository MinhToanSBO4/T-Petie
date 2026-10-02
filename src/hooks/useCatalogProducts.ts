'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { getCachedCatalog, loadCatalogProducts } from '@/client/catalog-cache';

// useLayoutEffect chỉ chạy ở trình duyệt; máy chủ dùng useEffect để không có cảnh báo.
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Danh mục sản phẩm dùng chung ở trình duyệt. Lần dựng đầu luôn giống HTML máy chủ (đang tải) để không lỗi hydrate;
 * bản đã lưu trong tab (nếu có) được hiện ngay trước khi trình duyệt vẽ nên không thấy nháy khung chờ.
 */
export function useCatalogProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useBrowserLayoutEffect(() => {
    const cached = getCachedCatalog();
    if (cached) { setProducts(cached); setLoading(false); }
    let active = true;
    loadCatalogProducts()
      .then((data) => { if (active) { setProducts(data); setError(null); } })
      .catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { products, error, loading };
}
