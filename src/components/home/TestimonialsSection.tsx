import Link from 'next/link';
import { BadgeCheck, MessageCircleHeart } from 'lucide-react';
import type { TestimonialsSectionContent } from '@/lib/content/site-content';
import { FeedbackStoryRail } from '@/components/feedback/FeedbackStoryRail';
import { StarRating } from '@/components/reviews/StarRating';
import type { FeaturedReview, PublicFeedback } from '@/types/testimonial';

/**
 * Khối "Khách hàng nói gì" ở trang chủ: feedback ảnh chụp tin nhắn dạng story (chính),
 * sau đó là vài đánh giá của khách đã mua do quản trị viên chọn.
 */
export function TestimonialsSection({ feedback, feedbackTotal, reviews, section }: {
  feedback: PublicFeedback[]; feedbackTotal: number; reviews: FeaturedReview[];
  section?: TestimonialsSectionContent | null;
}) {
  if (feedback.length === 0 && reviews.length === 0) return null;

  return <section aria-labelledby="customer-feedback-title" className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16">
    {section?.imageUrl && <img src={section.imageUrl} alt={section.imageAlt || ''}
      className="mb-6 h-40 w-full rounded-3xl object-cover sm:h-56" />}
    <div className="mb-6 flex flex-col items-center text-center">
      {section?.eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-honey-700">{section.eyebrow}</p>}
      <h2 id="customer-feedback-title" className="mt-2 font-heading text-xl font-bold text-charcoal-900 sm:text-3xl">
        {section?.title || "Mẹ nói gì về T'Petie?"}
      </h2>
      {feedbackTotal > 0 && <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-charcoal-600">
        <MessageCircleHeart className="size-4 text-blush-600" aria-hidden />
        <span><strong className="text-charcoal-900">{feedbackTotal}</strong> lời khen thật từ tin nhắn của các mẹ</span>
        <Link href="/feedback" className="font-bold text-honey-700 hover:underline">Xem album →</Link>
      </p>}
    </div>

    {feedback.length > 0 && <FeedbackStoryRail items={feedback} total={feedbackTotal} />}

    {reviews.length > 0 && <div className={feedback.length > 0 ? 'mt-10' : ''}>
      {feedback.length > 0 && <h3 className="mb-4 text-center font-heading text-base font-bold text-charcoal-900 sm:text-lg">
        Đánh giá từ khách đã mua
      </h3>}
      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible" aria-label="Đánh giá sản phẩm của khách đã mua">
        {reviews.map((item) => <li key={item.id} className="min-w-[85%] snap-center sm:min-w-[48%] md:min-w-0">
          <figure className="flex h-full flex-col rounded-3xl border border-cream-200 bg-white p-5 shadow-card sm:p-6">
            <StarRating value={item.rating} className="text-honey-500" />
            <blockquote className="mt-4 line-clamp-6 flex-1 whitespace-pre-line text-sm leading-relaxed text-charcoal-800 sm:text-base">
              “{item.quote}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-cream-200 pt-4">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-sage-100 font-bold text-sage-800">
                {item.customerName.charAt(0).toLocaleUpperCase('vi-VN')}
              </span>
              <span className="min-w-0">
                <strong className="block text-sm text-charcoal-900">{item.customerName}</strong>
                {item.verified && <span className="flex items-center gap-1 text-[11px] font-semibold text-sage-700">
                  <BadgeCheck className="size-3.5" aria-hidden />Đã mua hàng{item.variantLabel ? ` · ${item.variantLabel}` : ''}
                </span>}
                {item.productSlug
                  ? <Link href={`/products/${item.productSlug}`} className="block truncate text-xs text-honey-700 hover:underline">{item.productName}</Link>
                  : <span className="block truncate text-xs text-charcoal-500">{item.productName}</span>}
              </span>
            </figcaption>
          </figure>
        </li>)}
      </ul>
    </div>}
  </section>;
}
