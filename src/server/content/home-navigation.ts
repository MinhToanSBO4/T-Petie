import 'server-only';
import { unstable_cache } from 'next/cache';
import { getCollections, getProducts } from '@/server/catalog/queries';
import { SITE_CONTENT_TAG, getSiteContent } from '@/server/content/site-content';
import { HOME_BLOCK_IDS } from '@/lib/content/site-content';
import { homeBlockProducts, homeBlockVisibility, homeNavItems } from '@/lib/content/home-blocks';

/**
 * Mục con "Trang Chủ" ở menu đầu trang, tính theo đúng quy tắc của trang chủ: khối đang ẩn không có mục,
 * thứ tự và nhãn theo cấu hình. Cache riêng vì layout dựng ở mọi trang: mỗi lần chỉ đọc vài mục thay vì cả catalog.
 */
export const getHomeNavigation = unstable_cache(async () => {
  const [products, collections, content] = await Promise.all([getProducts(), getCollections(), getSiteContent()]);
  const sections = content.home_sections;
  const visible = homeBlockVisibility({
    hero: content.home_hero, features: content.home_features,
    collections: collections.filter((collection) => collection.showOnHome),
    bestSellers: homeBlockProducts('bestSellers', products, sections?.bestSellers.productIds),
    sale: homeBlockProducts('sale', products, sections?.sale.productIds),
    // Khối feedback không có mục trong menu.
    feedback: [],
  });
  return homeNavItems(content.home_layout?.order || HOME_BLOCK_IDS, sections, visible);
}, ['home-navigation'], { revalidate: 60, tags: ['products', 'collections', SITE_CONTENT_TAG] });
