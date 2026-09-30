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

test('seed has no published password', () => {
  const source = read('../prisma/seed.ts');
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
    assert.match(source, /(requireAdminApi|getStaffSession)\(\)/, `${route} must call a shared guard`);
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
