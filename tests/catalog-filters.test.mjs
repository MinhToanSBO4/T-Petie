import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeFilterCount, catalogFacets, catalogParams, colorFamily, EMPTY_FILTERS, filterCatalog, normalizeText,
  parseCatalogParams, searchCatalog, sortCatalog,
} from '../src/lib/catalog/filters.ts';

const size = (label, price, stock, weightRange = '', ageRange = '') => ({ size: label, price, stock, weightRange, ageRange });
const product = (overrides) => ({
  id: overrides.slug, slug: overrides.slug, sku: overrides.slug.toUpperCase(), name: 'Sản phẩm', category: 'girls', categoryName: 'Thời trang bé gái',
  material: '', materialFeatures: [], images: [], thumbnail: '', description: '', careInstructions: [], origin: 'Việt Nam',
  rating: 0, reviewCount: 0, sizes: [size('Size 90', 200000, 3, '10 - 12kg', '1 - 2 tuổi')], basePrice: 200000, ...overrides,
});

const catalog = [
  product({ slug: 'ao-so-mi', name: 'Áo Sơ Mi Cổ Sen', subcategory: 'ao', basePrice: 180000, colorName: 'Trắng Kem',
    collectionId: 'hoc-xinh-kem', collectionName: 'Học Xinh Kem',
    sizes: [size('Size 90', 180000, 0, '10 - 12kg', '1 - 2 tuổi'), size('Size 100', 220000, 4, '13 - 15kg', '2 - 4 tuổi')] }),
  product({ slug: 'vay-cong-chua', name: 'Váy Công Chúa Hồng', subcategory: 'vay', basePrice: 350000, originalPrice: 420000, isSale: true,
    colorName: 'Hồng Pastel', collectionId: 'ha-mat', collectionName: 'Hạ Mật', rating: 4.8, reviewCount: 6,
    sizes: [size('Size 100', 350000, 2, '13 - 15kg', '2 - 4 tuổi'), size('Size 110', 380000, 1, '16 - 20kg', '4 - 5 tuổi')] }),
  product({ slug: 'set-do-dui', name: 'Set Đồ Đũi Organic', subcategory: 'set-do', basePrice: 450000, colorName: 'Cam Cháy & Trắng Kem',
    material: 'Thô đũi organic', collectionId: 'ha-mat', collectionName: 'Hạ Mật', isNewArrival: true,
    sizes: [size('Size 110', 450000, 0, '16 - 20kg', '4 - 5 tuổi')] }),
  product({ slug: 'quan-bloomer', name: 'Quần Bloomer', subcategory: 'quan', basePrice: 150000, colorName: 'Xanh Navy', isBestSeller: true,
    sizes: [size('Size 90', 150000, 5, '10 - 12kg', '1 - 2 tuổi')] }),
];
const filters = (overrides = {}) => ({ ...EMPTY_FILTERS, ...overrides });
const slugs = (list) => list.map((item) => item.slug);

test('search ignores accents and case, needs every word and ranks name matches first', () => {
  assert.equal(normalizeText('Áo Sơ Mi Đũi  ORGANIC!'), 'ao so mi dui organic');
  assert.deepEqual(slugs(searchCatalog(catalog, 'ao so mi')), ['ao-so-mi']);
  assert.deepEqual(slugs(searchCatalog(catalog, 'DŨI')), ['set-do-dui'], 'matches without typing the exact accents');
  assert.deepEqual(slugs(searchCatalog(catalog, 'ha mat')), ['vay-cong-chua', 'set-do-dui'], 'collection names are searchable');
  assert.deepEqual(slugs(searchCatalog(catalog, 'organic')), ['set-do-dui']);
  assert.deepEqual(searchCatalog(catalog, 'vay xanh'), [], 'all words must match');
  assert.equal(searchCatalog(catalog, '   ').length, catalog.length);
});

