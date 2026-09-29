import test from 'node:test';
import assert from 'node:assert/strict';
import { getCachedCatalog, loadCatalogProducts, clearCatalogCache } from '../src/client/catalog-cache.ts';

test('catalog loads once for repeated page visits and shares concurrent requests', async () => {
  clearCatalogCache();
  let calls = 0;
  const fetcher = async () => { calls++; return { ok: true, json: async () => ({ products: [{ id: 'one' }] }) }; };
  const [first, second] = await Promise.all([loadCatalogProducts(fetcher), loadCatalogProducts(fetcher)]);
  assert.equal(calls, 1);
  assert.deepEqual(first, second);
  assert.deepEqual(getCachedCatalog(), first);
  await loadCatalogProducts(fetcher);
  assert.equal(calls, 1);
});

test('session storage persists catalog and clearCatalogCache clears both memory and session', async () => {
  const store = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => store.get(key) || null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
    },
  };

  try {
    clearCatalogCache();
    let calls = 0;
    const fetcher = async () => { calls++; return { ok: true, json: async () => ({ products: [{ id: 'session-item' }] }) }; };
    
    const result = await loadCatalogProducts(fetcher);
    assert.equal(calls, 1);
    assert.deepEqual(result, [{ id: 'session-item' }]);
    assert(store.has('tpetie_catalog_cache_v1'));

    clearCatalogCache();
    assert.equal(getCachedCatalog(), null);
    assert.equal(store.has('tpetie_catalog_cache_v1'), false);
  } finally {
    delete globalThis.window;
  }
});

test('catalog follows every page when more than 48 products exist', async () => {
  clearCatalogCache();
  const urls = [];
  const fetcher = async (url) => {
    urls.push(url);
    const page = new URL(url, 'http://localhost').searchParams.get('page');
    return { ok: true, json: async () => ({ total: 49, products: page === '2' ? [{ id: 'last' }] : Array.from({ length: 48 }, (_, index) => ({ id: `first-${index}` })) }) };
  };
  const products = await loadCatalogProducts(fetcher);
  assert.equal(products.length, 49);
  assert.deepEqual(urls, ['/api/products?limit=48&page=1', '/api/products?limit=48&page=2']);
});
