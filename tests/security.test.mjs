import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('client authentication does not trust local role or demo users', () => {
  const source = read('../src/context/AuthContext.tsx');
  assert.doesNotMatch(source, /FALLBACK_USERS|tpetie_user|tpetie_current_user|admin@tpetie\.vn/);
});

test('auth has no built-in secret or Facebook provider', () => {
  const source = read('../src/server/auth/options.ts');
  assert.doesNotMatch(source, /FacebookProvider|super_secret_jwt_key|allowDangerousEmailAccountLinking/);
});

test('checkout does not forward orders to Apps Script', () => {
  const source = read('../src/app/api/checkout/route.ts');
  assert.doesNotMatch(source, /APPS_SCRIPT_URL|script\.google\.com|TPE-DUMMY/);
});

test('build cannot silently erase the database', () => {
  const config = JSON.parse(read('../package.json'));
  assert.doesNotMatch(config.scripts.build, /db push|accept-data-loss/);
});

test('admin creation has no published password', () => {
  const source = read('../scripts/create-admin.cjs');
  assert.doesNotMatch(source, /AdminPassword123|UserPassword123/);
});

test('every admin API route uses the shared role guards instead of ad-hoc checks', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const root = new URL('../src/app/api/admin/', import.meta.url);
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : name === 'route.ts' ? [path] : [];
  });
  const routes = walk(root.pathname.replace(/^\/(?=[A-Za-z]:)/, ''));
  assert.ok(routes.length >= 20, 'admin routes found');
  for (const route of routes) {
    const source = readFileSync(route, 'utf8');
    assert.match(source, /(requireAdminApi|requireStaffApi|getStaffSession)\(\)/, `${route} must call a shared guard`);
    assert.doesNotMatch(source, /getServerSession/, `${route} must not re-implement the role check`);
  }
});

test('export API never sends the storage URL of customer data to the browser', () => {
  for (const path of ['../src/app/api/admin/export/route.ts', '../src/app/api/admin/export/[id]/route.ts']) {
    const source = read(path);
    assert.match(source, /select: EXPORT_JOB_FIELDS/);
  }
  assert.doesNotMatch(read('../src/server/orders/export-orders.ts').match(/EXPORT_JOB_FIELDS = \{[^}]*\}/)[0], /fileUrl/);
});

test('reviews are only accepted for a completed purchase that belongs to the signed-in customer', () => {
  const route = read('../src/app/api/reviews/route.ts');
  assert.match(route, /createVerifiedReview\(/);
  assert.doesNotMatch(route, /productReview\.create/, 'the review route must go through the purchase check');
  const service = read('../src/server/reviews/submit-review.ts');
  assert.match(service, /where: \{ id: orderItemId, order: \{ userId \} \}/, 'the purchased item must be in the customer\'s own order');
  assert.match(service, /reviewEligibility\(/, 'completion and review window are checked on the server');
  assert.match(service, /detectImageType\(/, 'uploaded photos are checked by content, not by declared type');
  const edit = read('../src/app/api/reviews/[id]/route.ts');
  assert.match(edit, /updateOwnReview\(\{ userId: session\.user\.id/);
});

test('customers can only cancel or confirm receipt of their own orders', () => {
  const route = read('../src/app/api/orders/[id]/status/route.ts');
  assert.match(route, /changeOrderStatus\(params\.id, to, \{ ownerId: session\.user\.id, from,/);
  assert.match(route, /Object\.hasOwn\(CUSTOMER_ORDER_ACTIONS/);
  const detail = read('../src/server/orders/customer-orders.ts');
  assert.match(detail, /where: \{ orderCode, userId \}/, 'order details are scoped to the owner');
});
