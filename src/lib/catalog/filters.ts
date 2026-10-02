import type { Product, ProductSubcategory } from '@/types/product';

/** Các trường của sản phẩm mà tìm kiếm, bộ lọc và sắp xếp cần (máy chủ lọc trên danh sách đã cache). */
export type CatalogEntry = Pick<Product, 'name' | 'categoryName' | 'subcategory' | 'subcategoryName' | 'collectionId'
  | 'collectionName' | 'material' | 'materialFeatures' | 'colorName' | 'sku' | 'description' | 'sizes' | 'basePrice'
  | 'originalPrice' | 'discountPercent' | 'isSale' | 'isNewArrival' | 'isBestSeller' | 'rating' | 'reviewCount'>;

/**
 * Bộ lọc và tìm kiếm danh mục sản phẩm, chạy trên danh sách sản phẩm đã cache ở trình duyệt (vài trăm sản phẩm),
 * nên đổi bộ lọc không gọi lại máy chủ. Theo khuyến nghị của Baymard: chọn được nhiều giá trị trong một nhóm
 * (kết hợp OR trong nhóm, AND giữa các nhóm), khoảng giá có mốc sẵn và ô tự nhập, số sản phẩm cạnh từng lựa chọn,
 * ẩn lựa chọn không có sản phẩm, trạng thái lọc nằm trên URL để chia sẻ và bấm "Quay lại" không mất bộ lọc.
 */

