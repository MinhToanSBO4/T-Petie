'use client';

import { useEffect, useState } from 'react';

type BrandAssets = { logoUrl: string; logoAlt: string };

/**
 * Logo thương hiệu cho các trang phía client: đọc từ cấu hình trong database,
 * không dùng đường dẫn ảnh viết cứng. Khi chưa cấu hình thì hiển thị tên thương hiệu.
 */
export function BrandLogo({ className }: { className?: string }) {
  const [brand, setBrand] = useState<BrandAssets | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/site-content/brand-assets', { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<BrandAssets> : Promise.reject(new Error('unavailable')))
      .then(setBrand)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (!brand?.logoUrl) {
    return <span className="font-heading font-bold text-xl hover:text-honey-600 transition-colors">T&apos;Petie</span>;
  }
  return <img src={brand.logoUrl} alt={brand.logoAlt || "T'Petie"} className={className} />;
}
