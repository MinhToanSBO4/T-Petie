'use client';

import { useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { prefersReducedMotion, useDialog } from '@/hooks/useDialog';
import { EMPTY_FILTERS, type CatalogFacets, type CatalogFilters, type FacetOption } from '@/lib/catalog/filters';

const digits = (value: string) => {
  const number = Number(value.replace(/\D/g, ''));
  return value.trim() && Number.isSafeInteger(number) && number > 0 ? number : null;
};
const formatAmount = (value: number | null) => value === null ? '' : value.toLocaleString('vi-VN');

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-b border-cream-100 py-4">
    <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-charcoal-900">{title}</h3>
    {children}
  </section>;
}

/** Lựa chọn dạng thẻ, chọn được nhiều; lựa chọn tạm thời 0 kết quả bị làm mờ nhưng vẫn giữ chỗ. */
function OptionChips({ options, selected, onToggle, columns = 'grid-cols-2' }: {
  options: FacetOption[]; selected: string[]; onToggle: (value: string) => void; columns?: string;
}) {
  return <div className={`grid gap-2 ${columns}`}>
    {options.map((option) => {
      const on = selected.includes(option.value);
      const empty = option.count === 0 && !on;
      return <button key={option.value} type="button" aria-pressed={on} disabled={empty} onClick={() => onToggle(option.value)}
        className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${on
          ? 'border-honey-500 bg-honey-50 text-honey-800' : 'border-cream-200 bg-cream-50 text-charcoal-700 hover:border-honey-200'} disabled:cursor-not-allowed disabled:opacity-40`}>
        <span className="flex min-w-0 items-center gap-2">
          {option.swatch && <span className="size-4 shrink-0 rounded-full border border-charcoal-900/10" style={{ background: option.swatch }} aria-hidden />}
          <span className="min-w-0">
            <span className="block truncate">{option.label}</span>
            {option.hint && <span className="block truncate text-[11px] font-normal text-charcoal-500">{option.hint}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-normal text-charcoal-500">
          {on ? <Check className="h-3.5 w-3.5 text-honey-600" aria-hidden /> : option.count}
        </span>
      </button>;
    })}
  </div>;
}

/**
 * Bảng lọc đầy đủ: bottom sheet trên điện thoại, ngăn bên phải trên máy tính. Chỉnh trên bản nháp, số sản phẩm
 * hiện ngay trên nút "Xem N sản phẩm" để không bấm áp dụng ra danh sách rỗng.
 */
export function FilterPanel({ filters, facetsFor, showTypes, countFor, onApply, onClose }: {
  filters: CatalogFilters; facetsFor: (draft: CatalogFilters) => CatalogFacets; showTypes: boolean;
  countFor: (draft: CatalogFilters) => number; onApply: (next: CatalogFilters) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(filters);
  const [minText, setMinText] = useState(formatAmount(filters.min));
  const [maxText, setMaxText] = useState(formatAmount(filters.max));
  // Bảng chỉ mở sau khi bấm (không dựng ở máy chủ) nên đọc được kích thước màn hình ngay lần dựng đầu.
  const [desktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(panelRef, onClose);

  const facets = facetsFor(draft);
  const count = countFor(draft);
  const toggle = <K extends 'price' | 'sizes' | 'colors' | 'collections' | 'types'>(key: K, value: string) =>
    setDraft((current) => {
      const values = current[key] as string[];
      return { ...current, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] };
    });
  const setRange = (which: 'min' | 'max', text: string) => {
    if (which === 'min') setMinText(text); else setMaxText(text);
    setDraft((current) => ({ ...current, [which]: digits(text) }));
  };
  const apply = () => {
    const next = { ...draft };
    if (next.min !== null && next.max !== null && next.min > next.max) [next.min, next.max] = [next.max, next.min];
    onApply(next);
  };
  const flags = [
    { key: 'inStock' as const, label: 'Còn hàng', count: facets.inStock },
    { key: 'sale' as const, label: 'Đang giảm giá', count: facets.sale },
    { key: 'isNew' as const, label: 'Hàng mới về', count: facets.isNew },
    { key: 'rating4' as const, label: 'Đánh giá từ 4★', count: facets.rating4 },
  ].filter((flag) => flag.count > 0 || draft[flag.key]);
  const still = prefersReducedMotion();
  const hidden = desktop ? { x: '100%' } : { y: '100%' };

  return <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-[60] bg-charcoal-900/40 backdrop-blur-sm" aria-hidden />
    <motion.div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
      initial={still ? false : hidden} animate={{ x: 0, y: 0 }} exit={still ? undefined : hidden}
      transition={{ type: 'spring', damping: 28, stiffness: 240 }}
      className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[88vh] flex-col rounded-t-3xl border-t border-cream-200 bg-white shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-l-3xl md:rounded-tr-none md:border-l md:border-t-0">
      <div className="flex items-center justify-between border-b border-cream-200 px-5 pb-3 pt-4">
        <h2 id={titleId} className="font-heading text-base font-bold text-charcoal-900">Bộ Lọc Tìm Kiếm</h2>
        <button type="button" onClick={onClose} aria-label="Đóng bộ lọc" className="rounded-full p-1.5 text-charcoal-400 hover:bg-cream-100">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        <Section title="Khoảng Giá">
          <OptionChips options={facets.price} selected={draft.price} onToggle={(value) => toggle('price', value)} />
          <div className="mt-3 flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">Giá từ</span>
              <input value={minText} inputMode="numeric" onChange={(event) => setRange('min', event.target.value)}
                onBlur={() => setMinText(formatAmount(digits(minText)))}
                placeholder={facets.priceRange ? `Từ ${formatAmount(facets.priceRange.min)}` : 'Từ'}
                className="min-h-11 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 text-sm focus:border-honey-500 focus:outline-none" />
            </label>
            <span className="text-charcoal-400" aria-hidden>–</span>
            <label className="flex-1">
              <span className="sr-only">Giá đến</span>
              <input value={maxText} inputMode="numeric" onChange={(event) => setRange('max', event.target.value)}
                onBlur={() => setMaxText(formatAmount(digits(maxText)))}
                placeholder={facets.priceRange ? `Đến ${formatAmount(facets.priceRange.max)}` : 'Đến'}
                className="min-h-11 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 text-sm focus:border-honey-500 focus:outline-none" />
            </label>
            <span className="text-xs text-charcoal-500">đ</span>
          </div>
        </Section>

        {facets.sizes.length > 0 && <Section title="Size / Cân Nặng Của Bé">
          <OptionChips options={facets.sizes} selected={draft.sizes} onToggle={(value) => toggle('sizes', value)} />
          <p className="mt-2 text-[11px] text-charcoal-500">Bật “Còn hàng” để chỉ xem mẫu còn đúng size đã chọn.</p>
        </Section>}

        {showTypes && facets.types.length > 1 && <Section title="Loại Sản Phẩm">
          <OptionChips options={facets.types} selected={draft.types} onToggle={(value) => toggle('types', value)} columns="grid-cols-2 sm:grid-cols-4" />
        </Section>}

        {facets.colors.length > 1 && <Section title="Màu Sắc">
          <OptionChips options={facets.colors} selected={draft.colors} onToggle={(value) => toggle('colors', value)} />
        </Section>}

        {facets.collections.length > 1 && <Section title="Bộ Sưu Tập">
          <OptionChips options={facets.collections} selected={draft.collections} onToggle={(value) => toggle('collections', value)} />
        </Section>}

        {flags.length > 0 && <Section title="Khác">
          <div className="flex flex-wrap gap-2">
            {flags.map((flag) => {
              const on = draft[flag.key];
              return <button key={flag.key} type="button" aria-pressed={on} onClick={() => setDraft((current) => ({ ...current, [flag.key]: !on }))}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${on
                  ? 'border-honey-500 bg-honey-500 text-white' : 'border-cream-300 bg-white text-charcoal-700 hover:bg-cream-50'}`}>
                {on && <Check className="h-3.5 w-3.5" aria-hidden />}{flag.label}
                <span className={on ? 'text-white/80' : 'text-charcoal-400'}>{flag.count}</span>
              </button>;
            })}
          </div>
        </Section>}
      </div>

      <div className="flex gap-3 border-t border-cream-200 bg-white px-5 py-4">
        <button type="button" onClick={() => { setDraft({ ...EMPTY_FILTERS, q: draft.q, sort: draft.sort }); setMinText(''); setMaxText(''); }}
          className="flex-1 rounded-full border border-cream-300 py-3 text-xs font-bold text-charcoal-700 hover:bg-cream-100">
          Xóa Bộ Lọc
        </button>
        <button type="button" onClick={apply} disabled={count === 0}
          className="flex-[1.4] rounded-full bg-honey-500 py-3 text-xs font-bold text-white shadow-md hover:bg-honey-600 disabled:bg-cream-300 disabled:text-charcoal-600 disabled:shadow-none">
          {count > 0 ? `Xem ${count} sản phẩm` : 'Không có sản phẩm phù hợp'}
        </button>
      </div>
    </motion.div>
  </>;
}
