'use client';

import { useState } from 'react';
import { PhotoLightbox } from '@/components/reviews/PhotoLightbox';
import { cloudinaryImage, cloudinarySrcSet } from '@/lib/media/cloudinary-url';

/**
 * Lookbook của một bộ sưu tập: từ 3 ảnh trở lên thì ảnh đầu lớn (2×2 trên máy tính), các ảnh còn lại xếp lưới;
 * ít ảnh hơn thì xếp đều để không có ô trống hay ô bị co lại. Bấm để xem ảnh lớn.
 * Ảnh được Cloudinary cắt sẵn đúng khung nên nét ở mọi tỉ lệ ảnh gốc.
 */
export function LookbookGallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return <>
    <ul className={`grid gap-3 sm:gap-4 ${images.length === 1 ? 'max-w-md grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
      {images.map((url, index) => {
        const lead = index === 0 && images.length >= 3;
        return <li key={url} className={lead ? 'col-span-2 aspect-[4/5] md:row-span-2 md:aspect-auto' : 'aspect-[2/3]'}>
          <button type="button" onClick={() => setOpen(index)} aria-label={`Xem ảnh lookbook ${index + 1} của ${title}`}
            className="group relative block h-full w-full overflow-hidden rounded-2xl bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey-500 focus-visible:ring-offset-2">
            <img src={cloudinaryImage(url, { width: lead ? 900 : 480, fill: { height: lead ? 1350 : 720 } })}
              srcSet={lead ? cloudinarySrcSet(url, [600, 900, 1300], 2 / 3) : cloudinarySrcSet(url, [320, 480, 720], 2 / 3)}
              sizes={lead ? '(min-width: 768px) 66vw, 100vw' : '(min-width: 768px) 33vw, 50vw'}
              alt="" loading={index < 3 ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03]" />
          </button>
        </li>;
      })}
    </ul>
    {open !== null && <PhotoLightbox images={images} startIndex={open} label={`Lookbook ${title}`} onClose={() => setOpen(null)} />}
  </>;
}
