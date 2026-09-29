import test from 'node:test';
import assert from 'node:assert/strict';
import { priceOrder } from '../src/lib/orders/pricing.ts';

const catalog = [{ id: 'variant-1', productId: 'dress', name: 'Váy kem', size: 'Size 90', price: 225000, stock: 2, active: true }];

test('uses server price even when browser submits zero', () => {
  assert.equal(priceOrder([{ variantId: 'variant-1', quantity: 2, totalAmount: 0 }], catalog).subtotal, 450000);
});

test('rejects orders above stock', () => {
  assert.throws(() => priceOrder([{ variantId: 'variant-1', quantity: 3 }], catalog), /tồn kho/i);
});

test('rejects duplicate variants', () => {
  assert.throws(() => priceOrder([{ variantId: 'variant-1', quantity: 1 }, { variantId: 'variant-1', quantity: 1 }], catalog), /trùng/i);
});

test('rejects invalid quantity', () => {
  assert.throws(() => priceOrder([{ variantId: 'variant-1', quantity: -1 }], catalog), /số lượng/i);
});
