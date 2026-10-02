export type SizeGuideRow = { size: string; age: string; weight: string; height: string };
export type SizeGuide = { baby: SizeGuideRow[]; kids: SizeGuideRow[]; tips: string[] };
export type HomeFeature = { id: string; src: string; icon: string; title: string;
  description: string; objectPosition: string };

/** Khối "Những điều làm nên sự khác biệt" — tiêu đề khối + danh sách ảnh chủ đề. */
export type HomeFeaturesSection = { eyebrow: string; title: string; items: HomeFeature[] };

/** Nút hành động của hero trang chủ. */
export type HomeHeroSlide = { id: string; imageUrl: string; imageAlt: string; icon: string; title: string; description: string; badge: string; href: string; objectPosition: string };
export type HomeHero = { shopLabel: string; shopHref: string; lookbookLabel: string; lookbookHref: string;
  defaultBadge: string; imageUrl: string; imageAlt: string; slides: HomeHeroSlide[] };

/** Ảnh minh họa độc lập của một khối nội dung trên trang chủ. */
export type BlockImage = { imageUrl: string; imageAlt: string };
export type LinkSection = { title: string; linkLabel: string; linkHref: string; productIds: string[] } & BlockImage;
/** Tiêu đề và liên kết của các khối trên trang chủ. */
export type HomeSections = { bestSellers: LinkSection; sale: LinkSection;
  collections: LinkSection & { eyebrow: string } };

/** Các khối trang chủ có thể kéo-thả, luôn hiển thị đủ một lần. */
export const HOME_BLOCK_IDS = ['hero', 'bestSellers', 'sale', 'collections', 'features', 'testimonials'] as const;
export type HomeBlockId = (typeof HOME_BLOCK_IDS)[number];
export type HomeLayout = { order: HomeBlockId[] };

/** Trả các khối theo đúng thứ tự đã lưu để DOM, bàn phím và trình đọc màn hình cùng nhất quán. */
export function orderHomeBlocks<T>(blocks: Record<HomeBlockId, T>, order: readonly HomeBlockId[]): T[] {
  return order.map((id) => blocks[id]);
}

/** Nhận diện thương hiệu dùng chung cho Header, Footer và các trang. */
export type BrandAssets = { logoUrl: string; logoAlt: string };
/** Thông tin liên hệ và kênh mạng xã hội hiển thị ở footer, nút chat và trang chính sách. */
export type ContactInfo = { hotline: string; hotlineHours: string; zaloUrl: string; zaloLabel: string;
  messengerUrl: string; facebookUrl: string; tiktokUrl: string; instagramUrl: string;
  commitment: string; madeIn: string; copyrightName: string };

/** Banner và lời dẫn của trang Ưu đãi. */
export type SalePageContent = { bannerUrl: string; bannerAlt: string; title: string; description: string };

/** Ảnh nền và khối mời gọi của trang Về Chúng Tôi. */
export type AboutPageContent = { heroImageUrl: string; heroImageAlt: string; heroTitle: string;
  heroDescription: string; ctaTitle: string; ctaDescription: string; ctaLabel: string; ctaHref: string };

/** Ảnh chủ đề và lời dẫn của từng trang danh mục sản phẩm. */
export type CategoryPageContent = { id: string; imageUrl: string; imageAlt: string;
  title: string; description: string };
export type CategoryPagesContent = { items: CategoryPageContent[] };

/** Khối đánh giá khách hàng ở cuối trang chủ. */
export type TestimonialsSectionContent = { eyebrow: string; title: string } & BlockImage;

/** Các trang danh mục có thể cấu hình ảnh chủ đề; trùng với đoạn đường dẫn tương ứng. */
export const CATEGORY_PAGE_IDS = ['girls', 'tops', 'bottoms', 'dresses', 'sets'] as const;

/** Nhãn định tuyến của từng trang danh mục, dùng cho breadcrumb và trang quản trị. */
export const CATEGORY_PAGE_LABELS: Record<(typeof CATEGORY_PAGE_IDS)[number], { label: string; href: string; breadcrumb: string }> = {
  girls: { label: 'Tất cả sản phẩm bé gái', href: '/girls', breadcrumb: 'Thời Trang Bé Gái' },
  tops: { label: 'Áo bé gái', href: '/girls/tops', breadcrumb: 'Áo Sơ Mi & Áo Kiểu' },
  bottoms: { label: 'Quần bé gái', href: '/girls/bottoms', breadcrumb: 'Quần Bloomer & Yếm' },
  dresses: { label: 'Váy bé gái', href: '/girls/dresses', breadcrumb: 'Váy Đầm Công Chúa' },
  sets: { label: 'Set đồ', href: '/girls/sets', breadcrumb: 'Set Bộ Phối Sẵn' },
};

