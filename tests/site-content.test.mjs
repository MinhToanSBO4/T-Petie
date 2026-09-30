import test from 'node:test';
import assert from 'node:assert/strict';
import { orderHomeBlocks, parseCategoryPages, parseHomeFeatures, parseHomeFeaturesSection, parseHomeHero, parseHomeLayout, parseHomeSections, parseSizeGuide } from '../src/lib/content/site-content.ts';

test('home features are read from structured records and reject unsafe image URLs', () => {
  const record = { id: 'fabric', src: 'https://res.cloudinary.com/demo/image/upload/fabric.jpg', icon: '🌿', title: 'Fabric',
    description: 'A product claim.', objectPosition: 'center 20%' };
  assert.deepEqual(parseHomeFeatures([record]), [record]);
  assert.throws(() => parseHomeFeatures([{ ...record, src: 'javascript:alert(1)' }]));
  assert.throws(() => parseHomeFeatures([{ ...record, src: '/images/fabric.jpg' }]));
});

test('home feature section keeps legacy arrays working and reads configured headings', () => {
  const record = { id: 'fabric', src: 'https://res.cloudinary.com/demo/image/upload/fabric.jpg', icon: '🌿', title: 'Fabric',
    description: 'A product claim.', objectPosition: 'center 20%' };
  assert.deepEqual(parseHomeFeaturesSection([record]), { eyebrow: '', title: '', items: [record] });
  assert.deepEqual(parseHomeFeaturesSection({ eyebrow: 'Chất lượng', title: 'Khác biệt', items: [record] }),
    { eyebrow: 'Chất lượng', title: 'Khác biệt', items: [record] });
});

test('category pages accept only known page ids and Cloudinary image sources', () => {
  const item = { id: 'tops', title: 'Áo bé gái', description: 'Mô tả', imageAlt: 'Ảnh áo',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/ao.jpg' };
  assert.deepEqual(parseCategoryPages({ items: [item] }), { items: [item] });
  assert.deepEqual(parseCategoryPages({ items: [{ ...item, imageUrl: '' }] }), { items: [{ ...item, imageUrl: '' }] });
  assert.throws(() => parseCategoryPages({ items: [{ ...item, id: 'khong-ton-tai' }] }));
  assert.throws(() => parseCategoryPages({ items: [{ ...item, imageUrl: 'http://insecure.example/a.jpg' }] }));
  assert.throws(() => parseCategoryPages({ items: [{ ...item, imageUrl: '/images/ao.jpg' }] }));
});

test('size guide requires complete rows and textual tips', () => {
  const row = { size: '90', age: '1-2', weight: '10 kg', height: '90 cm' };
  assert.deepEqual(parseSizeGuide({ baby: [row], kids: [row], tips: ['Measure first'] }),
    { baby: [row], kids: [row], tips: ['Measure first'] });
  assert.throws(() => parseSizeGuide({ baby: [{ ...row, height: null }], kids: [], tips: [] }));
});

test('home layout keeps every block exactly once so drag and drop cannot hide content', () => {
  const order = ['hero', 'sale', 'bestSellers', 'collections', 'features', 'testimonials'];
  assert.deepEqual(parseHomeLayout({ order }), { order });
  assert.throws(() => parseHomeLayout({ order: ['hero', 'sale', 'bestSellers', 'collections', 'features', 'features'] }));
  assert.throws(() => parseHomeLayout({ order: ['hero', 'sale'] }));
});

test('home block rendering follows the saved order in document order', () => {
  const blocks = { hero: 'Hero', bestSellers: 'Best sellers', sale: 'Sale', collections: 'Collections', features: 'Features', testimonials: 'Testimonials' };
  assert.deepEqual(orderHomeBlocks(blocks, ['testimonials', 'hero', 'sale', 'bestSellers', 'collections', 'features']),
    ['Testimonials', 'Hero', 'Sale', 'Best sellers', 'Collections', 'Features']);
});

test('home block image fields only accept images from the managed media library', () => {
  const imageUrl = 'https://res.cloudinary.com/demo/image/upload/home-block.jpg';
  assert.equal(parseHomeHero({ shopLabel: '', shopHref: '', lookbookLabel: '', lookbookHref: '', defaultBadge: '', imageUrl, imageAlt: 'Banner chính' }).imageUrl, imageUrl);
  assert.equal(parseHomeSections({
    bestSellers: { title: '', linkLabel: '', linkHref: '', imageUrl, imageAlt: 'Bán chạy' },
    sale: { title: '', linkLabel: '', linkHref: '', imageUrl: '', imageAlt: '' },
    collections: { title: '', linkLabel: '', linkHref: '', eyebrow: '', imageUrl: '', imageAlt: '' },
  }).bestSellers.imageUrl, imageUrl);
  assert.throws(() => parseHomeHero({ shopLabel: '', shopHref: '', lookbookLabel: '', lookbookHref: '', defaultBadge: '', imageUrl: 'https://example.test/image.jpg', imageAlt: '' }));
});
