import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrderItemId, parseReviewFields, sizeFitLabel } from '../src/lib/content/review-input.ts';
import { canEditReview, maskName, reviewEligibility, reviewerName, reviewDeadline } from '../src/lib/reviews/rules.ts';
import { buildOrderTimeline, countOrderTabs, parseOrderTab, tabStatuses } from '../src/lib/orders/customer-orders.ts';
import { canTransition, CUSTOMER_ORDER_ACTIONS } from '../src/lib/orders/status.ts';
import { cloudinaryImage } from '../src/lib/media/cloudinary-url.ts';
import { detectImageType } from '../src/lib/media/image-signature.ts';
import { cartSizeLabel, findRequestedVariant } from '../src/lib/orders/variant-match.ts';

const DAY = 86_400_000;
const completedAt = new Date('2026-09-01T08:00:00Z');

test('only completed orders within 30 days can be reviewed, once per purchased item', () => {
  const at = (days) => new Date(completedAt.getTime() + days * DAY);
  assert.deepEqual(reviewEligibility({ orderStatus: 'COMPLETED', completedAt, hasReview: false, now: at(29) }).ok, true);
  assert.equal(reviewEligibility({ orderStatus: 'COMPLETED', completedAt, hasReview: false, now: at(30) }).ok, true);
  assert.deepEqual(reviewEligibility({ orderStatus: 'COMPLETED', completedAt, hasReview: false, now: at(31) }),
    { ok: false, reason: 'expired' });
  for (const status of ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'CANCELLED']) {
    assert.deepEqual(reviewEligibility({ orderStatus: status, completedAt: null, hasReview: false, now: at(1) }),
      { ok: false, reason: 'not-completed' }, `${status} must not be reviewable`);
  }
  assert.deepEqual(reviewEligibility({ orderStatus: 'COMPLETED', completedAt: null, hasReview: false }),
    { ok: false, reason: 'not-completed' }, 'a completed order needs a completion time');
  assert.deepEqual(reviewEligibility({ orderStatus: 'COMPLETED', completedAt, hasReview: true, now: at(1) }),
    { ok: false, reason: 'reviewed' });
  assert.equal(reviewDeadline(completedAt).toISOString(), '2026-10-01T08:00:00.000Z');
});

test('a review can be edited once within 30 days of submission', () => {
  const createdAt = new Date('2026-09-10T00:00:00Z');
  assert.equal(canEditReview({ createdAt, editCount: 0, now: new Date(createdAt.getTime() + 10 * DAY) }), true);
  assert.equal(canEditReview({ createdAt, editCount: 1, now: new Date(createdAt.getTime() + DAY) }), false);
  assert.equal(canEditReview({ createdAt, editCount: 0, now: new Date(createdAt.getTime() + 31 * DAY) }), false);
});

test('review fields accept JSON and form values and reject invalid input', () => {
  assert.deepEqual(parseReviewFields({ rating: '5', content: '  Vải mềm  ', sizeFit: 'fit', isAnonymous: 'true' }),
    { rating: 5, content: 'Vải mềm', sizeFit: 'fit', isAnonymous: true });
  assert.deepEqual(parseReviewFields({ rating: 4 }), { rating: 4, content: '', sizeFit: null, isAnonymous: false },
    'stars without text are allowed');
  for (const rating of [0, 6, 4.5, '10', 'abc', null]) assert.throws(() => parseReviewFields({ rating }), /sao/);
  assert.throws(() => parseReviewFields({ rating: 5, content: 'x'.repeat(1001) }), /tối đa/);
  assert.throws(() => parseReviewFields({ rating: 5, content: 42 }));
  assert.throws(() => parseReviewFields({ rating: 5, sizeFit: 'huge' }));
  assert.throws(() => parseReviewFields({ rating: 5, isAnonymous: 'maybe' }));
  assert.throws(() => parseReviewFields([5]));
  assert.equal(parseOrderItemId('cmitem_123-abc'), 'cmitem_123-abc');
  assert.throws(() => parseOrderItemId('../../orders'));
  assert.equal(sizeFitLabel('small'), 'Hơi chật');
  assert.equal(sizeFitLabel('unknown'), null);
});

test('anonymous reviewers are masked like Shopee', () => {
  assert.equal(maskName('Nguyễn Thị Lan'), 'N*****n');
  assert.equal(maskName('Ấn'), 'Ấ*****n');
  assert.equal(maskName('A'), 'A*****');
  assert.equal(reviewerName('Nguyễn Thị Lan', false), 'Nguyễn Thị Lan');
  assert.equal(reviewerName('Nguyễn Thị Lan', true), 'N*****n');
  assert.equal(reviewerName('   ', false), 'Khách hàng');
});

