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
  inFlight = fetcher('/api/products?limit=48')
    .then(async (response) => {
      if (!response.ok) throw new Error('Không tải được sản phẩm');
      const data = await response.json();
      cached = Array.isArray(data.products) ? data.products : [];
      expiresAt = Date.now() + 60_000;
      return cached!;
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}
