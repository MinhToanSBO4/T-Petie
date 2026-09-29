import type { Product } from '@/types/product';

let cached: Product[] | null = null;
let expiresAt = 0;
let inFlight: Promise<Product[]> | null = null;

export function getCachedCatalog(): Product[] | null {
  return Date.now() < expiresAt ? cached : null;
}

export function clearCatalogCache() {
  cached = null;
  expiresAt = 0;
  inFlight = null;
}

export function loadCatalogProducts(fetcher: typeof fetch = fetch): Promise<Product[]> {
  const current = getCachedCatalog();
  if (current) return Promise.resolve(current);
  if (inFlight) return inFlight;
  inFlight = (async () => {
      const all: Product[] = [];
      let total = 0;
      let page = 1;
      do {
        const response = await fetcher(`/api/products?limit=48&page=${page}`);
        if (!response.ok) throw new Error('Không tải được sản phẩm');
        const data = await response.json();
        const batch: Product[] = Array.isArray(data.products) ? data.products : [];
        if (page === 1) total = Number.isSafeInteger(data.total) ? data.total : batch.length;
        if (batch.length === 0 && all.length < total) throw new Error('Dữ liệu sản phẩm chưa đầy đủ');
        all.push(...batch);
        page++;
      } while (all.length < total);
      cached = all;
      expiresAt = Date.now() + 60_000;
      return all;
    })()
    .finally(() => { inFlight = null; });
  return inFlight;
}
