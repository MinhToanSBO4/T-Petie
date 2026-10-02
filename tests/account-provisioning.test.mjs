import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProvisioningAccounts } from '../prisma/provisioning-config.ts';

const valid = { ADMIN_EMAIL: 'admin@example.com', ADMIN_USERNAME: 'owner_01',
  ADMIN_INITIAL_PASSWORD: 'A-long-unique-password-123', ADMIN_NAME: 'Store owner',
  STAFF_EMAIL: 'staff@example.com', STAFF_USERNAME: 'team_01',
  STAFF_INITIAL_PASSWORD: 'Another-long-password-456', STAFF_NAME: 'Team member' };

test('admin and staff accounts are created only from environment values', () => {
  const accounts = parseProvisioningAccounts(valid);
  assert.deepEqual(accounts.map(({ role, username }) => ({ role, username })), [
    { role: 'admin', username: 'owner_01' }, { role: 'staff', username: 'team_01' },
  ]);
  assert.equal(accounts[0].name, 'Store owner');
});

test('provisioning rejects missing, duplicate and weak credentials', () => {
  assert.throws(() => parseProvisioningAccounts({ ...valid, ADMIN_INITIAL_PASSWORD: '' }));
  assert.throws(() => parseProvisioningAccounts({ ...valid, STAFF_USERNAME: 'owner_01' }));
  assert.throws(() => parseProvisioningAccounts({ ...valid, STAFF_INITIAL_PASSWORD: 'weak' }));
  assert.equal(parseProvisioningAccounts({ ADMIN_EMAIL: valid.ADMIN_EMAIL, ADMIN_USERNAME: valid.ADMIN_USERNAME,
    ADMIN_INITIAL_PASSWORD: valid.ADMIN_INITIAL_PASSWORD }).length, 1);
});
