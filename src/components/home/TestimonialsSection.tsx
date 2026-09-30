import Link from 'next/link';
import type { TestimonialsSectionContent } from '@/lib/content/site-content';

/** Một thẻ đánh giá hiển thị ở trang chủ: có thể là đánh giá sản phẩm hoặc feedback khách. */
export type TestimonialCard = {
  id: string; customerName: string; quote: string; rating: number;
  location?: string | null; productName?: string; productSlug?: string;
};

export function TestimonialsSection({ testimonials, section }: {
  testimonials: TestimonialCard[]; section?: TestimonialsSectionContent | null;
}) {
  if (testimonials.length === 0) return null;

  return <section aria-labelledby="customer-feedback-title" className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
    {section?.imageUrl && <img src={section.imageUrl} alt={section.imageAlt || ''}
      className="mb-6 h-40 w-full rounded-3xl object-cover sm:h-56" />}
    <div className="mb-6 text-center">
      {section?.eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-honey-700">{section.eyebrow}</p>}
      {section?.title && <h2 id="customer-feedback-title" className="mt-2 text-xl sm:text-3xl font-bold font-heading text-charcoal-900">
        {section.title}
      </h2>}
    </div>
    <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 md:grid md:grid-cols-3 md:overflow-visible" aria-label="Feedback khách hàng">
      {testimonials.map((item) => <li key={item.id} className="min-w-[85%] sm:min-w-[48%] md:min-w-0 snap-center">
        <figure className="h-full rounded-3xl border border-cream-200 bg-white p-5 sm:p-6 shadow-card flex flex-col">
          <div role="img" aria-label={`${item.rating} trên 5 sao`} className="text-honey-600 tracking-wider text-sm">
            {'★'.repeat(item.rating)}<span className="text-charcoal-300">{'☆'.repeat(5 - item.rating)}</span>
          </div>
          <blockquote className="mt-4 flex-1 text-sm sm:text-base leading-relaxed text-charcoal-800 whitespace-pre-line">
            “{item.quote}”
          </blockquote>
          <figcaption className="mt-5 border-t border-cream-200 pt-4 flex items-center gap-3">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-sage-100 text-sage-800 font-bold">
              {item.customerName.charAt(0).toLocaleUpperCase('vi-VN')}
            </span>
            <span className="min-w-0">
              <strong className="block text-sm text-charcoal-900">{item.customerName}</strong>
              {item.location && <span className="block text-xs text-charcoal-500">{item.location}</span>}
              {item.productName && item.productSlug && <Link href={`/products/${item.productSlug}`}
                className="block truncate text-xs text-honey-700 hover:underline">Về sản phẩm: {item.productName}</Link>}
              {item.productName && !item.productSlug && <span className="block truncate text-xs text-charcoal-500">Về sản phẩm: {item.productName}</span>}
            </span>
          </figcaption>
        </figure>
      </li>)}
    </ul>
    {testimonials.length > 1 && <p className="mt-1 text-center text-xs text-charcoal-500 md:hidden">Vuốt ngang để xem thêm lời chia sẻ</p>}
  </section>;
}
