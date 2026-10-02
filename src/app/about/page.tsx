import type { Metadata } from 'next';
import { AboutContent } from '@/components/about/AboutContent';
import { getSiteContent } from '@/server/content/site-content';
import { getCollections } from '@/server/catalog/queries';

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Về chúng tôi | T'Petie",
  description: "Câu chuyện, niềm tin và giá trị của T'Petie — thương hiệu thời trang bé gái Việt Nam từ năm 2021.",
};

export default async function AboutPage() {
  const [content, collections] = await Promise.all([getSiteContent(), getCollections()]);
  // Ảnh minh họa là ảnh lookbook thật, lấy xen kẽ giữa các bộ sưu tập để đa dạng bối cảnh.
  const longest = Math.max(0, ...collections.map((collection) => collection.lookbookImages.length));
  const photos = Array.from({ length: longest }, (_, index) => collections.map((collection) => collection.lookbookImages[index]))
    .flat().filter((url): url is string => Boolean(url)).slice(0, 12);
  return <AboutContent about={content.about_page} photos={photos} />;
}