/** Lỗi nhập liệu nội dung trang: thông báo nói rõ ô nào sai để hiện nguyên văn cho người sửa. */
export class SiteContentError extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SiteContentError('Dữ liệu nội dung không đúng cấu trúc');
  return value as Record<string, unknown>;
}

function contentText(value: unknown, max: number, label = 'Một ô bắt buộc'): string {
  if (typeof value !== 'string' || !value.trim()) throw new SiteContentError(`${label} đang để trống`);
  if (value.length > max) throw new SiteContentError(`${label} dài quá ${max} ký tự`);
  return value;
}

/** Trường văn bản được phép để trống (ví dụ: khối chưa cấu hình thì ẩn đi). */
function optionalText(value: unknown, max: number, label = 'Một ô'): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new SiteContentError(`${label} không hợp lệ`);
  if (value.length > max) throw new SiteContentError(`${label} dài quá ${max} ký tự`);
  return value.trim();
}

/**
 * Liên kết nội bộ hoặc https; chặn mọi scheme nguy hiểm. "/\\evil.com" bị chặn vì trình duyệt coi "/\\" như "//"
 * (liên kết ra trang ngoài trá hình liên kết nội bộ).
 */
function contentHref(value: unknown, max = 300, label = 'Liên kết'): string {
  const href = contentText(value, max, label).trim();
  if (href.startsWith('/') && !/^\/[\\/]/.test(href) && !/[\s\\]/.test(href)) return href;
  try {
    const url = new URL(href);
    if (url.protocol === 'https:') return url.toString();
  } catch { /* invalid URL */ }
  throw new SiteContentError(`${label} phải bắt đầu bằng "/" (trang trong shop) hoặc "https://"`);
}

/** Ảnh phải nằm trong thư viện media trên Cloudinary; không chấp nhận đường dẫn tĩnh. */
function imageUrl(value: unknown, label = 'Ảnh'): string {
  if (typeof value !== 'string' || !value.trim()) throw new SiteContentError(`${label} chưa có ảnh: tải ảnh lên hoặc bỏ mục này`);
  const src = contentText(value, 500, label);
  try {
    const url = new URL(src);
    if (url.protocol === 'https:' && url.hostname === 'res.cloudinary.com') return url.toString();
  } catch { /* invalid URL */ }
  throw new SiteContentError(`${label} phải là ảnh trong thư viện media`);
}

function optionalImageUrl(value: unknown, label = 'Ảnh'): string {
  if (value === undefined || value === null || value === '') return '';
  return imageUrl(value, label);
}

function linkSection(value: unknown, titleMax = 120): LinkSection {
  const row = record(value);
  return { title: optionalText(row.title, titleMax), linkLabel: optionalText(row.linkLabel, 60),
    linkHref: row.linkHref ? contentHref(row.linkHref) : '', imageUrl: optionalImageUrl(row.imageUrl),
    imageAlt: optionalText(row.imageAlt, 200), productIds: contentIds(row.productIds) };
}

function contentIds(value: unknown, max = 12): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max) throw new Error('Invalid site content ids');
  const ids = value.filter((item) => item !== '').map((item) => contentText(item, 80));
  if (new Set(ids).size !== ids.length) throw new Error('Invalid site content ids');
  return ids;
}

export function parseHomeFeatures(value: unknown): HomeFeature[] {
  if (!Array.isArray(value)) throw new SiteContentError('Danh sách ảnh chủ đề không hợp lệ');
  if (value.length > 12) throw new SiteContentError('Tối đa 12 ảnh chủ đề');
  const features = value.map((item, index): HomeFeature => {
    const row = record(item);
    const label = `Ảnh chủ đề ${index + 1}`;
    const objectPosition = contentText(row.objectPosition, 40, `${label}: vị trí ảnh`);
    if (!/^(?:left|center|right|\d{1,3}%)(?: (?:top|center|bottom|\d{1,3}%))?$/.test(objectPosition)) {
      throw new SiteContentError(`${label}: vị trí ảnh không hợp lệ`);
    }
    return { id: contentText(row.id, 60, label), src: imageUrl(row.src, label),
      icon: contentText(row.icon, 12, `${label}: biểu tượng`), title: contentText(row.title, 100, `${label}: tiêu đề`),
      description: contentText(row.description, 500, `${label}: mô tả`), objectPosition };
  });
  if (new Set(features.map((item) => item.id)).size !== features.length) throw new SiteContentError('Có hai ảnh chủ đề trùng mã');
  return features;
}

