'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';

const PANEL_WIDTH = 360;

/**
 * Nút lọc dạng "Size ▾" trên thanh lọc và khung chọn mở ra từ nút đó.
 * Máy tính: khung nổi ngay dưới nút (gắn vào body để không bị thanh cuộn ngang cắt mất).
 * Điện thoại: tấm chọn trượt từ dưới lên, dễ chạm. Esc, bấm ra ngoài hoặc nút đóng để tắt.
 */
export function FilterDropdown({ label, display, count = 0, open, onOpenChange, children, width = PANEL_WIDTH, align = 'left', bare = false }: {
  label: string;
  /** Nội dung hiển thị trên nút nếu khác `label` (ví dụ rút gọn trên điện thoại); `label` vẫn là tên đọc cho trình đọc màn hình. */
  display?: React.ReactNode; count?: number; open: boolean; onOpenChange: (open: boolean) => void;
  children: React.ReactNode; width?: number; align?: 'left' | 'right';
  /** Nội dung tự lo vùng cuộn và chân khung (dropdown lọc có nút "Xem N sản phẩm" luôn hiện). */
  bare?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [mobile, setMobile] = useState(false);
  const active = count > 0;

  // Vị trí khung theo nút; cập nhật khi cuộn trang, cuộn thanh lọc hoặc đổi cỡ cửa sổ.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const small = window.innerWidth < 640;
      setMobile(small);
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect || small) return;
      const panel = Math.min(width, window.innerWidth - 32);
      const preferred = align === 'right' ? rect.right - panel : rect.left;
      setPosition({ top: rect.bottom + 8, left: Math.max(16, Math.min(preferred, window.innerWidth - panel - 16)) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, width, align]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onOpenChange(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    // Điện thoại: khóa cuộn trang phía sau tấm chọn.
    const previous = document.body.style.overflow;
    if (window.innerWidth < 640) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onOpenChange]);

  const panel = open && (mobile || position) && createPortal(<>
    {mobile && <div className="fixed inset-0 z-[60] bg-charcoal-900/30 backdrop-blur-[2px] motion-safe:animate-fade-in" aria-hidden />}
    <div ref={panelRef} id={panelId} role="dialog" aria-label={label}
      style={mobile ? undefined : { top: position!.top, left: position!.left, width: Math.min(width, window.innerWidth - 32) }}
      className={mobile
        ? 'fixed inset-x-0 bottom-0 z-[61] flex max-h-[80vh] flex-col rounded-t-3xl bg-white shadow-2xl motion-safe:animate-slide-up'
        : 'fixed z-[61] flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-[0_18px_40px_-12px_rgba(60,40,20,0.22)] motion-safe:animate-scale-up'}>
      {mobile && <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <span className="font-heading text-base font-bold text-charcoal-900">{label}</span>
        <button type="button" onClick={() => onOpenChange(false)} aria-label="Đóng"
          className="grid size-9 place-items-center rounded-full text-charcoal-500 hover:bg-cream-100"><X className="size-5" aria-hidden /></button>
      </div>}
      {bare ? <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        : <div className={`flex-1 overflow-y-auto overscroll-contain ${mobile ? 'px-5 pb-[max(1rem,env(safe-area-inset-bottom))]' : 'p-2'}`}>{children}</div>}
    </div>
  </>, document.body);

  return <>
    <button ref={buttonRef} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}
      onClick={() => onOpenChange(!open)}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors ${active
        ? 'border-honey-400 bg-honey-50 text-honey-800'
        : open ? 'border-charcoal-300 bg-white text-charcoal-900' : 'border-cream-300 bg-white text-charcoal-700 hover:border-charcoal-300 hover:text-charcoal-900'}`}>
      <span className="inline-flex items-center gap-1.5" aria-label={display ? label : undefined}>{display ?? label}</span>
      {active && <span className="grid min-w-[18px] place-items-center rounded-full bg-honey-500 px-1 text-[10px] font-bold leading-[18px] text-white">{count}</span>}
      <ChevronDown className={`size-3.5 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
    </button>
    {panel}
  </>;
}
