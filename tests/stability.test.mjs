import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConnectionUrl } from '../src/lib/db/connection-url.ts';
import { BULK_ORDER_LIMIT, canTransition, forwardPath, PREVIOUS_STATUS, UNDOABLE_STATUSES } from '../src/lib/orders/status.ts';
import { parseFeedbackOrder, parseTestimonialInput } from '../src/lib/content/testimonial-input.ts';

const session = 'postgresql://postgres.ref:secret@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?schema=tpetie_app';
const transaction = 'postgresql://postgres.ref:secret@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?schema=tpetie_app';
const params = (url) => Object.fromEntries(new URL(url).searchParams);

test('long-running servers get a small pool instead of a single connection', () => {
  const { url, warning } = resolveConnectionUrl(session, 'server');
  assert.deepEqual(params(url), { schema: 'tpetie_app', connection_limit: '5', pool_timeout: '20' });
  assert.equal(warning, undefined);
  assert.equal(params(resolveConnectionUrl(session, 'build').url).pool_timeout, '30');
});

test('serverless deployments use the transaction pooler safely and warn on the session pooler', () => {
  const pooled = resolveConnectionUrl(transaction, 'serverless');
  assert.deepEqual(params(pooled.url), { schema: 'tpetie_app', pgbouncer: 'true', connection_limit: '5', pool_timeout: '20' });
  assert.equal(pooled.warning, undefined);
  const direct = resolveConnectionUrl(session, 'serverless');
  assert.equal(params(direct.url).connection_limit, '1');
  assert.match(direct.warning, /6543/);
  const tuned = resolveConnectionUrl(`${transaction}&connection_limit=2&pool_timeout=5&pgbouncer=false`, 'serverless');
  assert.deepEqual(params(tuned.url), { schema: 'tpetie_app', connection_limit: '2', pool_timeout: '5', pgbouncer: 'false' },
    'explicit settings in the connection string win');
  assert.equal(new URL(resolveConnectionUrl(transaction, 'server').url).password, 'secret', 'credentials are kept as-is');
});

test('admins can jump ahead along the main flow; history covers every intermediate step', () => {
  assert.deepEqual(forwardPath('PENDING', 'SHIPPING'), ['CONFIRMED', 'PROCESSING', 'SHIPPING']);
  assert.deepEqual(forwardPath('SHIPPING', 'COMPLETED'), ['COMPLETED']);
  assert.equal(forwardPath('SHIPPING', 'CONFIRMED'), null, 'never backwards');
  assert.equal(forwardPath('CONFIRMED', 'CONFIRMED'), null);
  assert.equal(forwardPath('CANCELLED', 'COMPLETED'), null);
  assert.equal(forwardPath('PENDING', 'CANCELLED'), null, 'cancelling is a separate action with a reason');
  assert.equal(forwardPath('UNKNOWN', 'COMPLETED'), null);
  for (const step of forwardPath('PENDING', 'COMPLETED')) assert.ok(step);
  // Mỗi bước trong lộ trình là một bước hợp lệ của quy trình từng bước.
  const path = ['PENDING', ...forwardPath('PENDING', 'COMPLETED')];
  for (let index = 1; index < path.length; index++) assert.equal(canTransition(path[index - 1], path[index]), true);
});

test('every forward step is undoable right after, cancelling is not', () => {
  assert.ok(UNDOABLE_STATUSES.includes('COMPLETED'));
  assert.ok(!UNDOABLE_STATUSES.includes('CANCELLED'));
  for (const status of UNDOABLE_STATUSES) assert.deepEqual(forwardPath(PREVIOUS_STATUS[status], status), [status]);
  assert.equal(BULK_ORDER_LIMIT, 50);
});

test('feedback display order is a list of unique ids and editing keeps the saved position', () => {
  assert.deepEqual(parseFeedbackOrder({ ids: ['b', 'a', 'c'] }), ['b', 'a', 'c']);
  assert.throws(() => parseFeedbackOrder({ ids: [] }));
  assert.throws(() => parseFeedbackOrder({ ids: ['a', 'a'] }));
  assert.throws(() => parseFeedbackOrder({ ids: ['../x'] }));
  assert.throws(() => parseFeedbackOrder({ ids: Array.from({ length: 201 }, (_, index) => `id${index}`) }));
  const edit = parseTestimonialInput({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/a.png', consentConfirmed: true, isPublished: true });
  assert.equal('sortOrder' in edit, false, 'saving an edit without a position does not move the feedback');
  assert.equal(parseTestimonialInput({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/a.png', consentConfirmed: false,
    isPublished: false, sortOrder: 3 }).sortOrder, 3);
});