test('order tabs map to statuses and counts include the review backlog', () => {
  assert.equal(parseOrderTab('shipping'), 'shipping');
  assert.equal(parseOrderTab('DROP TABLE'), 'all');
  assert.equal(parseOrderTab(null), 'all');
  assert.deepEqual(tabStatuses('preparing'), ['CONFIRMED', 'PROCESSING']);
  assert.equal(tabStatuses('all'), null);
  const counts = countOrderTabs({ PENDING: 1, CONFIRMED: 2, PROCESSING: 1, SHIPPING: 3, COMPLETED: 4, CANCELLED: 1 }, 2);
  assert.deepEqual(counts, { all: 12, pending: 1, preparing: 3, shipping: 3, 'to-review': 2, completed: 4, cancelled: 1 });
});

test('order timeline marks passed, current and upcoming steps with event times', () => {
  const createdAt = '2026-09-01T01:00:00.000Z';
  const events = [{ status: 'PENDING', createdAt }, { status: 'CONFIRMED', createdAt: '2026-09-01T03:00:00.000Z' },
    { status: 'PROCESSING', createdAt: '2026-09-02T01:00:00.000Z' }];
  const timeline = buildOrderTimeline('PROCESSING', events, createdAt);
  assert.deepEqual(timeline.map((step) => step.state), ['done', 'done', 'current', 'upcoming', 'upcoming']);
  assert.equal(timeline[1].at, '2026-09-01T03:00:00.000Z');
  assert.equal(timeline[3].at, null);
  assert.ok(buildOrderTimeline('COMPLETED', [], createdAt).every((step) => step.state === 'done'));
  const cancelled = buildOrderTimeline('CANCELLED', [{ status: 'CANCELLED', createdAt: '2026-09-01T02:00:00.000Z' }], createdAt);
  assert.deepEqual(cancelled.map((step) => step.status), ['PENDING', 'CANCELLED']);
  assert.equal(cancelled[0].at, createdAt, 'legacy orders fall back to the order time');
});

test('order status changes follow the fulfilment flow and customers only cancel or confirm receipt', () => {
  assert.equal(canTransition('PENDING', 'CONFIRMED'), true);
  assert.equal(canTransition('SHIPPING', 'COMPLETED'), true);
  // Giao không thành công: quản trị viên hủy đơn đang giao; khách không làm được vì bị giới hạn `from`.
  assert.equal(canTransition('SHIPPING', 'CANCELLED'), true);
  assert.equal(CUSTOMER_ORDER_ACTIONS.cancel.from, 'PENDING');
  assert.equal(canTransition('COMPLETED', 'CANCELLED'), false);
  assert.equal(canTransition('PENDING', 'COMPLETED'), false);
  assert.equal(canTransition('UNKNOWN', 'COMPLETED'), false);
  for (const action of Object.values(CUSTOMER_ORDER_ACTIONS)) assert.equal(canTransition(action.from, action.to), true);
  assert.deepEqual(Object.keys(CUSTOMER_ORDER_ACTIONS).sort(), ['cancel', 'received']);
});

test('Cloudinary images are served resized with automatic format and quality', () => {
  const original = 'https://res.cloudinary.com/demo/image/upload/v1727/tpetie/site/chat.png';
  assert.equal(cloudinaryImage(original, { width: 480 }),
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_480/v1727/tpetie/site/chat.png');
  assert.equal(cloudinaryImage(original, { width: 1080, quality: 82.4 }),
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_82,c_limit,w_1080/v1727/tpetie/site/chat.png');
  const transformed = 'https://res.cloudinary.com/demo/image/upload/c_fill,w_100/v1/a.png';
  assert.equal(cloudinaryImage(transformed, { width: 480 }), transformed, 'existing transformations are kept');
  assert.equal(cloudinaryImage('https://example.com/a.png', { width: 480 }), 'https://example.com/a.png');
});

test('uploaded review photos are recognised by their bytes, not their declared type', () => {
  assert.equal(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'image/jpeg');
  assert.equal(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), 'image/png');
  assert.equal(detectImageType(new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')), 'image/webp');
  assert.equal(detectImageType(new TextEncoder().encode('<svg onload=alert(1)>')), null);
  assert.equal(detectImageType(new Uint8Array([])), null);
});

test('reordered items use the same cart size label as the product page', () => {
  const label = cartSizeLabel('Size 2', '10 - 12kg');
  assert.equal(label, 'Size 2 (10 - 12kg)');
  const variants = [{ productId: 'p1', size: 'Size 2', id: 'v2' }, { productId: 'p1', size: 'Size 1', id: 'v1' }];
  assert.equal(findRequestedVariant(variants, 'p1', label).id, 'v2');
  assert.equal(findRequestedVariant(variants, 'p1', cartSizeLabel('Size 1', null)).id, 'v1');
});
