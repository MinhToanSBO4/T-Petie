const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/server-loader.cjs');
const { HOME_PRODUCT_LIMITS, homeBlockProducts, homeBlockVisibility, homeNavItems } = require('../src/lib/content/home-blocks.ts');

// Danh sách theo thứ tự mới nhất trước, như getProducts().
const product = (id, fields = {}) => ({ id, basePrice: 100_000, discountPercent: 0, isSale: false, isBestSeller: false, ...fields });
const ids = (products) => products.map((item) => item.id);
const catalog = [
  product('collection-new', { isBestSeller: true }),
  product('mooncake', { isSale: true, isBestSeller: true, originalPrice: 110_000, discountPercent: 10 }),
  product('card-51', { isSale: true, originalPrice: 204_000, discountPercent: 51 }),
  product('card-fixed-price', { isSale: true }),
  product('card-34', { isSale: true, originalPrice: 151_515, discountPercent: 34 }),
  product('price-drop-only', { originalPrice: 125_000 }),
  product('collection-old', { isBestSeller: true }),
];
const sections = {
  bestSellers: { title: 'Bán chạy nhất', productIds: [] }, sale: { title: 'Đang ưu đãi', productIds: [] },
  collections: { title: '', productIds: [] },
};
const allVisible = { hero: true, bestSellers: true, sale: true, collections: true, features: true, testimonials: true };

test('the sale block follows the /sale page: anything discounted, biggest discount first, then newest', () => {
  assert.deepEqual(ids(homeBlockProducts('sale', catalog)), ['card-51', 'card-34', 'price-drop-only', 'mooncake', 'card-fixed-price']);
});

test('the best seller block only takes products tagged as best sellers, newest first', () => {
  assert.deepEqual(ids(homeBlockProducts('bestSellers', catalog)), ['collection-new', 'mooncake', 'collection-old']);
  const many = Array.from({ length: 20 }, (_, index) => product(`p${index}`, { isBestSeller: true, isSale: true }));
  assert.equal(homeBlockProducts('bestSellers', many).length, HOME_PRODUCT_LIMITS.bestSellers);
  assert.equal(homeBlockProducts('sale', many).length, HOME_PRODUCT_LIMITS.sale);
});

test('products picked by the admin win, in the picked order, skipping ones no longer on sale', () => {
  assert.deepEqual(ids(homeBlockProducts('bestSellers', catalog, ['card-34', 'deleted', 'collection-old'])), ['card-34', 'collection-old']);
  const picked = Array.from({ length: 12 }, (_, index) => `p${index}`);
  const many = picked.map((id) => product(id));
  assert.deepEqual(ids(homeBlockProducts('sale', many, picked)), picked.slice(0, HOME_PRODUCT_LIMITS.sale));
  // Mọi sản phẩm đã chọn đều ngừng bán: khối quay về danh sách tự động thay vì biến mất.
  assert.deepEqual(ids(homeBlockProducts('bestSellers', catalog, ['deleted'])), ['collection-new', 'mooncake', 'collection-old']);
});

test('blocks with nothing to show are hidden, the hero also shows for its own slides', () => {
  const empty = { collections: [], bestSellers: [], sale: [], feedback: [] };
  assert.deepEqual(homeBlockVisibility(empty),
    { hero: false, bestSellers: false, sale: false, collections: false, features: false, testimonials: false });
  assert.equal(homeBlockVisibility({ ...empty, hero: { imageUrl: '', slides: [{}] } }).hero, true);
  assert.equal(homeBlockVisibility({ ...empty, collections: [{}] }).hero, true);
  assert.equal(homeBlockVisibility({ ...empty, features: { items: [{}] } }).features, true);
  assert.equal(homeBlockVisibility({ ...empty, sale: [{}] }).sale, true);
});

test('the "Trang Chủ" menu lists visible blocks in the saved order with their configured titles', () => {
  const order = ['hero', 'sale', 'testimonials', 'collections', 'bestSellers', 'features'];
  assert.deepEqual(homeNavItems(order, sections, allVisible), [
    { label: 'Đang ưu đãi', href: '/#flash-sale' },
    { label: 'Bộ sưu tập nổi bật', href: '/#collections' },
    { label: 'Bán chạy nhất', href: '/#best-seller' },
  ]);
  assert.deepEqual(homeNavItems(order, sections, { ...allVisible, bestSellers: false }).map((item) => item.href),
    ['/#flash-sale', '/#collections']);
  assert.deepEqual(homeNavItems(order, null, allVisible).map((item) => item.label),
    ['Sản phẩm ưu đãi', 'Bộ sưu tập nổi bật', 'Sản phẩm bán chạy']);
});
