import test from 'node:test';
import assert from 'node:assert/strict';
import { getCachedCatalog, loadCatalogProducts, clearCatalogCache } from '../src/lib/catalog-client-cache.ts';

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
