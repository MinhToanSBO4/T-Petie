import Link from 'next/link';
import { MessageCircleHeart } from 'lucide-react';
import type { TestimonialsSectionContent } from '@/lib/content/site-content';
import { FeedbackStoryRail } from '@/components/feedback/FeedbackStoryRail';
import type { PublicFeedback } from '@/types/testimonial';

/**
 * Khối "Khách hàng nói gì" ở trang chủ: feedback ảnh dạng story. Đánh giá sản phẩm của khách đã mua
 * chỉ hiện ở trang sản phẩm được đánh giá.
 */
export function TestimonialsSection({ feedback, feedbackTotal, section }: {
  feedback: PublicFeedback[]; feedbackTotal: number;
  section?: TestimonialsSectionContent | null;
}) {
  if (feedback.length === 0) return null;

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
        <span><strong className="text-charcoal-900">{feedbackTotal}</strong> feedback từ các mẹ</span>
        <Link href="/feedback" className="font-bold text-honey-700 hover:underline">Xem album →</Link>
      </p>}
    </div>

    <FeedbackStoryRail items={feedback} total={feedbackTotal} />
  </section>;
}
