import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotals } from '../src/lib/orders/commerce-pricing.ts';

const policy = { shippingFee: 30000, freeShippingThreshold: 399000 };
const fixed = { code: 'TPETIE20', type: 'FIXED', value: 20000, minSubtotal: 0, active: true, requiresLogin: false, startsAt: null, expiresAt: null, usageLimit: null, usedCount: 0 };

test('shipping and discount come from supplied database policy and coupon', () => {
  assert.deepEqual(calculateTotals(380000, policy, fixed, false), { subtotal: 380000, shippingFee: 30000, discount: 20000, total: 390000 });
  assert.deepEqual(calculateTotals(400000, policy, null, false), { subtotal: 400000, shippingFee: 0, discount: 0, total: 400000 });
});

test('coupon cannot exceed subtotal or be used beyond its conditions', () => {
  assert.equal(calculateTotals(10000, policy, fixed, false).discount, 10000);
  assert.throws(() => calculateTotals(100000, policy, { ...fixed, requiresLogin: true }, false), /đăng nhập/i);
  assert.throws(() => calculateTotals(100000, policy, { ...fixed, active: false }, true), /không hợp lệ/i);
  assert.throws(() => calculateTotals(100000, policy, { ...fixed, usageLimit: 1, usedCount: 1 }, true), /hết lượt/i);
  assert.throws(() => calculateTotals(100000, policy, { ...fixed, minSubtotal: 150000 }, true), /giá trị/i);
});

test('percentage coupon respects validity window', () => {
  const coupon = { ...fixed, type: 'PERCENT', value: 10, startsAt: new Date('2026-01-01'), expiresAt: new Date('2026-12-31') };
  assert.equal(calculateTotals(100000, policy, coupon, true, new Date('2026-06-01')).discount, 10000);
  assert.throws(() => calculateTotals(100000, policy, coupon, true, new Date('2027-01-01')), /hết hạn/i);
});
