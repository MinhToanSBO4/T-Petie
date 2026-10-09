import React from 'react';
import { HOME_BLOCK_IDS, orderHomeBlocks, socialLinks } from '@/lib/content/site-content';
import { homeBlockProducts } from '@/lib/content/home-blocks';
import { getProducts, getCollections } from '@/server/catalog/queries';
import { renderHomeBlocks } from '@/components/home/HomeBlocks';
import { getPublishedFeedback } from '@/server/content/testimonials';
import { getSiteContent } from '@/server/content/site-content';
import { HOME_FEEDBACK_LIMIT } from '@/lib/content/testimonial-input';
import { toProductCard } from '@/types/product';
import { siteUrl } from '@/lib/site-url';

export const revalidate = 60;

export default async function HomePage() {
  const [products, collections, feedback, content] = await Promise.all([
    getProducts(), getCollections(), getPublishedFeedback(), getSiteContent(),
  ]);

  const sections = content.home_sections;
  // Cùng quy tắc với bản xem trước trong trình sửa nội dung và menu "Trang Chủ" (src/lib/content/home-blocks.ts).
  const blocks = renderHomeBlocks({
    hero: content.home_hero, sections, features: content.home_features, testimonials: content.testimonials_section,
    collections: collections.filter((collection) => collection.showOnHome),
    bestSellers: homeBlockProducts('bestSellers', products, sections?.bestSellers.productIds).map(toProductCard),
    sale: homeBlockProducts('sale', products, sections?.sale.productIds).map(toProductCard),
    feedback: feedback.slice(0, HOME_FEEDBACK_LIMIT), feedbackTotal: feedback.length,
  });
  const order = content.home_layout?.order || HOME_BLOCK_IDS;
  // Tiêu đề trang cho máy tìm kiếm và trình đọc màn hình (các khối trang chủ chỉ có h2); thông tin thương hiệu dạng có cấu trúc.
  const organization = { '@context': 'https://schema.org', '@type': 'Organization', name: "T'Petie", url: siteUrl(),
    ...(content.brand_assets?.logoUrl ? { logo: content.brand_assets.logoUrl } : {}),
    sameAs: socialLinks(content.contact_info).map((channel) => channel.url) };
  return <div className="flex flex-col gap-10 sm:gap-14">
    <h1 className="sr-only">T&apos;Petie – thời trang thiết kế cho bé gái</h1>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, '\\u003c') }} />
    {orderHomeBlocks(blocks, order).map((block, index) => <React.Fragment key={order[index]}>{block}</React.Fragment>)}
  </div>;
}
