import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommerceSettings, parseCouponInput } from '../src/lib/orders/commerce-input.ts';

test('admin settings accept only whole nonnegative VND amounts', () => {
  assert.deepEqual(parseCommerceSettings({ shippingFee: 30000, freeShippingThreshold: 399000 }), { shippingFee: 30000n, freeShippingThreshold: 399000n });
  assert.throws(() => parseCommerceSettings({ shippingFee: -1, freeShippingThreshold: 399000 }));
  assert.throws(() => parseCommerceSettings({ shippingFee: 1.5, freeShippingThreshold: 399000 }));
});

test('coupon validation rejects misleading percentages and invalid codes', () => {
  assert.equal(parseCouponInput({ code: 'sale10', type: 'PERCENT', value: 10, minSubtotal: 0, active: true, requiresLogin: false }).code, 'SALE10');
  assert.throws(() => parseCouponInput({ code: 'sale10', type: 'PERCENT', value: 120, minSubtotal: 0, active: true, requiresLogin: false }));
  assert.throws(() => parseCouponInput({ code: 'bad code', type: 'FIXED', value: 10000, minSubtotal: 0, active: true, requiresLogin: false }));
});

test('coupon times without a timezone are Vietnam time, not server (UTC) time', async () => {
  const { optionalDate } = await import('../src/lib/orders/commerce-input.ts');
  assert.equal(optionalDate('2026-10-31T23:59')?.toISOString(), '2026-10-31T16:59:00.000Z');
  // Giao diện gửi ISO có múi giờ: giữ nguyên, lưu rồi mở lại không bị lệch thêm.
  assert.equal(optionalDate('2026-10-31T16:59:00.000Z')?.toISOString(), '2026-10-31T16:59:00.000Z');
  assert.equal(optionalDate(''), null);
  assert.throws(() => optionalDate('ngày mai'), /không hợp lệ/);
});
