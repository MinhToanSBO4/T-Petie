'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowUpDown, SlidersHorizontal, X } from 'lucide-react';
import { FilterPanel, type CatalogPreview } from './FilterPanel';
import type { FilterSectionOptions } from './FilterSections';
import {
  activeFilterCount, COLOR_FAMILIES, EMPTY_FILTERS, PRICE_PRESETS, SORT_OPTIONS, TYPE_OPTIONS,
  type CatalogFacets, type CatalogFilters, type SortKey,
} from '@/lib/catalog/filters';

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

type Chip = { key: string; label: string; remove: CatalogFilters };

/** Các bộ lọc đang áp dụng, mỗi cái bỏ được bằng một chạm (theo khuyến nghị "Applied Filters Overview" của Baymard). */
function appliedChips(filters: CatalogFilters, collectionNames: Map<string, string>): Chip[] {
  const without = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => ({ ...filters, [key]: value });
  const chips: Chip[] = [];
  for (const value of filters.sizes) chips.push({ key: `size-${value}`, label: value, remove: without('sizes', filters.sizes.filter((item) => item !== value)) });
  for (const value of filters.types) chips.push({ key: `type-${value}`, label: TYPE_OPTIONS.find((option) => option.value === value)!.label,
    remove: without('types', filters.types.filter((item) => item !== value)) });
  for (const value of filters.price) chips.push({ key: `price-${value}`, label: PRICE_PRESETS.find((preset) => preset.value === value)!.label,
    remove: without('price', filters.price.filter((item) => item !== value)) });
  if (filters.min !== null || filters.max !== null) chips.push({ key: 'range',
    label: filters.min !== null && filters.max !== null ? `${money(filters.min)} – ${money(filters.max)}`
      : filters.min !== null ? `Từ ${money(filters.min)}` : `Đến ${money(filters.max!)}`,
    remove: { ...filters, min: null, max: null } });
  for (const value of filters.colors) chips.push({ key: `color-${value}`, label: `Màu ${COLOR_FAMILIES.find((family) => family.value === value)!.label.toLowerCase()}`,
    remove: without('colors', filters.colors.filter((item) => item !== value)) });
  for (const value of filters.collections) chips.push({ key: `collection-${value}`, label: collectionNames.get(value) || value,
    remove: without('collections', filters.collections.filter((item) => item !== value)) });
  if (filters.inStock) chips.push({ key: 'stock', label: 'Còn hàng', remove: without('inStock', false) });
  if (filters.sale) chips.push({ key: 'sale', label: 'Đang giảm giá', remove: without('sale', false) });
  if (filters.isNew) chips.push({ key: 'new', label: 'Hàng mới về', remove: without('isNew', false) });
  if (filters.rating4) chips.push({ key: 'rating', label: 'Từ 4★', remove: without('rating4', false) });
  return chips;
}

/**
 * Thanh trên danh sách sản phẩm. Điện thoại: nút "Bộ lọc" (kèm số bộ lọc đang bật) mở bảng lọc, cạnh đó các lọc nhanh
 * hay dùng (loại sản phẩm, còn hàng, hàng mới) bấm là áp dụng. Mọi kích thước: dòng bộ lọc đang áp dụng có nút bỏ
 * từng cái, số kết quả và ô sắp xếp.
 */
