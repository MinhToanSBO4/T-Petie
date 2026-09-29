import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('client authentication does not trust local role or demo users', () => {
  const source = read('../src/context/AuthContext.tsx');
  assert.doesNotMatch(source, /FALLBACK_USERS|tpetie_user|tpetie_current_user|admin@tpetie\.vn/);
});

test('auth has no built-in secret or Facebook provider', () => {
  const source = read('../src/lib/auth.ts');
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
