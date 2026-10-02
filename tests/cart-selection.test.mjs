import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reconcileCartSelection } from '../src/client/cart-selection.ts';

test('items hydrated after first render become selected by default', () => {
  assert.deepEqual([...reconcileCartSelection([], ['a'], new Set())], ['a']);
});

test('changing cart items preserves intentional deselection', () => {
  assert.deepEqual([...reconcileCartSelection(['a', 'b'], ['a', 'b', 'c'], new Set(['a']))], ['a', 'c']);
});

test('cart page captures the previous keys before the deferred state update runs', () => {
  // Hàm cập nhật state chạy trễ: nếu nó đọc ref, ref đã trỏ sang danh sách mới và món vừa nạp bị bỏ chọn
  // (mở thẳng /cart thì "0 món được chọn", nút thanh toán bị khóa).
  const source = readFileSync(new URL('../src/app/cart/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /setSelectedKeys\(\([^)]*\)\s*=>[^;]*previousKeys\.current/);
});
