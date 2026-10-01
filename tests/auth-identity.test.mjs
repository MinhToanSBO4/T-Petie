import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLoginIdentifier } from '../src/lib/auth-identity.ts';

test('accepts a case insensitive username', () => {
  assert.deepEqual(parseLoginIdentifier(' SuperAdmin '), { username: 'superadmin' });
});

test('accepts an email address', () => {
  assert.deepEqual(parseLoginIdentifier(' MOTHER@EXAMPLE.COM '), { email: 'mother@example.com' });
});

test('rejects malformed identifiers', () => {
  assert.equal(parseLoginIdentifier('a'), null);
  assert.equal(parseLoginIdentifier('someone@'), null);
  assert.equal(parseLoginIdentifier('name with spaces'), null);
});

test('login only returns to pages inside the website', async () => {
  const { safeCallbackPath } = await import('../src/lib/auth-identity.ts');
  assert.equal(safeCallbackPath('/orders?tab=to-review'), '/orders?tab=to-review');
  assert.equal(safeCallbackPath('/products/vay-hoa#reviews'), '/products/vay-hoa#reviews');
  for (const unsafe of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/a b', '', null]) {
    assert.equal(safeCallbackPath(unsafe), null, `${unsafe} must be rejected`);
  }
});
