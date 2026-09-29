import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCartSelection } from '../src/lib/cart-selection.ts';

test('items hydrated after first render become selected by default', () => {
  assert.deepEqual([...reconcileCartSelection([], ['a'], new Set())], ['a']);
});

test('changing cart items preserves intentional deselection', () => {
  assert.deepEqual([...reconcileCartSelection(['a', 'b'], ['a', 'b', 'c'], new Set(['a']))], ['a', 'c']);
});
