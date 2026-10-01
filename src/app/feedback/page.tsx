import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircleHeart, ShieldCheck } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { FeedbackAlbum } from '@/components/feedback/FeedbackAlbum';
import { getPublishedFeedback } from '@/server/content/testimonials';
import { getSiteContent } from '@/server/content/site-content';

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Feedback khách hàng | T'Petie",
  description: "Feedback các mẹ gửi T'Petie sau khi nhận đồ cho bé.",
};

/** Album toàn bộ feedback ảnh chụp tin nhắn đã công bố. */
export default async function FeedbackPage() {
  const [feedback, content] = await Promise.all([getPublishedFeedback(), getSiteContent()]);
  const section = content.testimonials_section;
  return <div className="mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6 sm:pb-16">
    <Breadcrumb items={[{ label: 'Feedback khách hàng' }]} />
    <header className="mx-auto mb-8 mt-3 max-w-2xl text-center">
      {section?.eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-honey-700">{section.eyebrow}</p>}
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-charcoal-900 sm:text-4xl">
        {section?.title || "Mẹ nói gì về T'Petie?"}
      </h1>
      {feedback.length > 0 && <p className="mt-3 flex items-center justify-center gap-2 text-sm text-charcoal-700">
        <MessageCircleHeart className="size-4 text-blush-600" aria-hidden />
        <span><strong className="text-charcoal-900">{feedback.length}</strong> feedback từ các mẹ đã mua</span>
      </p>}
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-charcoal-500">
        <ShieldCheck className="size-3.5 text-sage-700" aria-hidden />
        Chỉ đăng khi khách đồng ý.
      </p>
    </header>

    {feedback.length > 0 ? <FeedbackAlbum items={feedback} /> : <div className="mx-auto max-w-md rounded-3xl border border-cream-200 bg-white p-8 text-center shadow-card">
      <p className="text-sm text-charcoal-600">Shop đang tổng hợp feedback của các mẹ, mẹ quay lại sau nhé.</p>
    </div>}

    <div className="mt-10 text-center">
      <Link href="/girls" className="inline-flex min-h-11 items-center rounded-full bg-honey-500 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-honey-600 active:scale-95">
        Chọn đồ cho bé
      </Link>
    </div>
  </div>;
}
