import test from 'node:test';
import assert from 'node:assert/strict';
import { findRequestedVariant } from '../src/lib/orders/variant-match.ts';

const variants = [{ id: 'one', productId: 'p', size: 'Size 1' }, { id: 'free', productId: 'p', size: 'Freesize (1 - 6 tuổi)' }];

test('matches the exact size even when its real name contains parentheses', () => {
  assert.equal(findRequestedVariant(variants, 'p', 'Freesize (1 - 6 tuổi)')?.id, 'free');
});

test('accepts the legacy cart label with appended weight range', () => {
  assert.equal(findRequestedVariant(variants, 'p', 'Size 1 (8 - 10kg)')?.id, 'one');
});
