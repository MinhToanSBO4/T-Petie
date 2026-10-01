'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Expand, ShoppingBag } from 'lucide-react';
import { cloudinaryImage, cloudinaryLoader } from '@/lib/media/cloudinary-url';
import { FeedbackViewer } from '@/components/feedback/FeedbackViewer';
import type { PublicFeedback } from '@/types/testimonial';

/** Ảnh dài hơn tỉ lệ này (chụp cuộn nhiều tin nhắn) được cắt bớt trong lưới và mở đầy đủ khi chạm. */
const TALL_RATIO = 2.1;

/**
 * Album feedback dạng masonry: mỗi ảnh giữ đúng tỉ lệ (không cắt chữ trong tin nhắn) nên ảnh dài ngắn
 * xen kẽ tự nhiên; khung có kích thước sẵn để trang không nhảy khi ảnh tải. Chạm ảnh để xem kiểu story.
 */
export function FeedbackAlbum({ items }: { items: PublicFeedback[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return <>
    <ul className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4" aria-label="Album feedback khách hàng">
      {items.map((item, index) => {
        const tall = item.width && item.height ? item.height / item.width > TALL_RATIO : false;
        return <li key={item.id} className="mb-3 break-inside-avoid sm:mb-4">
          <figure className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-cream-200 transition-shadow hover:shadow-soft">
            <button type="button" onClick={() => setOpen(index)} data-feedback-id={item.id}
              aria-label={`Xem feedback ${index + 1}${item.caption ? `: ${item.caption}` : ''}`}
              className="group relative block w-full text-left">
              <span className={`relative block overflow-hidden bg-cream-100 ${tall ? 'max-h-[34rem]' : ''}`}>
                {item.width && item.height
                  ? <Image loader={cloudinaryLoader} src={item.imageUrl} alt="" width={item.width} height={item.height}
                      sizes="(min-width: 1024px) 270px, (min-width: 640px) 33vw, 50vw"
                      className="h-auto w-full transition-transform duration-500 motion-safe:group-hover:scale-[1.02]" />
                  : <img src={cloudinaryImage(item.imageUrl, { width: 640 })} alt="" loading="lazy" decoding="async" className="h-auto w-full" />}
                {tall && <span className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-white via-white/85 to-transparent pb-3 pt-16">
                  <span className="inline-flex items-center gap-1 rounded-full bg-charcoal-900/85 px-3 py-1 text-[11px] font-bold text-white">
                    <Expand className="size-3" aria-hidden />Xem đầy đủ</span>
                </span>}
              </span>
            </button>
            {(item.caption || item.product) && <figcaption className="space-y-1.5 border-t border-cream-100 px-3 py-2.5">
              {item.caption && <p className="text-xs font-semibold leading-snug text-charcoal-800">{item.caption}</p>}
              {item.product && <Link href={`/products/${item.product.slug}`}
                className="flex items-center gap-1 text-[11px] font-bold text-honey-700 hover:underline">
                <ShoppingBag className="size-3 shrink-0" aria-hidden /><span className="truncate">{item.product.name}</span>
              </Link>}
            </figcaption>}
          </figure>
        </li>;
      })}
    </ul>
    {open !== null && <FeedbackViewer items={items} startIndex={open} onClose={() => setOpen(null)} />}
  </>;
}