/** Chấp nhận cả dữ liệu cũ (mảng ảnh) lẫn cấu hình mới (tiêu đề khối + mảng ảnh). */
export function parseHomeFeaturesSection(value: unknown): HomeFeaturesSection {
  if (Array.isArray(value)) return { eyebrow: '', title: '', items: parseHomeFeatures(value) };
  const row = record(value);
  return { eyebrow: optionalText(row.eyebrow, 80), title: optionalText(row.title, 160),
    items: parseHomeFeatures(row.items) };
}

export function parseHomeHero(value: unknown): HomeHero {
  const row = record(value);
  const rawSlides = (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).slides))
    ? (value as Record<string, unknown>).slides as unknown[] : [];
  const slides = rawSlides
    ? rawSlides.map((item, index): HomeHeroSlide => {
      const slide = record(item);
      return { id: contentText(slide.id, 80), imageUrl: imageUrl(slide.imageUrl, `Ảnh Hero ${index + 1}`), imageAlt: optionalText(slide.imageAlt, 200),
        icon: optionalText(slide.icon, 12), title: optionalText(slide.title, 160), description: optionalText(slide.description, 500),
        badge: optionalText(slide.badge, 60), href: slide.href ? contentHref(slide.href) : '', objectPosition: optionalText(slide.objectPosition, 40) || 'center center' };
    }) : [];
  if (slides.length > 12) throw new SiteContentError('Tối đa 12 ảnh Hero');
  if (new Set(slides.map((slide) => slide.id)).size !== slides.length) throw new SiteContentError('Có hai ảnh Hero trùng mã');
  return {
    shopLabel: optionalText(row.shopLabel, 60), shopHref: row.shopHref ? contentHref(row.shopHref) : '',
    lookbookLabel: optionalText(row.lookbookLabel, 60), lookbookHref: row.lookbookHref ? contentHref(row.lookbookHref) : '',
    defaultBadge: optionalText(row.defaultBadge, 60),
    imageUrl: optionalImageUrl(row.imageUrl), imageAlt: optionalText(row.imageAlt, 200), slides,
  };
}

export function parseHomeSections(value: unknown): HomeSections {
  const row = record(value);
  const collections = linkSection(row.collections);
  return { bestSellers: linkSection(row.bestSellers), sale: linkSection(row.sale),
    collections: { ...collections, eyebrow: optionalText(record(row.collections).eyebrow, 80) } };
}

export function parseHomeLayout(value: unknown): HomeLayout {
  const row = record(value);
  if (!Array.isArray(row.order) || row.order.length !== HOME_BLOCK_IDS.length) throw new Error('Invalid home layout');
  const order = row.order.map((item) => contentText(item, 40) as HomeBlockId);
  if (new Set(order).size !== HOME_BLOCK_IDS.length || order.some((item) => !(HOME_BLOCK_IDS as readonly string[]).includes(item))) {
    throw new Error('Invalid home layout');
  }
  return { order };
}

export function parseBrandAssets(value: unknown): BrandAssets {
  const row = record(value);
  return { logoUrl: optionalImageUrl(row.logoUrl), logoAlt: optionalText(row.logoAlt, 200) };
}

/** Liên kết ngoài tùy chọn: để trống thì ẩn nút tương ứng. */
function optionalHref(value: unknown): string {
  return value === undefined || value === null || value === '' ? '' : contentHref(value);
}

export function parseContactInfo(value: unknown): ContactInfo {
  const row = record(value);
  const hotline = optionalText(row.hotline, 20);
  // Chỉ nhận số, khoảng trắng, dấu chấm/gạch và dấu + đầu số để tạo được liên kết gọi điện.
  if (hotline && !/^\+?\d[\d .-]{5,18}$/.test(hotline)) throw new SiteContentError('Số hotline chỉ gồm chữ số, khoảng trắng, dấu chấm hoặc gạch');
  return { hotline, hotlineHours: optionalText(row.hotlineHours, 60),
    zaloUrl: optionalHref(row.zaloUrl), zaloLabel: optionalText(row.zaloLabel, 80),
    messengerUrl: optionalHref(row.messengerUrl), facebookUrl: optionalHref(row.facebookUrl),
    tiktokUrl: optionalHref(row.tiktokUrl), instagramUrl: optionalHref(row.instagramUrl),
    commitment: optionalText(row.commitment, 300), madeIn: optionalText(row.madeIn, 80),
    copyrightName: optionalText(row.copyrightName, 80) };
}

