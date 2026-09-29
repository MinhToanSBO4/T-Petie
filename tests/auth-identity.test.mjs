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