export function FilterBar({ filters, facets, total, onChange, options, preview, compact = false }: {
  filters: CatalogFilters; facets: CatalogFacets; total: number;
  /** Không có cột lọc bên cạnh: nút "Bộ lọc" hiện cả trên máy tính. */
  compact?: boolean;
  onChange: (next: CatalogFilters) => void; options: FilterSectionOptions;
  preview: (draft: CatalogFilters, signal: AbortSignal) => Promise<CatalogPreview>;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = activeFilterCount(filters);
  const collectionNames = new Map(facets.collections.map((option) => [option.value, option.label]));
  const chips = appliedChips(filters, collectionNames);
  const typeChips = options.showTypes ? facets.types.filter((option) => option.count > 0 || (filters.types as string[]).includes(option.value)) : [];
  const flagChips = ([
    { key: 'inStock', label: 'Còn hàng', count: facets.inStock },
    ...(options.showSale ? [{ key: 'sale', label: 'Đang giảm giá', count: facets.sale }] : []),
    { key: 'isNew', label: 'Hàng mới về', count: facets.isNew },
  ] as { key: 'inStock' | 'sale' | 'isNew'; label: string; count: number }[]).filter((item) => item.count > 0 || filters[item.key]);
  const chipClass = (on: boolean) => `min-h-9 shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${on
    ? 'border-honey-500 bg-honey-500 text-white' : 'border-cream-300 bg-white text-charcoal-700 hover:bg-cream-50'}`;

  return (
    <div className="mb-5 space-y-3">
      <div className={`no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 ${compact ? '' : 'lg:hidden'}`}>
        <button type="button" onClick={() => setPanelOpen(true)} data-track="open-filter-drawer" aria-haspopup="dialog"
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition-colors ${active
            ? 'border-honey-500 bg-honey-50 text-honey-800' : 'border-cream-300 bg-white text-charcoal-800 hover:bg-cream-50'}`}>
          <SlidersHorizontal className="h-3.5 w-3.5 text-honey-600" aria-hidden />
          <span>Bộ lọc</span>
          {active > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-honey-500 px-1 text-[11px] font-bold text-white">{active}</span>}
        </button>
        {typeChips.map((option) => {
          const on = filters.types.includes(option.value as CatalogFilters['types'][number]);
          return <button key={option.value} type="button" aria-pressed={on} className={chipClass(on)}
            onClick={() => onChange({ ...filters, types: on ? filters.types.filter((item) => item !== option.value)
              : [...filters.types, option.value as CatalogFilters['types'][number]] })}>{option.label}</button>;
        })}
        {flagChips.map((item) => {
          const on = filters[item.key];
          return <button key={item.key} type="button" aria-pressed={on} onClick={() => onChange({ ...filters, [item.key]: !on })}
            className={chipClass(on)}>{item.label}</button>;
        })}
      </div>

      {chips.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang áp dụng">
        {chips.map((chip) => <button key={chip.key} type="button" onClick={() => onChange(chip.remove)} aria-label={`Bỏ lọc ${chip.label}`}
          className="inline-flex min-h-8 items-center gap-1 rounded-full bg-cream-100 py-1 pl-3 pr-2 text-xs font-semibold text-charcoal-800 hover:bg-honey-100">
          {chip.label}<X className="h-3.5 w-3.5 text-charcoal-500" aria-hidden />
        </button>)}
        <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q, sort: filters.sort })}
          className="min-h-8 px-2 text-xs font-bold text-honey-700 hover:underline">Xóa tất cả</button>
      </div>}

      {/* Dòng tóm tắt kết quả & sắp xếp */}
      <div className="flex items-center justify-between gap-3 border-t border-cream-200 pt-2 text-xs text-charcoal-500">
        <p aria-live="polite"><strong className="font-bold text-charcoal-900">{total}</strong> sản phẩm</p>
        <label className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-charcoal-400" aria-hidden />
          <span className="hidden sm:inline">Sắp xếp:</span>
          <span className="sr-only sm:hidden">Sắp xếp</span>
          <select value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as SortKey })}
            className="min-h-9 cursor-pointer rounded-lg bg-transparent font-semibold text-charcoal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-honey-300">
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {/* Gắn thẳng vào body: khung trang có hiệu ứng chuyển động (transform) sẽ làm lớp phủ cố định bị lệch. */}
      {mounted && createPortal(<AnimatePresence>
        {panelOpen && <FilterPanel filters={filters} initial={{ total, facets }} options={options} preview={preview}
          onApply={(next) => { onChange(next); setPanelOpen(false); }} onClose={() => setPanelOpen(false)} />}
      </AnimatePresence>, document.body)}
    </div>
  );
}