/** Số gọi điện cho liên kết tel: từ số hiển thị ("035 999 5381" → "0359995381"). */
export function telHref(hotline: string) {
  return `tel:${hotline.replace(/[^\d+]/g, '')}`;
}

export function parseSalePage(value: unknown): SalePageContent {
  const row = record(value);
  return { bannerUrl: optionalImageUrl(row.bannerUrl), bannerAlt: optionalText(row.bannerAlt, 200),
    title: optionalText(row.title, 160), description: optionalText(row.description, 500) };
}

export function parseAboutPage(value: unknown): AboutPageContent {
  const row = record(value);
  return {
    heroImageUrl: optionalImageUrl(row.heroImageUrl), heroImageAlt: optionalText(row.heroImageAlt, 200),
    heroTitle: optionalText(row.heroTitle, 200), heroDescription: optionalText(row.heroDescription, 500),
    ctaTitle: optionalText(row.ctaTitle, 200), ctaDescription: optionalText(row.ctaDescription, 500),
    ctaLabel: optionalText(row.ctaLabel, 60), ctaHref: row.ctaHref ? contentHref(row.ctaHref) : '',
  };
}

export function parseCategoryPages(value: unknown): CategoryPagesContent {
  const row = record(value);
  if (!Array.isArray(row.items) || row.items.length > CATEGORY_PAGE_IDS.length) {
    throw new Error('Invalid category pages');
  }
  const items = row.items.map((item): CategoryPageContent => {
    const entry = record(item);
    const id = contentText(entry.id, 40);
    if (!(CATEGORY_PAGE_IDS as readonly string[]).includes(id)) throw new Error('Invalid category page id');
    return { id, imageUrl: optionalImageUrl(entry.imageUrl), imageAlt: optionalText(entry.imageAlt, 200),
      title: optionalText(entry.title, 160), description: optionalText(entry.description, 500) };
  });
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error('Duplicate category page id');
  return { items };
}

export function parseTestimonialsSection(value: unknown): TestimonialsSectionContent {
  const row = record(value);
  return { eyebrow: optionalText(row.eyebrow, 80), title: optionalText(row.title, 160),
    imageUrl: optionalImageUrl(row.imageUrl), imageAlt: optionalText(row.imageAlt, 200) };
}

export function parseSizeGuide(value: unknown): SizeGuide {
  const data = record(value);
  const rows = (input: unknown, table: string): SizeGuideRow[] => {
    if (!Array.isArray(input) || input.length > 30) throw new SiteContentError(`${table}: tối đa 30 dòng`);
    return input.map((item, index) => {
      const row = record(item);
      const label = `${table}, dòng ${index + 1}`;
      return { size: contentText(row.size, 100, `${label}: size`), age: contentText(row.age, 100, `${label}: độ tuổi`),
        weight: contentText(row.weight, 100, `${label}: cân nặng`), height: contentText(row.height, 100, `${label}: chiều cao`) };
    });
  };
  if (!Array.isArray(data.tips) || data.tips.length > 20) throw new SiteContentError('Tối đa 20 lời khuyên chọn size');
  return { baby: rows(data.baby, 'Bảng size sơ sinh'), kids: rows(data.kids, 'Bảng size bé lớn'),
    tips: data.tips.map((tip, index) => contentText(tip, 500, `Lời khuyên ${index + 1}`)) };
}

/** Bảng parser theo từng khóa nội dung, dùng chung cho API quản trị và lớp đọc dữ liệu. */
export const SITE_CONTENT_PARSERS = {
  home_hero: parseHomeHero,
  home_sections: parseHomeSections,
  home_layout: parseHomeLayout,
  home_features: parseHomeFeaturesSection,
  brand_assets: parseBrandAssets,
  contact_info: parseContactInfo,
  sale_page: parseSalePage,
  about_page: parseAboutPage,
  category_pages: parseCategoryPages,
  testimonials_section: parseTestimonialsSection,
  size_guide: parseSizeGuide,
} as const;

export type SiteContentKey = keyof typeof SITE_CONTENT_PARSERS;
export const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_PARSERS) as SiteContentKey[];

export type SiteContentValue<K extends SiteContentKey> = ReturnType<(typeof SITE_CONTENT_PARSERS)[K]>;

export function parseSiteContent<K extends SiteContentKey>(key: K, value: unknown): SiteContentValue<K> {
  return SITE_CONTENT_PARSERS[key](value) as SiteContentValue<K>;
}
