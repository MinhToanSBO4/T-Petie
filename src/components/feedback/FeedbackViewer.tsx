'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight, Heart, Pause, Play, ShoppingBag, X } from 'lucide-react';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { prefersReducedMotion, useDialog } from '@/hooks/useDialog';
import type { PublicFeedback } from '@/types/testimonial';

const STORY_MS = 6000;
/** Nhiều ảnh quá thì thanh theo đoạn quá mảnh: chuyển sang một thanh cho ảnh đang xem. */
const MAX_SEGMENTS = 15;
/** Thu nhỏ ảnh chụp màn hình hẹp hơn mức này thì chữ khó đọc: chuyển sang vừa chiều ngang và cho cuộn. */
const MIN_READABLE_WIDTH = 300;

/** Ảnh chụp cuộn dài hơn khung 9:16 được giữ lâu hơn để kịp đọc hết tin nhắn. */
function storyDuration(item: PublicFeedback) {
  if (!item.width || !item.height) return STORY_MS;
  return Math.round(STORY_MS * Math.min(2.5, Math.max(1, (item.height / item.width) / (16 / 9))));
}

/**
 * Xem feedback kiểu story: thanh tiến trình theo đoạn, chạm nửa trái/phải để lùi/tiến, vuốt ngang,
 * nhấn giữ hoặc cuộn ảnh dài để tạm dừng, nút tạm dừng riêng; phím ←/→, Space, Esc trên máy tính.
 * Thanh tiêu đề và chú thích nằm ngoài ảnh để không che tin nhắn. Ảnh chụp màn hình thường hiện trọn khung;
 * ảnh chụp cuộn dài hiện vừa chiều ngang và cuộn được. Người dùng bật giảm chuyển động thì không tự chuyển ảnh.
 */
