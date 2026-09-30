import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db/client';
import { SITE_CONTENT_KEYS, parseSiteContent } from '@/lib/content/site-content';
import type { AboutPageContent, BrandAssets, CategoryPageContent, CategoryPagesContent, HomeFeaturesSection,
  HomeHero, HomeSections, SalePageContent, SiteContentKey, SiteContentValue, SizeGuide,
  TestimonialsSectionContent } from '@/lib/content/site-content';

export const SITE_CONTENT_TAG = 'site-content';

export type SiteContentMap = {
  home_hero: HomeHero | null;
  home_sections: HomeSections | null;
  home_features: HomeFeaturesSection | null;
  brand_assets: BrandAssets | null;
  sale_page: SalePageContent | null;
  about_page: AboutPageContent | null;
  category_pages: CategoryPagesContent | null;
  testimonials_section: TestimonialsSectionContent | null;
  size_guide: SizeGuide | null;
};

type StoredRow = { key: string; data: unknown };

/** Chỉ trả về dữ liệu đã kiểm tra hợp lệ; bản ghi hỏng bị bỏ qua thay vì làm sập trang. */
function safeParse<K extends SiteContentKey>(key: K, rows: StoredRow[]): SiteContentValue<K> | null {
  const row = rows.find((item) => item.key === key);
  if (!row) return null;
  try { return parseSiteContent(key, row.data); }
  catch { return null; }
}

/**
 * Đọc toàn bộ cấu hình nội dung trong một truy vấn duy nhất.
 * Mọi khối hiển thị trên website lấy dữ liệu từ đây thay vì viết cứng trong mã nguồn.
 */
export const getSiteContent = unstable_cache(async (): Promise<SiteContentMap> => {
  const rows = await prisma.siteContent.findMany({ where: { key: { in: [...SITE_CONTENT_KEYS] } }, select: { key: true, data: true } });
  return {
    home_hero: safeParse('home_hero', rows),
    home_sections: safeParse('home_sections', rows),
    home_features: safeParse('home_features', rows),
    brand_assets: safeParse('brand_assets', rows),
    sale_page: safeParse('sale_page', rows),
    about_page: safeParse('about_page', rows),
    category_pages: safeParse('category_pages', rows),
    testimonials_section: safeParse('testimonials_section', rows),
    size_guide: safeParse('size_guide', rows),
  };
}, ['site-content-map'], { revalidate: 300, tags: [SITE_CONTENT_TAG] });

export async function getHomeFeatures(): Promise<HomeFeaturesSection | null> {
  return (await getSiteContent()).home_features;
}

export async function getSizeGuide(): Promise<SizeGuide | null> {
  return (await getSiteContent()).size_guide;
}

/** Cấu hình ảnh chủ đề và lời dẫn của một trang danh mục. */
export async function getCategoryPage(id: string): Promise<CategoryPageContent | null> {
  return (await getSiteContent()).category_pages?.items.find((item) => item.id === id) || null;
}
