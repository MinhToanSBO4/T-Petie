export type SizeGuideRow = { size: string; age: string; weight: string; height: string };
export type SizeGuide = { baby: SizeGuideRow[]; kids: SizeGuideRow[]; tips: string[] };
export type HomeFeature = { id: string; src: string; icon: string; title: string;
  description: string; objectPosition: string };

/** Khối "Những điều làm nên sự khác biệt" — tiêu đề khối + danh sách ảnh chủ đề. */
export type HomeFeaturesSection = { eyebrow: string; title: string; items: HomeFeature[] };

/** Nút hành động của hero trang chủ. */
export type HomeHero = { shopLabel: string; shopHref: string; lookbookLabel: string; lookbookHref: string;
  defaultBadge: string };

export type LinkSection = { title: string; linkLabel: string; linkHref: string };
/** Tiêu đề và liên kết của các khối trên trang chủ. */
export type HomeSections = { bestSellers: LinkSection; sale: LinkSection;
  collections: LinkSection & { eyebrow: string } };

/** Nhận diện thương hiệu dùng chung cho Header, Footer và các trang. */
export type BrandAssets = { logoUrl: string; logoAlt: string };

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
export type TestimonialsSectionContent = { eyebrow: string; title: string };

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

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid site content');
  return value as Record<string, unknown>;
}

function contentText(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid site content text');
  return value;
}

/** Trường văn bản được phép để trống (ví dụ: khối chưa cấu hình thì ẩn đi). */
function optionalText(value: unknown, max: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid site content text');
  return value.trim();
}

/** Liên kết nội bộ hoặc https; chặn mọi scheme nguy hiểm. */
function contentHref(value: unknown, max = 300): string {
  const href = contentText(value, max);
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  try {
    const url = new URL(href);
    if (url.protocol === 'https:') return url.toString();
  } catch { /* invalid URL */ }
  throw new Error('Invalid site content link');
}

/** Ảnh phải nằm trong thư viện media trên Cloudinary; không chấp nhận đường dẫn tĩnh. */
function imageUrl(value: unknown): string {
  const src = contentText(value, 500);
  try {
    const url = new URL(src);
    if (url.protocol === 'https:' && url.hostname === 'res.cloudinary.com') return url.toString();
  } catch { /* invalid URL */ }
  throw new Error('Invalid site content image');
}

function optionalImageUrl(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  return imageUrl(value);
}

function linkSection(value: unknown, titleMax = 120): LinkSection {
  const row = record(value);
  return { title: optionalText(row.title, titleMax), linkLabel: optionalText(row.linkLabel, 60),
    linkHref: row.linkHref ? contentHref(row.linkHref) : '' };
}

export function parseHomeFeatures(value: unknown): HomeFeature[] {
  if (!Array.isArray(value) || value.length > 12) throw new Error('Invalid home features');
  const features = value.map((item): HomeFeature => {
    const row = record(item);
    const objectPosition = contentText(row.objectPosition, 40);
    if (!/^(?:left|center|right|\d{1,3}%)(?: (?:top|center|bottom|\d{1,3}%))?$/.test(objectPosition)) {
      throw new Error('Invalid feature image position');
    }
    return { id: contentText(row.id, 60), src: imageUrl(row.src),
      icon: contentText(row.icon, 12), title: contentText(row.title, 100),
      description: contentText(row.description, 500), objectPosition };
  });
  if (new Set(features.map((item) => item.id)).size !== features.length) throw new Error('Duplicate feature id');
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
  return {
    shopLabel: optionalText(row.shopLabel, 60), shopHref: row.shopHref ? contentHref(row.shopHref) : '',
    lookbookLabel: optionalText(row.lookbookLabel, 60), lookbookHref: row.lookbookHref ? contentHref(row.lookbookHref) : '',
    defaultBadge: optionalText(row.defaultBadge, 60),
  };
}

export function parseHomeSections(value: unknown): HomeSections {
  const row = record(value);
  const collections = linkSection(row.collections);
  return { bestSellers: linkSection(row.bestSellers), sale: linkSection(row.sale),
    collections: { ...collections, eyebrow: optionalText(record(row.collections).eyebrow, 80) } };
}

export function parseBrandAssets(value: unknown): BrandAssets {
  const row = record(value);
  return { logoUrl: optionalImageUrl(row.logoUrl), logoAlt: optionalText(row.logoAlt, 200) };
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
  return { eyebrow: optionalText(row.eyebrow, 80), title: optionalText(row.title, 160) };
}

export function parseSizeGuide(value: unknown): SizeGuide {
  const data = record(value);
  const rows = (input: unknown): SizeGuideRow[] => {
    if (!Array.isArray(input) || input.length > 30) throw new Error('Invalid size guide rows');
    return input.map((item) => {
      const row = record(item);
      return { size: contentText(row.size, 50), age: contentText(row.age, 100),
        weight: contentText(row.weight, 100), height: contentText(row.height, 100) };
    });
  };
  if (!Array.isArray(data.tips) || data.tips.length > 20) throw new Error('Invalid size guide tips');
  return { baby: rows(data.baby), kids: rows(data.kids),
    tips: data.tips.map((tip) => contentText(tip, 500)) };
}

/** Bảng parser theo từng khóa nội dung, dùng chung cho API quản trị và lớp đọc dữ liệu. */
export const SITE_CONTENT_PARSERS = {
  home_hero: parseHomeHero,
  home_sections: parseHomeSections,
  home_features: parseHomeFeaturesSection,
  brand_assets: parseBrandAssets,
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
