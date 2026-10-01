'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';

/** Xem ảnh khách gửi kèm đánh giá ở kích thước lớn; ←/→ chuyển ảnh, Esc đóng. */
export function PhotoLightbox({ images, startIndex, label, onClose }: {
  images: string[]; startIndex: number; label: string; onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, onClose, dialogRef);
  const go = (step: number) => setIndex((current) => (current + step + images.length) % images.length);
  const nav = 'grid size-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30';
  return createPortal(<div ref={dialogRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
    onKeyDown={(event) => { if (event.key === 'ArrowRight') go(1); if (event.key === 'ArrowLeft') go(-1); }}
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    className="fixed inset-0 z-[80] flex items-center justify-center bg-charcoal-900/95 p-4 outline-none animate-fade-in">
    <img src={cloudinaryImage(images[index], { width: 1280 })} alt={`${label} — ảnh ${index + 1}/${images.length}`}
      className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
    <button type="button" onClick={onClose} aria-label="Đóng" className={`${nav} absolute right-4 top-4`}><X className="size-6" /></button>
    {images.length > 1 && <>
      <button type="button" onClick={() => go(-1)} aria-label="Ảnh trước" className={`${nav} absolute left-3 top-1/2 -translate-y-1/2`}><ChevronLeft className="size-6" /></button>
      <button type="button" onClick={() => go(1)} aria-label="Ảnh sau" className={`${nav} absolute right-3 top-1/2 -translate-y-1/2`}><ChevronRight className="size-6" /></button>
      <p className="absolute bottom-4 text-sm font-semibold text-white" aria-live="polite">{index + 1}/{images.length}</p>
    </>}
  </div>, document.body);
}
