'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check, X } from 'lucide-react';
import { FilterDropdown } from './FilterDropdown';
import {
  COLOR_FAMILIES, EMPTY_FILTERS, PRICE_PRESETS, SORT_OPTIONS, TYPE_OPTIONS,
  type CatalogFacets, type CatalogFilters, type FacetOption, type SortKey,
} from '@/lib/catalog/filters';

export type CatalogPreview = { total: number; facets: CatalogFacets };
export type FilterOptions = {
  /** Trang theo loại (áo, váy…) không cần nhóm "Loại". */
  showTypes: boolean;
  /** Trang ưu đãi không cần "Đang giảm giá". */
  showSale: boolean;
  /** Trang một bộ sưu tập không cần nhóm "Bộ sưu tập". */
  showCollections: boolean;
};
type Preview = (draft: CatalogFilters, signal: AbortSignal) => Promise<CatalogPreview>;
type Group = 'sizes' | 'types' | 'price' | 'colors' | 'collections' | 'sort';
type ListKey = 'sizes' | 'types' | 'price' | 'colors' | 'collections';

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const digits = (value: string) => {
  const number = Number(value.replace(/\D/g, ''));
  return value.trim() && Number.isSafeInteger(number) && number > 0 ? number : null;
};

/**
 * Số sản phẩm cho bản nháp đang chọn trong một dropdown, do máy chủ đếm (gộp các lần bấm nhanh), để nút
 * "Xem N sản phẩm" không dẫn tới danh sách rỗng. Chưa đổi gì thì dùng ngay số đang hiển thị.
 */
