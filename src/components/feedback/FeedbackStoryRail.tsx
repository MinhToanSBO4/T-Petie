'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { cloudinaryStoryLoader } from '@/lib/media/cloudinary-url';
import { prefersReducedMotion } from '@/hooks/useDialog';
import { FeedbackViewer } from '@/components/feedback/FeedbackViewer';
import type { PublicFeedback } from '@/types/testimonial';

const SEEN_KEY = 'tpetie_feedback_seen_v1';

function readSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as string[]); }
  catch { return new Set(); }
}

function writeSeen(seen: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-300))); }
  catch { /* chế độ riêng tư: chỉ mất dấu "đã xem" */ }
}

/**
 * Dải story ở trang chủ: thẻ dọc 9:16 cắt phần đầu ảnh chụp tin nhắn để khách lướt nhanh;
 * viền màu cho feedback chưa xem, viền nhạt cho feedback đã xem (nhớ trên trình duyệt này).
 * Chạm một thẻ để mở trình xem toàn màn hình.
 */
export function FeedbackStoryRail({ items, total }: { items: PublicFeedback[]; total: number }) {
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [edges, setEdges] = useState({ start: true, end: true });
  const scroller = useRef<HTMLUListElement>(null);
  const more = total - items.length;

  useEffect(() => setSeen(readSeen()), []);

  const markSeen = useCallback((id: string) => setSeen((current) => {
    if (current.has(id)) return current;
    const next = new Set(current).add(id);
    writeSeen(next);
    return next;
  }), []);

  const updateEdges = useCallback(() => {
    const list = scroller.current;
    if (!list) return;
    setEdges({ start: list.scrollLeft < 8, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 8 });
  }, []);
  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges, items.length]);

  const scrollBy = (direction: 1 | -1) => scroller.current?.scrollBy({
    left: direction * scroller.current.clientWidth * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  const card = 'block w-[38vw] max-w-[176px] shrink-0 sm:w-44';
  const arrow = 'absolute top-[42%] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-cream-200 bg-white/95 text-charcoal-800 shadow-soft transition-opacity hover:text-honey-700 md:grid';

  return <div className="relative">
    <ul ref={scroller} onScroll={updateEdges} aria-label="Feedback khách hàng"
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:mx-0 sm:gap-4 sm:scroll-px-0 sm:px-0">
      {items.map((item, index) => {
        const isSeen = seen.has(item.id);
        return <li key={item.id} className="snap-start">
          <button type="button" data-feedback-id={item.id} onClick={() => setOpen(index)}
            aria-label={`Xem feedback ${index + 1}${item.caption ? `: ${item.caption}` : ''}`}
            className={`group ${card} rounded-[22px] p-[3px] transition-transform duration-200 motion-safe:hover:-translate-y-1 ${
              isSeen ? 'bg-cream-300' : 'bg-gradient-to-tr from-honey-400 via-blush-500 to-honey-600'}`}>
            <span className="relative block aspect-[9/16] overflow-hidden rounded-[19px] border-2 border-white bg-cream-100">
              <Image loader={cloudinaryStoryLoader} src={item.imageUrl} alt="" fill sizes="(min-width: 640px) 176px, 38vw"
                className="object-cover object-top transition-transform duration-500 motion-safe:group-hover:scale-105" />
              {(item.caption || item.product) && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-2.5 pt-12 text-left text-white">
                {item.caption && <span className="line-clamp-2 text-xs font-bold leading-snug drop-shadow">{item.caption}</span>}
                {item.product && <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-white/90">
                  <ShoppingBag className="size-3 shrink-0" aria-hidden /><span className="truncate">{item.product.name}</span>
                </span>}
              </span>}
            </span>
          </button>
        </li>;
      })}
      {more > 0 && <li className="snap-start">
        <Link href="/feedback" className={`${card} grid aspect-[9/16] place-content-center gap-1 rounded-[22px] border-2 border-dashed border-honey-300 bg-honey-50 p-3 text-center transition-colors hover:bg-honey-100`}>
          <span className="font-heading text-2xl font-extrabold text-honey-700">+{more}</span>
          <span className="text-xs font-bold text-honey-800">Xem tất cả feedback</span>
        </Link>
      </li>}
    </ul>
    <button type="button" onClick={() => scrollBy(-1)} aria-label="Xem các feedback trước"
      className={`${arrow} -left-5 ${edges.start ? 'pointer-events-none opacity-0' : 'opacity-100'}`} tabIndex={edges.start ? -1 : 0}>
      <ChevronLeft className="size-5" /></button>
    <button type="button" onClick={() => scrollBy(1)} aria-label="Xem thêm feedback"
      className={`${arrow} -right-5 ${edges.end ? 'pointer-events-none opacity-0' : 'opacity-100'}`} tabIndex={edges.end ? -1 : 0}>
      <ChevronRight className="size-5" /></button>

    {open !== null && <FeedbackViewer items={items} startIndex={open} onClose={() => setOpen(null)} onView={markSeen}
      endAction={more > 0 && <Link href="/feedback" className="inline-flex items-center rounded-full border border-white/70 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">
        Xem tất cả {total} feedback →</Link>} />}
  </div>;
}
