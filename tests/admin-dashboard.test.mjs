import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketLabel, parseRange, percentChange, resolvePeriod } from '../src/lib/admin/dashboard-range.ts';
import { formatVNDShort } from '../src/lib/utils/formatters.ts';
import { MAX_PAGE, parsePagination } from '../src/lib/pagination.ts';
import { orderStatusLabel } from '../src/lib/orders/status.ts';

test('range parameter only accepts known presets and falls back to 30 days', () => {
  assert.equal(parseRange('7d'), '7d');
  assert.equal(parseRange('12m'), '12m');
  assert.equal(parseRange('abc'), '30d');
  assert.equal(parseRange('__proto__'), '30d');
  assert.equal(parseRange(undefined), '30d');
});

test('7-day period starts at Vietnam midnight and compares against the same elapsed time', () => {
  // 02:00 UTC = 09:00 ngày 01/10 giờ Việt Nam.
  const period = resolvePeriod('7d', new Date('2026-10-01T02:00:00Z'));
  assert.equal(period.from.toISOString(), '2026-09-24T17:00:00.000Z'); // 00:00 ngày 25/09 giờ VN
  assert.deepEqual(period.keys, ['2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01']);
  assert.equal(period.prevFrom.toISOString(), '2026-09-17T17:00:00.000Z');
  assert.equal(period.prevKeys[0], '2026-09-18');
  assert.equal(period.prevKeys.at(-1), '2026-09-24');
  // Kỳ trước dừng ở 09:00 ngày 24/09 giờ VN, cùng độ dài 6 ngày 9 giờ với kỳ này.
  assert.equal(period.prevTo.toISOString(), '2026-09-24T02:00:00.000Z');
});

test('"today" follows Vietnam time, not the server clock', () => {
  assert.equal(resolvePeriod('7d', new Date('2026-09-30T17:30:00Z')).keys.at(-1), '2026-10-01'); // 00:30 ngày 01/10 VN
  assert.equal(resolvePeriod('7d', new Date('2026-09-30T16:59:59Z')).keys.at(-1), '2026-09-30'); // 23:59 ngày 30/09 VN
});

test('12-month period covers whole months and rolls over the year', () => {
  const period = resolvePeriod('12m', new Date('2026-10-01T02:00:00Z'));
  assert.equal(period.keys.length, 12);
  assert.equal(period.keys[0], '2025-11');
  assert.equal(period.keys.at(-1), '2026-10');
  assert.equal(period.from.toISOString(), '2025-10-31T17:00:00.000Z');
  assert.equal(period.prevKeys[0], '2024-11');
  assert.equal(period.prevKeys.at(-1), '2025-10');
  assert.deepEqual(resolvePeriod('12m', new Date('2026-01-15T00:00:00Z')).keys.slice(0, 2), ['2025-02', '2025-03']);
});

test('30 and 90 day periods have one bucket per day', () => {
  assert.equal(resolvePeriod('30d', new Date('2026-10-01T02:00:00Z')).keys.length, 30);
  assert.equal(resolvePeriod('90d', new Date('2026-10-01T02:00:00Z')).keys.length, 90);
});

test('percent change is honest when the previous period is empty', () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(0, 0), 0);
  assert.equal(percentChange(5, 0), null);
});

test('axis labels and short money format read naturally in Vietnamese', () => {
  assert.equal(bucketLabel('2026-09-25'), '25/09');
  assert.equal(bucketLabel('2026-09'), '09/2026');
  assert.equal(formatVNDShort(999), '999đ');
  assert.equal(formatVNDShort(850_000), '850k');
  assert.equal(formatVNDShort(12_500_000), '12,5 tr');
  assert.equal(formatVNDShort(1_200_000_000), '1,2 tỷ');
});

test('pagination rejects huge or fractional values that would break Prisma', () => {
  const parse = (query) => parsePagination(new URLSearchParams(query), 10, 50);
  assert.deepEqual(parse(''), { page: 1, limit: 10, skip: 0, take: 10 });
  assert.equal(parse('page=abc').page, 1);
  assert.equal(parse('page=99999999').page, MAX_PAGE);
  assert.equal(parse('limit=2.5').take, 2);
  assert.equal(parse('limit=1000').take, 50);
  assert.equal(parse('page=-3').page, 1);
});

test('order status labels are shared and unknown values pass through', () => {
  assert.equal(orderStatusLabel('PENDING'), 'Chờ xử lý');
  assert.equal(orderStatusLabel('COMPLETED'), 'Hoàn tất');
  assert.equal(orderStatusLabel('SOMETHING'), 'SOMETHING');
});
