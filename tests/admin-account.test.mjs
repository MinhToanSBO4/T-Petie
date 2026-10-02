import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import adminAccount from '../scripts/lib/admin-account.cjs';

const { normalizeAdminAccount, validatePassword, validateUsername } = adminAccount;
const valid = { email: ' Owner@Example.com ', username: 'Owner_01', name: '', password: 'A-long-unique-password-123' };

test('admin account input is normalized', () => {
  assert.deepEqual(normalizeAdminAccount(valid), {
    email: 'owner@example.com', username: 'owner_01', name: 'owner_01', password: valid.password,
  });
});

test('admin account rejects invalid and weak credentials', () => {
  assert.throws(() => normalizeAdminAccount({ ...valid, email: 'not-an-email' }));
  assert.throws(() => normalizeAdminAccount({ ...valid, password: 'short' }));
  assert.notEqual(validatePassword('owner_01-and-more-text', { username: 'owner_01' }), null);
  assert.notEqual(validateUsername('1admin'), null);
  assert.equal(validateUsername('admin_1'), null);
});

test('admin and staff accounts are never read from environment variables', () => {
  for (const file of ['../scripts/create-admin.cjs', '../scripts/lib/test-login.cjs', '../scripts/smoke-local.cjs',
    '../scripts/check-staff-reset.cjs', '../scripts/check-commerce.cjs', '../scripts/check-order-flow.cjs',
    '../scripts/check-new-product-flow.cjs', '../scripts/measure-admin.cjs', '../.env.example']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /(ADMIN|STAFF)_(EMAIL|USERNAME|NAME|INITIAL_PASSWORD|PASSWORD)/, file);
  }
});
