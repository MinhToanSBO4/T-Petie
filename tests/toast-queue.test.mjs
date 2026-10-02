import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOADING_TIMEOUT_MS, MAX_VISIBLE_TOASTS, clampProgress, patchToast, removeToast, toastDuration, upsertToast,
} from '../src/lib/toast-queue.ts';

function ids() {
  let next = 0;
  return () => `t${++next}`;
}

test('a loading toast is replaced in place by its result', () => {
  const newId = ids();
  const loading = upsertToast([], { type: 'loading', message: 'Đang lưu sản phẩm…' }, newId);
  assert.equal(loading.list[0].duration, LOADING_TIMEOUT_MS);
  const done = upsertToast(loading.list, { id: loading.id, type: 'success', message: 'Đã lưu sản phẩm' }, newId);
  assert.equal(done.id, loading.id);
  assert.equal(done.list.length, 1);
  assert.equal(done.list[0].type, 'success');
  assert.equal(done.list[0].version, 1, 'the auto-close timer restarts');
  assert.ok(Number.isFinite(done.list[0].duration) && done.list[0].duration < LOADING_TIMEOUT_MS);
});

test('the same message shown again refreshes the visible toast instead of stacking a copy', () => {
  const newId = ids();
  const first = upsertToast([], { type: 'warning', message: 'Đang kiểm tra giá và tồn kho.' }, newId);
  const again = upsertToast(first.list, { type: 'warning', message: 'Đang kiểm tra giá và tồn kho.' }, newId);
  assert.equal(again.list.length, 1);
  assert.equal(again.id, first.id);
  assert.equal(again.list[0].version, 1);
  const other = upsertToast(again.list, { type: 'error', message: 'Đang kiểm tra giá và tồn kho.' }, newId);
  assert.equal(other.list.length, 2, 'a different type is a different notice');
});

test('only a few toasts stay on screen, and running tasks are never pushed out', () => {
  const newId = ids();
  let list = upsertToast([], { type: 'loading', message: 'Đang tải ảnh 1/3…', progress: 10 }, newId).list;
  for (let index = 0; index < MAX_VISIBLE_TOASTS + 3; index += 1) {
    list = upsertToast(list, { type: 'success', message: `Đã thêm món ${index}` }, newId).list;
  }
  assert.equal(list.length, MAX_VISIBLE_TOASTS);
  assert.equal(list[0].type, 'loading');
  assert.equal(list.at(-1).message, `Đã thêm món ${MAX_VISIBLE_TOASTS + 2}`);
});

test('errors stay longer than confirmations and long messages get time to be read', () => {
  assert.ok(toastDuration('error', 'Lỗi') >= 5_000);
  assert.ok(toastDuration('success', 'Đã lưu') <= 3_000);
  assert.ok(toastDuration('success', 'Đã lưu') < toastDuration('error', 'Đã lưu'));
  const long = 'Số điện thoại gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09. Mẹ kiểm tra lại giúp shop nhé.';
  assert.ok(toastDuration('info', long) > toastDuration('info', 'Đã sao chép'));
  assert.equal(toastDuration('error', 'x'.repeat(1_000)), 7_000);
  assert.equal(toastDuration('loading', 'Đang tạo file…'), LOADING_TIMEOUT_MS);
});

test('progress is clamped to 0–100 and patched without restarting the read time', () => {
  assert.equal(clampProgress(-5), 0);
  assert.equal(clampProgress(140), 100);
  assert.equal(clampProgress(33.4), 33);
  assert.equal(clampProgress(Number.NaN), null);
  assert.equal(clampProgress(undefined), null);

  const created = upsertToast([], { type: 'loading', message: 'Đang tải ảnh 1/2…', progress: 0 }, ids());
  const halfway = patchToast(created.list, created.id, { progress: 50 });
  assert.equal(halfway[0].progress, 50);
  assert.equal(halfway[0].duration, created.list[0].duration);
  const renamed = patchToast(halfway, created.id, { type: 'success', message: 'Đã tải 2 ảnh' });
  assert.equal(renamed[0].type, 'success');
  assert.ok(renamed[0].duration < LOADING_TIMEOUT_MS);
  assert.equal(patchToast(renamed, 'missing', { progress: 90 }), renamed, 'a closed toast is not reopened');
});

test('removing an unknown toast keeps the same list', () => {
  const created = upsertToast([], { type: 'info', message: 'Đã sao chép link' }, ids());
  assert.equal(removeToast(created.list, 'missing'), created.list);
  assert.deepEqual(removeToast(created.list, created.id), []);
});