/** Chữ thường, bỏ dấu, đ → d: gõ "ao so sinh" vẫn tìm thấy "Áo sơ sinh". */
export function normalizeText(value: string) {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Mốc chia theo phân bố giá thật của catalog (135k–530k, trung vị ~350k); nhãn "k" ngắn gọn, không bị cắt chữ trên điện thoại.
export const PRICE_PRESETS = [
  { value: 'lt200', label: 'Dưới 200k', min: 0, max: 199_999 },
  { value: '200-300', label: '200k – 300k', min: 200_000, max: 300_000 },
  { value: '300-400', label: '300k – 400k', min: 300_001, max: 400_000 },
  { value: 'gt400', label: 'Trên 400k', min: 400_001, max: Number.MAX_SAFE_INTEGER },
] as const;
export type PricePreset = (typeof PRICE_PRESETS)[number]['value'];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best-seller', label: 'Bán chạy' },
  { value: 'price-asc', label: 'Giá: Thấp đến Cao' },
  { value: 'price-desc', label: 'Giá: Cao đến Thấp' },
  { value: 'discount', label: 'Giảm giá nhiều nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]['value'];

export const TYPE_OPTIONS: { value: ProductSubcategory; label: string }[] = [
  { value: 'ao', label: 'Áo' }, { value: 'quan', label: 'Quần' }, { value: 'vay', label: 'Váy' }, { value: 'set-do', label: 'Set đồ' },
];

/** Nhóm màu chủ đạo, lấy theo màu được nhắc đầu tiên trong tên màu (ví dụ "Cam Cháy & Trắng Kem" thuộc nhóm Cam). */
export const COLOR_FAMILIES = [
  { value: 'trang', label: 'Trắng & Kem', hex: '#F8F4EA', words: ['trang', 'kem', 'be', 'sua'] },
  { value: 'hong', label: 'Hồng', hex: '#F4B6C2', words: ['hong'] },
  { value: 'vang', label: 'Vàng', hex: '#F6D365', words: ['vang'] },
  { value: 'cam-do', label: 'Cam & Đỏ', hex: '#E8744F', words: ['cam', 'do'] },
  { value: 'xanh', label: 'Xanh', hex: '#6F9BD1', words: ['xanh', 'navy', 'denim', 'jean', 'matcha'] },
  { value: 'nau-xam', label: 'Nâu & Xám', hex: '#A68A6D', words: ['nau', 'xam', 'ghi'] },
  { value: 'hoa-tiet', label: 'Họa tiết', hex: 'conic-gradient(#F4B6C2, #F6D365, #6F9BD1, #F4B6C2)', words: ['hoa tiet', 'ke', 'caro', 'cham bi', 'soc'] },
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number]['value'];

export function colorFamily(colorName: string | undefined): ColorFamily | null {
  if (!colorName) return null;
  const words = ` ${normalizeText(colorName)} `;
  let best: { family: ColorFamily; at: number } | null = null;
  for (const family of COLOR_FAMILIES) {
    for (const word of family.words) {
      const at = words.indexOf(` ${word} `);
      if (at >= 0 && (!best || at < best.at)) best = { family: family.value, at };
    }
  }
  return best?.family ?? null;
}

export type CatalogFilters = {
  q: string;
  price: PricePreset[];
  /** Khoảng giá tự nhập (đồng). */
  min: number | null;
  max: number | null;
  sizes: string[];
  colors: ColorFamily[];
  collections: string[];
  types: ProductSubcategory[];
  inStock: boolean;
  sale: boolean;
  isNew: boolean;
  rating4: boolean;
  sort: SortKey;
  /** Trang kết quả (bắt đầu từ 1). */
  page: number;
};

export const EMPTY_FILTERS: CatalogFilters = {
  q: '', price: [], min: null, max: null, sizes: [], colors: [], collections: [], types: [],
  inStock: false, sale: false, isNew: false, rating4: false, sort: 'newest', page: 1,
};

/** Số sản phẩm mỗi trang: chia hết cho lưới 2, 3 và 4 cột. */
export const CATALOG_PAGE_SIZE = 24;

type ParamsLike = { get(name: string): string | null };
const list = (value: string | null) => (value || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 20);
const amount = (value: string | null) => {
  const number = Number((value || '').replace(/\D/g, ''));
  return value && Number.isSafeInteger(number) && number > 0 ? number : null;
};

/** Đọc bộ lọc từ URL; giá trị lạ bị bỏ qua thay vì làm hỏng trang. `defaultSort` là cách sắp xếp khi URL không ghi. */
export function parseCatalogParams(params: ParamsLike, defaultSort: SortKey = 'newest'): CatalogFilters {
  const price = list(params.get('price')).filter((value): value is PricePreset => PRICE_PRESETS.some((preset) => preset.value === value));
  const colors = list(params.get('color')).filter((value): value is ColorFamily => COLOR_FAMILIES.some((family) => family.value === value));
  const types = list(params.get('type')).filter((value): value is ProductSubcategory => TYPE_OPTIONS.some((option) => option.value === value));
  const sort = params.get('sort');
  let min = amount(params.get('min'));
  let max = amount(params.get('max'));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const page = Number(params.get('page'));
  return {
    q: (params.get('q') || '').trim().slice(0, 100), price, min, max,
    sizes: list(params.get('size')).map((size) => size.slice(0, 50)),
    colors, collections: list(params.get('collection')).map((slug) => slug.slice(0, 100)), types,
    inStock: params.get('stock') === '1', sale: params.get('sale') === '1', isNew: params.get('new') === '1',
    rating4: params.get('rating') === '4',
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort as SortKey : defaultSort,
    page: Number.isSafeInteger(page) && page > 1 && page <= 1000 ? page : 1,
  };
}

/** Đọc bộ lọc từ `searchParams` của trang Next.js (giá trị có thể là mảng khi tham số lặp lại). */
export function catalogParamsFrom(searchParams: Record<string, string | string[] | undefined>): ParamsLike {
  return { get: (name) => { const value = searchParams[name]; return Array.isArray(value) ? value[0] ?? null : value ?? null; } };
}

/** Ghi bộ lọc ra chuỗi truy vấn, bỏ qua giá trị mặc định để URL ngắn gọn. */
export function catalogParams(filters: CatalogFilters, defaultSort: SortKey = 'newest'): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.price.length) params.set('price', filters.price.join(','));
  if (filters.min !== null) params.set('min', String(filters.min));
  if (filters.max !== null) params.set('max', String(filters.max));
  if (filters.sizes.length) params.set('size', filters.sizes.join(','));
  if (filters.colors.length) params.set('color', filters.colors.join(','));
  if (filters.collections.length) params.set('collection', filters.collections.join(','));
  if (filters.types.length) params.set('type', filters.types.join(','));
  if (filters.inStock) params.set('stock', '1');
  if (filters.sale) params.set('sale', '1');
  if (filters.isNew) params.set('new', '1');
  if (filters.rating4) params.set('rating', '4');
  if (filters.sort !== defaultSort) params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

/** Số bộ lọc đang áp dụng (không tính từ khóa và cách sắp xếp), hiện trên nút "Bộ lọc". */
export function activeFilterCount(filters: CatalogFilters) {
  return filters.price.length + (filters.min !== null || filters.max !== null ? 1 : 0) + filters.sizes.length
    + filters.colors.length + filters.collections.length + filters.types.length
    + [filters.inStock, filters.sale, filters.isNew, filters.rating4].filter(Boolean).length;
}

export const isOnSale = (product: CatalogEntry) => Boolean(product.isSale || (product.originalPrice && product.originalPrice > product.basePrice));
export function discountOf(product: CatalogEntry) {
  if (product.originalPrice && product.originalPrice > product.basePrice) {
    return Math.round((1 - product.basePrice / product.originalPrice) * 100);
  }
  return product.discountPercent || 0;
}

/** Giá dùng để lọc: khi đã chọn size thì lấy giá thấp nhất trong các size đó (giá thay đổi theo size), không thì giá khởi điểm. */
function priceFor(product: CatalogEntry, sizes: string[]) {
  if (!sizes.length) return product.basePrice;
  const prices = product.sizes.filter((option) => sizes.includes(option.size)).map((option) => option.price);
  return prices.length ? Math.min(...prices) : product.basePrice;
}

type Group = 'price' | 'sizes' | 'colors' | 'collections' | 'types' | 'flags';

/** Sản phẩm có thỏa mọi nhóm bộ lọc không; `skip` bỏ qua một nhóm (để đếm số sản phẩm cho từng lựa chọn của nhóm đó). */
function matches(product: CatalogEntry, filters: CatalogFilters, skip?: Group) {
  if (skip !== 'sizes' && filters.sizes.length) {
    const hasSize = product.sizes.some((option) => filters.sizes.includes(option.size) && (!filters.inStock || option.stock > 0));
    if (!hasSize) return false;
  }
  if (skip !== 'flags') {
    if (filters.inStock && !product.sizes.some((option) => option.stock > 0)) return false;
    if (filters.sale && !isOnSale(product)) return false;
    if (filters.isNew && !product.isNewArrival) return false;
    if (filters.rating4 && !(product.reviewCount > 0 && product.rating >= 4)) return false;
  }
  if (skip !== 'price') {
    const price = priceFor(product, filters.sizes);
    if (filters.price.length && !filters.price.some((value) => {
      const preset = PRICE_PRESETS.find((item) => item.value === value)!;
      return price >= preset.min && price <= preset.max;
    })) return false;
    if (filters.min !== null && price < filters.min) return false;
    if (filters.max !== null && price > filters.max) return false;
  }
  if (skip !== 'colors' && filters.colors.length && !filters.colors.includes(colorFamily(product.colorName) as ColorFamily)) return false;
  if (skip !== 'collections' && filters.collections.length && !filters.collections.includes(product.collectionId || '')) return false;
  if (skip !== 'types' && filters.types.length && !filters.types.includes(product.subcategory as ProductSubcategory)) return false;
  return true;
}

/** Điểm khớp từ khóa (0 = không khớp). Mọi từ phải xuất hiện; khớp ở tên sản phẩm được xếp trước. */
function searchScore(product: CatalogEntry, tokens: string[], phrase: string) {
  const name = normalizeText(product.name);
  const other = normalizeText([product.categoryName, product.subcategoryName, product.collectionName, product.material,
    ...(product.materialFeatures || []), product.colorName, product.sku, product.description].filter(Boolean).join(' '));
  let score = 0;
  for (const token of tokens) {
    if (name.includes(token)) score += 3;
    else if (other.includes(token)) score += 1;
    else return 0;
  }
  if (name.startsWith(phrase)) score += 4;
  else if (name.includes(phrase)) score += 2;
  return score;
}

/** Tìm theo từ khóa không dấu; giữ thứ tự gốc khi không có từ khóa. */
export function searchCatalog<T extends CatalogEntry>(products: T[], query: string): T[] {
  const phrase = normalizeText(query);
  if (!phrase) return products;
  const tokens = phrase.split(' ');
  return products.map((product, index) => ({ product, index, score: searchScore(product, tokens, phrase) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.product);
}

export function sortCatalog<T extends CatalogEntry>(products: T[], sort: SortKey): T[] {
  const indexed = products.map((product, index) => ({ product, index }));
  const compare: Record<SortKey, (a: typeof indexed[number], b: typeof indexed[number]) => number> = {
    newest: (a, b) => a.index - b.index,
    'best-seller': (a, b) => Number(Boolean(b.product.isBestSeller)) - Number(Boolean(a.product.isBestSeller)) || a.index - b.index,
    'price-asc': (a, b) => a.product.basePrice - b.product.basePrice || a.index - b.index,
    'price-desc': (a, b) => b.product.basePrice - a.product.basePrice || a.index - b.index,
    discount: (a, b) => discountOf(b.product) - discountOf(a.product) || a.index - b.index,
    rating: (a, b) => (b.product.rating || 0) - (a.product.rating || 0) || b.product.reviewCount - a.product.reviewCount || a.index - b.index,
  };
  return indexed.sort(compare[sort]).map((item) => item.product);
}

/** Danh sách sau tìm kiếm + lọc + sắp xếp. Khi có từ khóa mà chọn "Mới nhất" thì ưu tiên độ khớp. */
export function filterCatalog<T extends CatalogEntry>(products: T[], filters: CatalogFilters): T[] {
  const searched = searchCatalog(products, filters.q);
  const filtered = searched.filter((product) => matches(product, filters));
  return filters.q && filters.sort === 'newest' ? filtered : sortCatalog(filtered, filters.sort);
}

export type FacetOption = { value: string; label: string; count: number; hint?: string; swatch?: string };
export type CatalogFacets = {
  price: FacetOption[]; sizes: FacetOption[]; colors: FacetOption[]; collections: FacetOption[]; types: FacetOption[];
  inStock: number; sale: number; isNew: number; rating4: number;
  priceRange: { min: number; max: number } | null;
};

const sizeNumber = (size: string) => Number(size.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);

/** Thứ tự size theo số ("Size 90" trước "Size 100", database chỉ so chuỗi); nhãn không có số như "Người lớn" xếp cuối. */
export function compareSizeLabels(a: string, b: string) {
  return sizeNumber(a) - sizeNumber(b) || a.localeCompare(b, 'vi');
}

/**
 * Lựa chọn của từng nhóm kèm số sản phẩm nếu chọn thêm lựa chọn đó (tính với các nhóm còn lại đang áp dụng).
 * Chỉ hiện lựa chọn có sản phẩm trong danh mục đang xem; lựa chọn tạm thời 0 kết quả vẫn hiện (giao diện làm mờ)
 * để bố cục không nhảy khi đổi bộ lọc, và lựa chọn đang chọn luôn hiện để bỏ chọn được.
 */
export function catalogFacets(products: CatalogEntry[], filters: CatalogFilters): CatalogFacets {
  const pool = searchCatalog(products, filters.q);
  const within = (group: Group) => pool.filter((product) => matches(product, filters, group));
  const options = <T>(items: readonly T[], selected: string[], value: (item: T) => string, test: (product: CatalogEntry, item: T) => boolean,
    base: CatalogEntry[], extra: (item: T) => Omit<FacetOption, 'value' | 'count'>) => items
    .filter((item) => selected.includes(value(item)) || pool.some((product) => test(product, item)))
    .map((item) => ({ value: value(item), ...extra(item), count: base.filter((product) => test(product, item)).length }));

  const inPreset = (product: CatalogEntry, preset: (typeof PRICE_PRESETS)[number]) => {
    const value = priceFor(product, filters.sizes);
    return value >= preset.min && value <= preset.max;
  };
  const price = options(PRICE_PRESETS, filters.price, (preset) => preset.value, inPreset, within('price'), (preset) => ({ label: preset.label }));

  const sizeHints = new Map<string, string>();
  for (const product of pool) for (const option of product.sizes) {
    if (!sizeHints.has(option.size)) sizeHints.set(option.size, [option.weightRange, option.ageRange].filter(Boolean).join(' · '));
  }
  for (const size of filters.sizes) if (!sizeHints.has(size)) sizeHints.set(size, '');
  const sizeLabels = [...sizeHints.keys()].sort(compareSizeLabels);
  const sizes = options(sizeLabels, filters.sizes, (size) => size,
    (product, size) => product.sizes.some((option) => option.size === size && (!filters.inStock || option.stock > 0)),
    within('sizes'), (size) => ({ label: size, hint: sizeHints.get(size) || undefined }));

  const colors = options(COLOR_FAMILIES, filters.colors, (family) => family.value,
    (product, family) => colorFamily(product.colorName) === family.value, within('colors'),
    (family) => ({ label: family.label, swatch: family.hex }));

  const collectionNames = new Map<string, string>();
  for (const product of pool) if (product.collectionId) collectionNames.set(product.collectionId, product.collectionName || product.collectionId);
  for (const slug of filters.collections) if (!collectionNames.has(slug)) collectionNames.set(slug, slug);
  const collectionList = [...collectionNames.entries()].sort((a, b) => a[1].localeCompare(b[1], 'vi'));
  const collections = options(collectionList, filters.collections, ([slug]) => slug,
    (product, [slug]) => product.collectionId === slug, within('collections'), ([, label]) => ({ label }));

  const types = options(TYPE_OPTIONS, filters.types, (option) => option.value,
    (product, option) => product.subcategory === option.value, within('types'), (option) => ({ label: option.label }));

  const flagBase = within('flags');
  const prices = pool.map((product) => product.basePrice);
  return {
    price, sizes, colors, collections, types,
    inStock: flagBase.filter((product) => product.sizes.some((option) => option.stock > 0)).length,
    sale: flagBase.filter(isOnSale).length,
    isNew: flagBase.filter((product) => product.isNewArrival).length,
    rating4: flagBase.filter((product) => product.reviewCount > 0 && product.rating >= 4).length,
    priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
  };
}
