'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pageWindow } from '@/lib/catalog/page-window';

/**
 * Phân trang danh sách. Mỗi số là một liên kết thật (máy tìm kiếm đi theo được, mở tab mới được); bấm thường thì
 * chuyển trang tại chỗ qua `onPage` để giữ hiệu ứng chờ và cuộn về đầu danh sách.
 */
export function Pagination({ page, pages, hrefFor, onPage }: {
  page: number; pages: number; hrefFor: (page: number) => string; onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const go = (target: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onPage(target);
  };
  const arrow = 'grid size-10 place-items-center rounded-full border border-cream-300 bg-white text-charcoal-700 transition-colors hover:border-honey-400 hover:text-honey-700';
  return <nav aria-label="Phân trang" className="mt-8 flex flex-col items-center gap-2">
    <div className="flex items-center gap-1.5">
      {page > 1
        ? <Link href={hrefFor(page - 1)} onClick={go(page - 1)} prefetch={false} rel="prev" className={arrow} aria-label="Trang trước">
            <ChevronLeft className="size-4" aria-hidden /></Link>
        : <span className={`${arrow} pointer-events-none opacity-40`} aria-hidden><ChevronLeft className="size-4" /></span>}
      {pageWindow(page, pages).map((item, index) => item === 'gap'
        ? <span key={`gap-${index}`} className="w-6 text-center text-sm text-charcoal-400" aria-hidden>…</span>
        : <Link key={item} href={hrefFor(item)} onClick={go(item)} prefetch={false} aria-current={item === page ? 'page' : undefined}
            aria-label={`Trang ${item}`}
            className={`grid min-w-10 place-items-center rounded-full px-2 text-sm font-semibold transition-colors ${item === page
              ? 'h-10 bg-honey-500 text-white shadow-sm' : 'h-10 border border-cream-300 bg-white text-charcoal-700 hover:border-honey-400 hover:text-honey-700'}`}>
            {item}
          </Link>)}
      {page < pages
        ? <Link href={hrefFor(page + 1)} onClick={go(page + 1)} prefetch={false} rel="next" className={arrow} aria-label="Trang sau">
            <ChevronRight className="size-4" aria-hidden /></Link>
        : <span className={`${arrow} pointer-events-none opacity-40`} aria-hidden><ChevronRight className="size-4" /></span>}
    </div>
    <p className="text-xs text-charcoal-500">Trang {page}/{pages}</p>
  </nav>;
}