export function FeedbackViewer({ items, startIndex, onClose, onView, endAction }: {
  items: PublicFeedback[]; startIndex: number; onClose: () => void;
  onView?: (id: string) => void; endAction?: React.ReactNode;
}) {
  const [index, setIndex] = useState(startIndex);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [reading, setReading] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [scrolledId, setScrolledId] = useState<string | null>(null);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const [autoplay] = useState(() => !prefersReducedMotion());
  const dialogRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; at: number } | null>(null);
  const holdTimer = useRef<number>();
  const readTimer = useRef<number>();
  // Focus vào chính hộp thoại để phím Space tạm dừng ngay, không vô tình bấm nút Đóng.
  useDialog(dialogRef, onClose, dialogRef);

  const item = items[index];
  const last = items.length - 1;
  const loaded = loadedId === item.id;
  const running = autoplay && !paused && !holding && !reading && loaded;
  const ratio = item.width && item.height ? item.height / item.width : ratios[item.id];
  const tall = Boolean(ratio && area && Math.min(area.width, area.height / ratio) < Math.min(area.width, MIN_READABLE_WIDTH));

  // Đo khung ảnh trước khi vẽ để chọn cách hiển thị ngay từ đầu, không bị nháy bố cục.
  useLayoutEffect(() => {
    const element = mediaRef.current;
    if (!element) return;
    const measure = () => setArea({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const next = useCallback(() => {
    if (index < last) setIndex(index + 1);
    else setPaused(true);
  }, [index, last]);
  const prev = useCallback(() => {
    if (index > 0) setIndex(index - 1);
    else setCycle((value) => value + 1);
  }, [index]);

  useEffect(() => {
    onView?.(item.id);
    scrollRef.current?.scrollTo({ top: 0 });
    const upcoming = items[index + 1];
    if (upcoming) new window.Image().src = cloudinaryImage(upcoming.imageUrl, { width: 1080 });
  }, [index, item.id, items, onView]);

  useEffect(() => () => { window.clearTimeout(holdTimer.current); window.clearTimeout(readTimer.current); }, []);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    press.current = { x: event.clientX, y: event.clientY, at: Date.now() };
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => setHolding(true), 250);
  };
  const endPress = (event: React.PointerEvent, cancelled: boolean) => {
    window.clearTimeout(holdTimer.current);
    setHolding(false);
    const start = press.current;
    press.current = null;
    if (!start || cancelled) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) next(); else prev(); return; }
    // Nhấn giữ (để đọc) hoặc kéo không phải là chạm chuyển ảnh.
    if (Date.now() - start.at > 250 || Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX - rect.left < rect.width * 0.3) prev(); else next();
  };
  const onScroll = () => {
    setScrolledId(item.id);
    setReading(true);
    window.clearTimeout(readTimer.current);
    readTimer.current = window.setTimeout(() => setReading(false), 1500);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); prev(); }
    else if (event.key === ' ' && autoplay && !(event.target as HTMLElement).closest('a, button')) {
      event.preventDefault();
      setPaused((value) => !value);
    }
  };

  const segments = items.length <= MAX_SEGMENTS;
  const fill = (position: number) => <span
    key={position === index ? `${item.id}-${cycle}` : undefined}
    className={`block h-full origin-left rounded-full bg-white ${position < index || (position === index && !autoplay) ? 'scale-x-100'
      : position > index ? 'scale-x-0' : 'feedback-progress'}`}
    style={position === index && autoplay ? { animationDuration: `${storyDuration(item)}ms`, animationPlayState: running ? 'running' : 'paused' } : undefined}
    onAnimationEnd={position === index ? next : undefined} />;

  const image = <img key={item.id} src={cloudinaryImage(item.imageUrl, { width: 1080 })} draggable={false}
    width={item.width ?? undefined} height={item.height ?? undefined}
    alt={item.caption ? `Feedback: ${item.caption}` : `Ảnh chụp tin nhắn feedback ${index + 1}`}
    onLoad={(event) => {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      if (!item.width && naturalWidth) setRatios((current) => ({ ...current, [item.id]: naturalHeight / naturalWidth }));
      setLoadedId(item.id);
    }}
    onError={() => { setFailedId(item.id); setLoadedId(item.id); }}
    className={`block transition-opacity duration-300 ${tall ? 'h-auto w-full' : 'max-h-full max-w-full object-contain'} ${loaded ? 'opacity-100' : 'opacity-0'}`} />;

  const hasFooter = Boolean(item.caption || item.product || (index === last && endAction));
  const navButton = 'absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30 disabled:opacity-30 sm:grid';

  return createPortal(<div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Feedback của khách hàng" onKeyDown={onKeyDown}
    tabIndex={-1} className="fixed inset-0 z-[80] flex items-center justify-center bg-charcoal-900/95 outline-none animate-fade-in">
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <img src={cloudinaryImage(item.imageUrl, { width: 80 })} alt="" className="h-full w-full scale-125 object-cover opacity-40 blur-3xl" />
    </div>

    <button type="button" onClick={prev} disabled={index === 0 && !autoplay} aria-label="Feedback trước"
      className={`${navButton} left-4 lg:left-[calc(50%-320px)]`}><ChevronLeft className="size-6" /></button>

    <div className={`relative flex h-[100dvh] w-full max-w-[460px] flex-col overflow-hidden bg-black text-white sm:h-[min(92vh,880px)] sm:rounded-[28px] sm:shadow-2xl ${
      hasFooter ? '' : 'pb-[env(safe-area-inset-bottom)]'}`}>
      <div className="shrink-0 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex gap-1" aria-hidden>
          {segments ? items.map((entry, position) => <span key={entry.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            {fill(position)}</span>)
            : <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">{fill(index)}</span>}
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-honey-400 to-blush-500 ring-2 ring-white/70">
            <Heart className="size-4 fill-white" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">Feedback khách hàng</p>
            <p className="text-[11px] text-white/75" aria-live="polite">{index + 1}/{items.length}{reading || holding ? ' · đang tạm dừng' : ''}</p>
          </div>
          {autoplay && <button type="button" onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Tự chuyển ảnh tiếp' : 'Tạm dừng tự chuyển ảnh'}
            className="grid size-10 place-items-center rounded-full transition-colors hover:bg-white/15">
            {paused ? <Play className="size-5 fill-white" /> : <Pause className="size-5 fill-white" />}
          </button>}
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-10 place-items-center rounded-full transition-colors hover:bg-white/15">
            <X className="size-6" />
          </button>
        </div>
      </div>

      <div ref={mediaRef} onPointerDown={onPointerDown} onPointerUp={(event) => endPress(event, false)}
        onPointerCancel={(event) => endPress(event, true)} onContextMenu={(event) => event.preventDefault()}
        className="relative min-h-0 flex-1 touch-pan-y select-none">
        {tall
          ? <div ref={scrollRef} onScroll={onScroll} className="no-scrollbar h-full overflow-y-auto overscroll-contain">{image}</div>
          : <div className="flex h-full items-center justify-center">{image}</div>}
        {!loaded && <div className="absolute inset-0 grid place-items-center" role="status" aria-label="Đang tải ảnh">
          <span className="size-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        </div>}
        {failedId === item.id && <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-sm text-white/80">
          Không tải được ảnh này. Chạm để xem ảnh tiếp theo.</p>}
        {tall && loaded && scrolledId !== item.id && <span aria-hidden
          className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-charcoal-900/80 px-3 py-1.5 text-xs font-semibold shadow-lg motion-safe:animate-bounce">
          <ChevronDown className="size-4" />Kéo lên để đọc tiếp
        </span>}
      </div>

      {hasFooter && <div className="shrink-0 space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {item.caption && <p className="text-sm font-semibold leading-snug">{item.caption}</p>}
        {item.product && <Link href={`/products/${item.product.slug}`} onClick={onClose}
          className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-charcoal-900 shadow-lg transition-transform active:scale-95">
          <ShoppingBag className="size-4 shrink-0 text-honey-600" aria-hidden />
          <span className="truncate">Xem sản phẩm: {item.product.name}</span>
        </Link>}
        {index === last && endAction}
      </div>}
    </div>

    <button type="button" onClick={next} disabled={index === last} aria-label="Feedback tiếp theo"
      className={`${navButton} right-4 lg:right-[calc(50%-320px)]`}><ChevronRight className="size-6" /></button>
  </div>, document.body);
}