test('URL parameters round-trip and unknown values are ignored', () => {
  const parsed = parseCatalogParams(new URLSearchParams('price=lt200,bogus&min=400000&max=100000&size=Size%2090&sort=hack&stock=1&color=hong,nope&type=vay,x'));
  assert.deepEqual(parsed.price, ['lt200']);
  assert.equal(parsed.min, 100000, 'a reversed custom range is swapped');
  assert.equal(parsed.max, 400000);
  assert.deepEqual(parsed.sizes, ['Size 90']);
  assert.equal(parsed.sort, 'newest');
  assert.deepEqual(parsed.colors, ['hong']);
  assert.deepEqual(parsed.types, ['vay']);
  assert.equal(parsed.inStock, true);
  assert.equal(catalogParams(parsed), 'price=lt200&min=100000&max=400000&size=Size+90&color=hong&type=vay&stock=1');
  assert.equal(catalogParams(EMPTY_FILTERS), '');
  assert.equal(activeFilterCount(parsed), 6, 'price preset, custom range, size, colour, type and in-stock');
});

test('filters combine with OR inside a group and AND across groups', () => {
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ price: ['lt200', 'gt400'] }))), ['ao-so-mi', 'set-do-dui', 'quan-bloomer']);
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ price: ['lt200'], types: ['quan'] }))), ['quan-bloomer']);
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ collections: ['ha-mat'], sale: true }))), ['vay-cong-chua']);
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ colors: ['trang', 'xanh'] }))), ['ao-so-mi', 'quan-bloomer']);
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ rating4: true }))), ['vay-cong-chua']);
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ isNew: true }))), ['set-do-dui']);
});

test('size, stock and price filters use the chosen size', () => {
  // Size 90 của áo sơ mi đã hết hàng: khi lọc còn hàng, áo chỉ khớp nếu chọn size còn hàng.
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ sizes: ['Size 90'], inStock: true }))), ['quan-bloomer']);
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ sizes: ['Size 90'] }))), ['ao-so-mi', 'quan-bloomer']);
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ inStock: true }))), ['ao-so-mi', 'vay-cong-chua', 'quan-bloomer']);
  // Áo sơ mi giá từ 180k, nhưng size 100 giá 220k: lọc dưới 200k với size 100 thì loại áo.
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ sizes: ['Size 100'], price: ['lt200'] }))), []);
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ min: 200000, max: 400000 }))), ['vay-cong-chua']);
});

test('sorting keeps the catalog order for ties and search relevance for the default sort', () => {
  assert.deepEqual(slugs(sortCatalog(catalog, 'price-asc')), ['quan-bloomer', 'ao-so-mi', 'vay-cong-chua', 'set-do-dui']);
  assert.deepEqual(slugs(sortCatalog(catalog, 'discount')).slice(0, 1), ['vay-cong-chua']);
  assert.deepEqual(slugs(sortCatalog(catalog, 'best-seller')).slice(0, 1), ['quan-bloomer']);
  assert.deepEqual(slugs(filterCatalog(catalog, filters({ q: 'hong' }))), ['vay-cong-chua']);
});

test('facet counts ignore their own group so other options stay selectable', () => {
  const facets = catalogFacets(catalog, filters({ sizes: ['Size 90'] }));
  assert.deepEqual(facets.sizes.map((option) => [option.value, option.count]),
    [['Size 90', 2], ['Size 100', 2], ['Size 110', 2]]);
  assert.equal(facets.sizes[0].hint, '10 - 12kg · 1 - 2 tuổi');
  assert.deepEqual(facets.types.map((option) => [option.value, option.count]), [['ao', 1], ['quan', 1], ['vay', 0], ['set-do', 0]],
    'options without results for the current filters stay visible with a zero count');
  assert.equal(facets.sale, 0);
  assert.deepEqual(facets.priceRange, { min: 150000, max: 450000 });
  const empty = catalogFacets(catalog, filters({ q: 'quan' }));
  assert.deepEqual(empty.collections, [], 'collections absent from the searched products are hidden');
});

test('colour families follow the first colour named', () => {
  assert.equal(colorFamily('Cam Cháy & Trắng Kem'), 'cam-do');
  assert.equal(colorFamily('Vàng Trăng Non & Be Kem'), 'vang');
  assert.equal(colorFamily('Kẻ Ô Ly Vintage'), 'hoa-tiet');
  assert.equal(colorFamily('Navy Đậm'), 'xanh');
  assert.equal(colorFamily('Đỏ Ruby & Xanh Cốm'), 'cam-do');
  assert.equal(colorFamily('Nâu Be Trầm Ấm'), 'nau-xam');
  assert.equal(colorFamily(undefined), null);
});
