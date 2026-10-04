import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ProductRail } from '@/components/product/ProductRail';
import { LookbookCarousel } from '@/components/collection/LookbookCarousel';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { FeatureCarousel } from '@/components/home/FeatureCarousel';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { HOME_SECTION_ANCHORS, homeBlockVisibility, type HomeProductBlockId } from '@/lib/content/home-blocks';
import { HOME_BLOCK_LABELS, type BlockImage, type HomeBlockId, type HomeFeaturesSection, type HomeHero, type HomeSections,
  type LinkSection, type TestimonialsSectionContent } from '@/lib/content/site-content';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import type { Collection } from '@/types/collection';
import type { ProductCardData } from '@/types/product';
import type { PublicFeedback } from '@/types/testimonial';

/** Dữ liệu dựng các khối: trang chủ truyền nội dung đã lưu, trình sửa nội dung truyền bản nháp đang sửa. */
export type HomeBlocksData = {
  hero: HomeHero | null | undefined;
  sections: HomeSections | null | undefined;
  features: HomeFeaturesSection | null | undefined;
  testimonials: TestimonialsSectionContent | null | undefined;
  /** Bộ sưu tập bật "Hiện ở trang chủ". */
  collections: Collection[];
  bestSellers: ProductCardData[];
  sale: ProductCardData[];
  feedback: PublicFeedback[];
  feedbackTotal: number;
};

const blockImage = (image?: BlockImage) => image?.imageUrl && <img src={cloudinaryImage(image.imageUrl, { width: 1600 })} alt={image.imageAlt || ''}
  className="mb-5 h-40 w-full rounded-3xl object-cover sm:h-56" />;

/** Nhãn liên kết đã cấu hình có thể kèm sẵn mũi tên ("Xem tất cả →"); bỏ đi vì giao diện tự thêm biểu tượng mũi tên. */
const linkText = (label: string) => label.replace(/\s*[→›»]+\s*$/, '');

/** Liên kết "Xem tất cả" ở đầu khối, đứng cạnh hai nút trước/sau của dải. */
const blockLink = (section: LinkSection | undefined) => section?.linkLabel && <Link href={section.linkHref || '/'}
  className="flex items-center space-x-1 text-xs font-bold text-honey-600 hover:text-honey-700">
  <span>{linkText(section.linkLabel)}</span><ArrowRight className="h-3.5 w-3.5" /></Link>;

/** Khối Bán chạy / Ưu đãi: một hàng sản phẩm lướt ngang, cuối hàng là ô dẫn tới liên kết của khối. */
function productBlock(block: HomeProductBlockId, section: LinkSection | undefined, products: ProductCardData[]) {
  return <section id={HOME_SECTION_ANCHORS[block]} className="mx-auto w-full max-w-6xl px-4 sm:px-6">{blockImage(section)}
    <ProductRail label={section?.title || HOME_BLOCK_LABELS[block]} products={products}
      heading={<h2 className="font-heading text-lg font-bold text-charcoal-900 sm:text-2xl">{section?.title}</h2>}
      action={blockLink(section)}
      more={section?.linkLabel && section.linkHref ? { label: linkText(section.linkLabel), href: section.linkHref } : undefined} />
  </section>;
}

/**
 * Nội dung từng khối trang chủ, null khi khối không có gì để hiện. Trang chủ và bản xem trước trong trình sửa
 * nội dung cùng dựng từ hàm này nên quản trị viên thấy đúng những gì khách thấy.
 */
export function renderHomeBlocks(data: HomeBlocksData): Record<HomeBlockId, React.ReactNode> {
  const { sections, features } = data;
  const visible = homeBlockVisibility(data);
  return {
    hero: visible.hero ? <section className="relative w-full px-4 pt-4 sm:px-6"><div className="mx-auto max-w-6xl"><HeroCarousel collections={data.collections} hero={data.hero} /></div></section> : null,
    bestSellers: visible.bestSellers ? productBlock('bestSellers', sections?.bestSellers, data.bestSellers) : null,
    sale: visible.sale ? productBlock('sale', sections?.sale, data.sale) : null,
    collections: visible.collections ? <section id={HOME_SECTION_ANCHORS.collections} className="mx-auto w-full max-w-6xl px-4 sm:px-6">{blockImage(sections?.collections)}
      <LookbookCarousel collections={data.collections} label={sections?.collections.title || HOME_BLOCK_LABELS.collections} action={blockLink(sections?.collections)}
        heading={<div>{sections?.collections.eyebrow && <div className="mb-1 flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-honey-600"><Sparkles className="h-3.5 w-3.5" /><span>{sections.collections.eyebrow}</span></div>}<h2 className="font-heading text-lg font-bold text-charcoal-900 sm:text-2xl">{sections?.collections.title}</h2></div>} />
    </section> : null,
    features: visible.features && features ? <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6"><FeatureCarousel section={features} /></section> : null,
    testimonials: visible.testimonials ? <TestimonialsSection feedback={data.feedback} feedbackTotal={data.feedbackTotal} section={data.testimonials} /> : null,
  };
}
