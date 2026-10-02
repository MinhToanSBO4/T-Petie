import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_PRICE, parseProductPatch, parseSubcategory, parseVariantInput, parseVariantPatch } from '../src/lib/content/product-input.ts';

test('an empty or zero price is rejected instead of being saved as a free product', () => {
  assert.throws(() => parseVariantInput({ size: 'Size 110', price: 0, stock: 3 }), /Giá/);
  assert.throws(() => parseVariantInput({ size: 'Size 110', price: Number(''), stock: 3 }), /Giá/);
  assert.throws(() => parseVariantPatch({ price: 0 }), /Giá/);
  assert.equal(parseVariantInput({ size: ' Size 110 ', price: MIN_PRICE, stock: 0 }).size, 'Size 110');
});

test('a stock edit must carry the stock the form started from', () => {
  assert.throws(() => parseVariantPatch({ stock: 5 }), /tồn kho ban đầu/);
  assert.deepEqual(parseVariantPatch({ stock: 5, expectedStock: 2 }), { stock: 5, expectedStock: 2 });
  // Sửa giá không đụng tới tồn kho thì không cần số ban đầu.
  assert.deepEqual(parseVariantPatch({ price: 250000 }), { price: 250000n });
});

test('sizes can be hidden and get weight/age hints', () => {
  assert.deepEqual(parseVariantPatch({ isActive: false, weightRange: ' 10 - 12kg ', ageRange: '' }),
    { isActive: false, weightRange: '10 - 12kg', ageRange: null });
});

test('product type must be one of the storefront categories', () => {
  assert.equal(parseSubcategory('vay'), 'vay');
  assert.equal(parseSubcategory(''), null);
  assert.throws(() => parseSubcategory('giay'), /Loại sản phẩm/);
  assert.deepEqual(parseProductPatch({ subcategory: 'set-do', subcategoryName: 'Set đồ', material: 'Đũi' }),
    { subcategory: 'set-do', subcategoryName: 'Set đồ', material: 'Đũi' });
});

test('the display price is not editable on its own any more', () => {
  // basePrice được máy chủ tính từ giá size rẻ nhất; gửi lên thì bị bỏ qua.
  assert.throws(() => parseProductPatch({ basePrice: 1 }), /Không có thay đổi/);
});
