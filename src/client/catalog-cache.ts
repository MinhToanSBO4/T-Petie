import type { Product } from '@/types/product';

const SESSION_CACHE_KEY = 'tpetie_catalog_cache_v1';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 phút tươi mới

let cached: Product[] | null = null;
let expiresAt = 0;
let inFlight: Promise<Product[]> | null = null;
let reloadHandled = false;

function isBrowserReload(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      return nav.type === 'reload';
    }
    const legacy = (performance as unknown as { navigation?: { type?: number } }).navigation;
    return legacy?.type === 1;
  } catch {
    return false;
  }
}

function handleBrowserReloadIfNeeded(): void {
  if (reloadHandled) return;
  reloadHandled = true;
  if (isBrowserReload()) {
    // Khi người dùng bấm F5 / Reload trang, chủ động thanh trừng cache phiên để tải mới
    clearCatalogCache();
  }
}

function readSessionCache(): { products: Product[]; expiresAt: number } | null {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.products) || typeof parsed.expiresAt !== 'number') {
      window.sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(products: Product[], ttlMs: number): void {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return;
  try {
    const payload = {
      products,
      expiresAt: Date.now() + ttlMs,
    };
    window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Dự phòng khi quota vượt mức hoặc chế độ duyệt web chặn storage
  }
}

export function getCachedCatalog(): Product[] | null {
  handleBrowserReloadIfNeeded();

  // 1. Kiểm tra RAM cache trước (0ms latency)
  if (cached && Date.now() < expiresAt) {
    return cached;
  }

  // 2. Kiểm tra Session Storage (duy trì giữa các lần chuyển trang client)
  const sessionData = readSessionCache();
  if (sessionData && Date.now() < sessionData.expiresAt) {
    cached = sessionData.products;
    expiresAt = sessionData.expiresAt;
    return cached;
  }

  return null;
}

export function clearCatalogCache() {
  cached = null;
  expiresAt = 0;
  inFlight = null;
  if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
    try {
      window.sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch {
      // Bỏ qua lỗi
    }
  }
}

export function loadCatalogProducts(fetcher: typeof fetch = fetch): Promise<Product[]> {
  handleBrowserReloadIfNeeded();

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
    expiresAt = Date.now() + CACHE_TTL_MS;
    writeSessionCache(all, CACHE_TTL_MS);
    return all;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
