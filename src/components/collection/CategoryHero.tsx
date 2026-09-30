import Image from 'next/image';
import type { CategoryPageContent } from '@/lib/content/site-content';

/**
 * Ảnh chủ đề, tiêu đề và lời dẫn của một trang danh mục, render sẵn từ dữ liệu database.
 * Khối chưa được cấu hình sẽ không hiển thị.
 */
export function CategoryHero({ page }: { page: CategoryPageContent | null }) {
  if (!page || (!page.imageUrl && !page.title && !page.description)) return null;
  return <>
    {page.imageUrl && <div className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden bg-cream-100 mb-6">
      <Image src={page.imageUrl} alt={page.imageAlt || page.title} fill sizes="100vw" priority className="object-cover" />
    </div>}
    {(page.title || page.description) && <div className="mb-6">
      {page.title && <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-charcoal-900 mb-2">{page.title}</h1>}
      {page.description && <p className="text-xs sm:text-sm text-charcoal-600 max-w-2xl leading-relaxed">{page.description}</p>}
    </div>}
  </>;
}