function usePreview(draft: CatalogFilters, start: CatalogFilters, initial: CatalogPreview, preview: Preview) {
  const [result, setResult] = useState(initial);
  const [counting, setCounting] = useState(false);
  const initialRef = useRef({ start: JSON.stringify(start), initial });
  useEffect(() => {
    // Chưa đổi gì so với lúc mở: dùng ngay số đang hiển thị, không hỏi máy chủ.
    if (JSON.stringify(draft) === initialRef.current.start) { setResult(initialRef.current.initial); setCounting(false); return; }
    const controller = new AbortController();
    setCounting(true);
    const timer = setTimeout(() => {
      preview(draft, controller.signal)
        .then((next) => { if (!controller.signal.aborted) setResult(next); })
        .catch(() => { /* giữ số cũ; bấm "Xem" vẫn áp dụng đúng bộ lọc */ })
        .finally(() => { if (!controller.signal.aborted) setCounting(false); });
    }, 180);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [draft, preview]);
  return { result, counting };
}

/** Một lựa chọn trong dropdown: ô đánh dấu tròn, tên, gợi ý (cân nặng/tuổi) và số sản phẩm. */
function OptionRow({ option, on, onToggle }: { option: FacetOption; on: boolean; onToggle: () => void }) {
  const empty = option.count === 0 && !on;
  return <button type="button" role="checkbox" aria-checked={on} disabled={empty} onClick={onToggle}
    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${on ? 'bg-honey-50' : 'hover:bg-cream-50'}`}>
    <span className={`grid size-[18px] shrink-0 place-items-center rounded-md border transition-colors ${on ? 'border-honey-500 bg-honey-500 text-white' : 'border-cream-400 bg-white'}`} aria-hidden>
      {on && <Check className="size-3" strokeWidth={3} />}
    </span>
    {option.swatch && <span className="size-5 shrink-0 rounded-full ring-1 ring-charcoal-900/10" style={{ background: option.swatch }} aria-hidden />}
    <span className="min-w-0 flex-1">
      <span className={`block truncate text-[13px] ${on ? 'font-semibold text-charcoal-900' : 'text-charcoal-800'}`}>{option.label}</span>
      {option.hint && <span className="block truncate text-[11px] text-charcoal-500">{option.hint}</span>}
    </span>
    <span className="shrink-0 text-[11px] tabular-nums text-charcoal-400">{option.count}</span>
  </button>;
}

/** Ô giá từ–đến trong dropdown Giá; cập nhật bản nháp khi rời ô hoặc bấm Enter. */
function PriceRange({ draft, onChange, range }: { draft: CatalogFilters; onChange: (next: CatalogFilters) => void; range: CatalogFacets['priceRange'] }) {
  const [minText, setMinText] = useState(draft.min === null ? '' : draft.min.toLocaleString('vi-VN'));
  const [maxText, setMaxText] = useState(draft.max === null ? '' : draft.max.toLocaleString('vi-VN'));
  const commit = () => {
    let min = digits(minText);
    let max = digits(maxText);
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    setMinText(min === null ? '' : min.toLocaleString('vi-VN'));
    setMaxText(max === null ? '' : max.toLocaleString('vi-VN'));
    if (min !== draft.min || max !== draft.max) onChange({ ...draft, min, max });
  };
  const input = 'h-10 w-full min-w-0 rounded-xl border border-cream-300 bg-white px-3 text-[13px] outline-none transition-colors focus:border-honey-500';
  const onKey = (event: React.KeyboardEvent) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } };
  return <div className="mt-2 border-t border-cream-100 px-3 pt-3">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">Hoặc tự nhập khoảng giá</p>
    <div className="flex items-center gap-2">
      <input aria-label="Giá từ (đồng)" inputMode="numeric" value={minText} onChange={(event) => setMinText(event.target.value)}
        onBlur={commit} onKeyDown={onKey} placeholder={range ? `Từ ${range.min.toLocaleString('vi-VN')}` : 'Từ'} className={input} />
      <span className="text-charcoal-300" aria-hidden>—</span>
      <input aria-label="Giá đến (đồng)" inputMode="numeric" value={maxText} onChange={(event) => setMaxText(event.target.value)}
        onBlur={commit} onKeyDown={onKey} placeholder={range ? `Đến ${range.max.toLocaleString('vi-VN')}` : 'Đến'} className={input} />
    </div>
  </div>;
}

/**
 * Nội dung một dropdown lọc: chọn trên bản nháp, "Xem N sản phẩm" mới áp dụng (một lần tải trang thay vì mỗi cú bấm),
 * "Bỏ chọn" xóa riêng nhóm này.
 */
function GroupPanel({ group, filters, facets, total, preview, onApply }: {
  group: ListKey; filters: CatalogFilters; facets: CatalogFacets; total: number; preview: Preview;
  onApply: (next: CatalogFilters) => void;
}) {
  const [draft, setDraft] = useState(filters);
  const { result, counting } = usePreview(draft, filters, { total, facets }, preview);
  const options = result.facets[group];
  const selected = draft[group] as string[];
  const toggle = (value: string) => setDraft((current) => {
    const values = current[group] as string[];
    return { ...current, [group]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] };
  });
  const clear = () => setDraft((current) => ({ ...current, [group]: [], ...(group === 'price' ? { min: null, max: null } : {}) }));
  const hasSelection = selected.length > 0 || (group === 'price' && (draft.min !== null || draft.max !== null));

  return <>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-1 sm:p-2">
    <div className={group === 'sizes' || group === 'colors' ? 'grid grid-cols-1 gap-0.5 sm:grid-cols-2' : 'space-y-0.5'}>
      {options.map((option) => <OptionRow key={option.value} option={option} on={selected.includes(option.value)} onToggle={() => toggle(option.value)} />)}
      {options.length === 0 && <p className="px-3 py-4 text-[13px] text-charcoal-500">Chưa có lựa chọn cho danh sách này.</p>}
    </div>
    {group === 'price' && <PriceRange draft={draft} onChange={setDraft} range={result.facets.priceRange} />}
    </div>
    <div className="flex items-center gap-2 border-t border-cream-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
      <button type="button" onClick={clear} disabled={!hasSelection}
        className="h-10 rounded-full px-4 text-[13px] font-semibold text-charcoal-600 transition-colors hover:bg-cream-100 disabled:opacity-40">Bỏ chọn</button>
      <button type="button" onClick={() => onApply({ ...draft, page: 1 })} disabled={!counting && result.total === 0} aria-live="polite"
        className="h-10 flex-1 rounded-full bg-charcoal-900 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-charcoal-800 disabled:bg-cream-300 disabled:text-charcoal-500">
        {counting ? 'Đang đếm…' : result.total > 0 ? `Xem ${result.total} sản phẩm` : 'Không có sản phẩm phù hợp'}
      </button>
    </div>
  </>;
}

type Chip = { key: string; label: string; remove: CatalogFilters };

/** Các bộ lọc đang áp dụng, mỗi cái bỏ được bằng một chạm. */
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
  for (const value of filters.colors) chips.push({ key: `color-${value}`, label: COLOR_FAMILIES.find((family) => family.value === value)!.label,
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
 * Thanh lọc phía trên danh sách sản phẩm: mỗi nhóm (Size, Loại, Giá, Màu, Bộ sưu tập) là một nút mở dropdown,
 * vài lọc nhanh bật/tắt một chạm, bên dưới là số kết quả, các lọc đang áp dụng và cách sắp xếp.
 * Nhóm chỉ hiện khi có ít nhất hai lựa chọn có nghĩa với danh sách đang xem.
 */
export function FilterBar({ filters, facets, total, onChange, options, preview }: {
  filters: CatalogFilters; facets: CatalogFacets; total: number;
  onChange: (next: CatalogFilters) => void; options: FilterOptions; preview: Preview;
}) {
  const [open, setOpen] = useState<Group | null>(null);
  const toggleOpen = useCallback((group: Group) => (next: boolean) => setOpen(next ? group : null), []);
  const apply = (next: CatalogFilters) => { setOpen(null); onChange(next); };
  const collectionNames = new Map(facets.collections.map((option) => [option.value, option.label]));
  const chips = appliedChips(filters, collectionNames);

  const groups: { key: ListKey; label: string; count: number; show: boolean }[] = [
    { key: 'sizes', label: 'Size', count: filters.sizes.length, show: facets.sizes.length > 0 },
    { key: 'types', label: 'Loại', count: filters.types.length, show: options.showTypes && facets.types.length > 1 },
    { key: 'price', label: 'Giá', count: filters.price.length + (filters.min !== null || filters.max !== null ? 1 : 0), show: true },
    { key: 'colors', label: 'Màu', count: filters.colors.length, show: facets.colors.length > 1 },
    { key: 'collections', label: 'Bộ sưu tập', count: filters.collections.length, show: options.showCollections && facets.collections.length > 1 },
  ];
  const toggles = ([
    { key: 'inStock', label: 'Còn hàng', count: facets.inStock },
    { key: 'isNew', label: 'Hàng mới', count: facets.isNew },
    ...(options.showSale ? [{ key: 'sale', label: 'Đang giảm giá', count: facets.sale }] : []),
  ] as { key: 'inStock' | 'isNew' | 'sale'; label: string; count: number }[]).filter((item) => item.count > 0 || filters[item.key]);
  const sortLabel = SORT_OPTIONS.find((option) => option.value === filters.sort)?.label || SORT_OPTIONS[0].label;

  return <div className="mb-6">
    <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {groups.filter((group) => group.show).map((group) => <FilterDropdown key={group.key} label={group.label} count={group.count}
        open={open === group.key} onOpenChange={toggleOpen(group.key)} bare width={group.key === 'sizes' || group.key === 'colors' ? 420 : 340}>
        <GroupPanel group={group.key} filters={filters} facets={facets} total={total} preview={preview} onApply={apply} />
      </FilterDropdown>)}
      {toggles.length > 0 && <span className="mx-1 h-5 w-px shrink-0 bg-cream-300" aria-hidden />}
      {toggles.map((item) => {
        const on = filters[item.key];
        return <button key={item.key} type="button" aria-pressed={on} onClick={() => onChange({ ...filters, [item.key]: !on, page: 1 })}
          className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors ${on
            ? 'border-honey-400 bg-honey-50 text-honey-800' : 'border-cream-300 bg-white text-charcoal-700 hover:border-charcoal-300 hover:text-charcoal-900'}`}>
          {on && <Check className="size-3.5" strokeWidth={2.5} aria-hidden />}{item.label}
        </button>;
      })}
    </div>

    <div className="mt-3 flex items-center justify-between gap-3 border-t border-cream-200 pt-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <p className="shrink-0 text-[13px] text-charcoal-600" aria-live="polite"><strong className="font-semibold text-charcoal-900">{total}</strong> sản phẩm</p>
        {chips.length > 0 && <>
          <span className="text-cream-400" aria-hidden>·</span>
          {chips.map((chip) => <button key={chip.key} type="button" onClick={() => onChange({ ...chip.remove, page: 1 })} aria-label={`Bỏ lọc ${chip.label}`}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-cream-100 pl-2.5 pr-1.5 text-xs font-medium text-charcoal-800 transition-colors hover:bg-honey-100">
            {chip.label}<X className="size-3 text-charcoal-500" aria-hidden />
          </button>)}
          <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q, sort: filters.sort })}
            className="h-7 px-1.5 text-xs font-semibold text-charcoal-500 underline-offset-4 hover:text-charcoal-900 hover:underline">Xóa tất cả</button>
        </>}
      </div>
      <FilterDropdown label={`Sắp xếp: ${sortLabel}`} display={<><ArrowUpDown className="size-3.5 opacity-60 sm:hidden" aria-hidden />
        <span className="hidden text-charcoal-500 sm:inline">Sắp xếp:</span>{sortLabel}</>} open={open === 'sort'} onOpenChange={toggleOpen('sort')} width={240} align="right">
        <div className="space-y-0.5" role="listbox" aria-label="Sắp xếp">
          {SORT_OPTIONS.map((option) => {
            const on = option.value === filters.sort;
            return <button key={option.value} type="button" role="option" aria-selected={on}
              onClick={() => apply({ ...filters, sort: option.value as SortKey, page: 1 })}
              className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[13px] transition-colors ${on ? 'bg-honey-50 font-semibold text-charcoal-900' : 'text-charcoal-700 hover:bg-cream-50'}`}>
              {option.label}{on && <Check className="size-4 text-honey-600" aria-hidden />}
            </button>;
          })}
        </div>
      </FilterDropdown>
    </div>
  </div>;
}
