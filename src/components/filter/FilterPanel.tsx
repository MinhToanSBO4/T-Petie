'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { prefersReducedMotion, useDialog } from '@/hooks/useDialog';
import { activeFilterCount, EMPTY_FILTERS, type CatalogFacets, type CatalogFilters } from '@/lib/catalog/filters';
import { FilterSections, type FilterSectionOptions } from './FilterSections';

export type CatalogPreview = { total: number; facets: CatalogFacets };

/**
 * Bảng lọc trên điện thoại (bottom sheet). Chỉnh trên bản nháp; số sản phẩm và số lượng từng lựa chọn được máy chủ
 * tính lại sau mỗi lần chọn (gộp các lần bấm nhanh) để nút "Xem N sản phẩm" không dẫn tới danh sách rỗng.
 */
export function FilterPanel({ filters, initial, options, preview, onApply, onClose }: {
  filters: CatalogFilters; initial: CatalogPreview; options: FilterSectionOptions;
  preview: (draft: CatalogFilters, signal: AbortSignal) => Promise<CatalogPreview>;
  onApply: (next: CatalogFilters) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(filters);
  const [result, setResult] = useState(initial);
  const [counting, setCounting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(panelRef, onClose);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const controller = new AbortController();
    setCounting(true);
    const timer = setTimeout(() => {
      preview(draft, controller.signal)
        .then((next) => { if (!controller.signal.aborted) setResult(next); })
        .catch(() => { /* giữ số cũ; bấm "Xem" vẫn áp dụng đúng bộ lọc */ })
        .finally(() => { if (!controller.signal.aborted) setCounting(false); });
    }, 200);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [draft, preview]);

  const still = prefersReducedMotion();
  const hidden = { y: '100%' };
  const reset = { ...EMPTY_FILTERS, q: draft.q, sort: draft.sort };

  return <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-[60] bg-charcoal-900/40 backdrop-blur-sm" aria-hidden />
    <motion.div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
      initial={still ? false : hidden} animate={{ y: 0 }} exit={still ? undefined : hidden}
      transition={{ type: 'spring', damping: 28, stiffness: 240 }}
      className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[88vh] flex-col rounded-t-3xl border-t border-cream-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-cream-200 px-5 pb-3 pt-4">
        <h2 id={titleId} className="font-heading text-base font-bold text-charcoal-900">Bộ lọc</h2>
        <button type="button" onClick={onClose} aria-label="Đóng bộ lọc" className="grid size-10 place-items-center rounded-full text-charcoal-500 hover:bg-cream-100">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5">
        <FilterSections layout="grid" value={draft} facets={result.facets} options={options} onChange={setDraft} />
      </div>

      <div className="flex gap-3 border-t border-cream-200 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" disabled={activeFilterCount(draft) === 0} onClick={() => setDraft(reset)}
          className="flex-1 rounded-full border border-cream-300 py-3 text-xs font-bold text-charcoal-700 hover:bg-cream-100 disabled:opacity-50">
          Xóa bộ lọc
        </button>
        <button type="button" onClick={() => onApply({ ...draft, page: 1 })} disabled={!counting && result.total === 0}
          aria-live="polite"
          className="flex-[1.4] rounded-full bg-honey-500 py-3 text-xs font-bold text-white shadow-md hover:bg-honey-600 disabled:bg-cream-300 disabled:text-charcoal-600 disabled:shadow-none">
          {counting ? 'Đang đếm…' : result.total > 0 ? `Xem ${result.total} sản phẩm` : 'Không có sản phẩm phù hợp'}
        </button>
      </div>
    </motion.div>
  </>;
}
