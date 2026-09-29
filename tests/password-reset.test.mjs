import test from 'node:test';
import assert from 'node:assert/strict';
import { createTemporaryPassword, credentialFingerprint } from '../src/server/security/password-reset.ts';

test('temporary passwords are strong and unique', () => {
  const first = createTemporaryPassword();
  const second = createTemporaryPassword();
  assert.ok(first.length >= 24);
  assert.notEqual(first, second);
});

test('changing the stored password invalidates its session fingerprint', () => {
  const before = credentialFingerprint('hash-one', 'test-secret');
  assert.equal(before, credentialFingerprint('hash-one', 'test-secret'));
  assert.notEqual(before, credentialFingerprint('hash-two', 'test-secret'));
});
