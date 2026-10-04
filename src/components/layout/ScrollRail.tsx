'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prefersReducedMotion } from '@/hooks/useDialog';

const arrow = 'grid size-10 place-items-center rounded-full border border-cream-300 bg-white text-charcoal-700 shadow-sm transition-colors '
  + 'hover:bg-cream-100 hover:text-honey-700 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-charcoal-700';

/**
 * Một hàng nội dung lướt ngang của trang chủ (sản phẩm, bộ sưu tập). Hàng đầu: tiêu đề bên trái; liên kết của khối
 * và hai nút trước/sau bên phải, xếp cạnh nhau trong cùng hàng nên nút mũi tên không đè lên liên kết hay thẻ nào.
 * Điện thoại lướt bằng tay (ẩn nút); dải tràn tới mép màn hình để thẻ kế tiếp ló ra, khách biết còn lướt được.
 */
export function ScrollRail({ label, heading, action, children, headerClassName = 'mb-6' }: {
  /** Tên dải cho trình đọc màn hình. */
  label: string;
  heading: React.ReactNode;
  /** Liên kết "Xem tất cả" của khối, nằm ngay trước hai nút mũi tên. */
  action?: React.ReactNode;
  /** Các thẻ <li> của dải (đặt snap-start và bề rộng cố định). */
  children: React.ReactNode;
  headerClassName?: string;
}) {
  const id = useId();
  const scroller = useRef<HTMLUListElement>(null);
  // Chưa đo thì coi như còn nội dung phía sau: nút "tiếp" bấm được ngay, không nhấp nháy khi trang vừa tải.
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const list = scroller.current;
    if (!list) return;
    const start = list.scrollLeft < 8;
    const end = list.scrollLeft + list.clientWidth >= list.scrollWidth - 8;
    setEdges((current) => current.start === start && current.end === end ? current : { start, end });
  }, []);
  // Đo lại sau mỗi lần dựng (số thẻ đổi, ví dụ khi chọn sản phẩm trong bản xem trước của trình sửa) và khi đổi cỡ cửa sổ.
  useEffect(updateEdges);
  useEffect(() => {
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges]);

  const scrollBy = (direction: 1 | -1) => scroller.current?.scrollBy({
    left: direction * scroller.current.clientWidth * 0.9, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  return <div>
    <div className={`flex items-center justify-between gap-3 ${headerClassName}`}>
      {heading}
      <div className="flex shrink-0 items-center gap-3">
        {action}
        <div className="hidden items-center gap-2 md:flex">
          <button type="button" onClick={() => scrollBy(-1)} disabled={edges.start} aria-controls={id} aria-label="Xem phần trước" className={arrow}>
            <ChevronLeft className="size-5" aria-hidden /></button>
          <button type="button" onClick={() => scrollBy(1)} disabled={edges.end} aria-controls={id} aria-label="Xem tiếp" className={arrow}>
            <ChevronRight className="size-5" aria-hidden /></button>
        </div>
      </div>
    </div>
    {/* Chừa lề quanh thẻ để bóng và hiệu ứng nổi khi rê chuột không bị cắt ở mép dải. */}
    <ul id={id} ref={scroller} onScroll={updateEdges} aria-label={label}
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 pt-1 sm:-mx-2 sm:gap-4 sm:scroll-px-2 sm:px-2">
      {children}
    </ul>
  </div>;
}
