import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHomeFeatures, parseSizeGuide } from '../src/lib/content/site-content.ts';

test('home features are read from structured records and reject unsafe image URLs', () => {
  const record = { id: 'fabric', src: '/images/fabric.jpg', icon: '🌿', title: 'Fabric',
    description: 'A product claim.', objectPosition: 'center 20%' };
  assert.deepEqual(parseHomeFeatures([record]), [record]);
  assert.throws(() => parseHomeFeatures([{ ...record, src: 'javascript:alert(1)' }]));
});

test('size guide requires complete rows and textual tips', () => {
  const row = { size: '90', age: '1-2', weight: '10 kg', height: '90 cm' };
  assert.deepEqual(parseSizeGuide({ baby: [row], kids: [row], tips: ['Measure first'] }),
    { baby: [row], kids: [row], tips: ['Measure first'] });
  assert.throws(() => parseSizeGuide({ baby: [{ ...row, height: null }], kids: [], tips: [] }));
});
