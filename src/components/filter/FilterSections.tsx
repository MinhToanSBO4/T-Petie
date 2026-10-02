'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { CatalogFacets, CatalogFilters, FacetOption } from '@/lib/catalog/filters';

const digits = (value: string) => {
  const number = Number(value.replace(/\D/g, ''));
  return value.trim() && Number.isSafeInteger(number) && number > 0 ? number : null;
};
const formatAmount = (value: number | null) => value === null ? '' : value.toLocaleString('vi-VN');

type ListKey = 'price' | 'sizes' | 'colors' | 'collections' | 'types';
type FlagKey = 'inStock' | 'sale' | 'isNew' | 'rating4';

export type FilterSectionOptions = {
  /** Trang theo loại (áo, váy…) không cần nhóm "Loại sản phẩm". */
  showTypes: boolean;
  /** Trang ưu đãi không cần "Đang giảm giá". */
  showSale: boolean;
  /** Trang một bộ sưu tập không cần nhóm "Bộ sưu tập". */
  showCollections: boolean;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="border-b border-cream-100 py-4 last:border-b-0">
    <legend className="mb-2.5 text-xs font-bold uppercase tracking-wider text-charcoal-900">{title}</legend>
    {children}
  </fieldset>;
}

/**
 * Lựa chọn chọn được nhiều, kèm số sản phẩm. `list`: dòng có ô đánh dấu (cột lọc máy tính, dễ quét);
 * `grid`: thẻ to dễ chạm (điện thoại). Lựa chọn tạm thời 0 kết quả bị làm mờ nhưng vẫn giữ chỗ để bố cục không nhảy.
 */
function OptionList({ options, selected, onToggle, layout, columns = 'grid-cols-2' }: {
  options: FacetOption[]; selected: string[]; onToggle: (value: string) => void; layout: 'list' | 'grid'; columns?: string;
}) {
  return <div className={layout === 'grid' ? `grid gap-2 ${columns}` : 'space-y-0.5'}>
    {options.map((option) => {
      const on = selected.includes(option.value);
      const empty = option.count === 0 && !on;
      const swatch = option.swatch && <span className="size-4 shrink-0 rounded-full border border-charcoal-900/10" style={{ background: option.swatch }} aria-hidden />;
      if (layout === 'list') {
        return <button key={option.value} type="button" role="checkbox" aria-checked={on} disabled={empty} onClick={() => onToggle(option.value)}
          className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left text-[13px] text-charcoal-800 transition-colors hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-40">
          <span className={`grid size-4 shrink-0 place-items-center rounded border ${on ? 'border-honey-500 bg-honey-500 text-white' : 'border-cream-400 bg-white'}`} aria-hidden>
            {on && <Check className="size-3" strokeWidth={3} />}
          </span>
          {swatch}
          <span className="min-w-0 flex-1">
            <span className={`block truncate ${on ? 'font-semibold text-charcoal-900' : ''}`}>{option.label}</span>
            {option.hint && <span className="block truncate text-[11px] text-charcoal-500">{option.hint}</span>}
          </span>
          <span className="shrink-0 text-[11px] text-charcoal-400">{option.count}</span>
        </button>;
      }
      return <button key={option.value} type="button" aria-pressed={on} disabled={empty} onClick={() => onToggle(option.value)}
        className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${on
          ? 'border-honey-500 bg-honey-50 text-honey-800' : 'border-cream-200 bg-cream-50 text-charcoal-700 hover:border-honey-200'} disabled:cursor-not-allowed disabled:opacity-40`}>
        <span className="flex min-w-0 items-center gap-2">
          {swatch}
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

/** Ô giá từ–đến: chỉ áp dụng khi rời ô, bấm Enter hoặc nút "Áp dụng", không lọc lại theo từng phím gõ. */
function PriceRange({ min, max, placeholder, onCommit }: {
  min: number | null; max: number | null; placeholder: { min: number; max: number } | null;
  onCommit: (min: number | null, max: number | null) => void;
}) {
  const [minText, setMinText] = useState(formatAmount(min));
  const [maxText, setMaxText] = useState(formatAmount(max));
  useEffect(() => { setMinText(formatAmount(min)); setMaxText(formatAmount(max)); }, [min, max]);
  const commit = () => {
    let low = digits(minText);
    let high = digits(maxText);
    if (low !== null && high !== null && low > high) [low, high] = [high, low];
    setMinText(formatAmount(low)); setMaxText(formatAmount(high));
    if (low !== min || high !== max) onCommit(low, high);
  };
  const changed = digits(minText) !== min || digits(maxText) !== max;
  const input = 'min-h-10 w-full min-w-0 rounded-xl border border-cream-300 bg-cream-50 px-3 text-sm focus:border-honey-500 focus:outline-none';
  return <div className="mt-3 space-y-2">
    <div className="flex items-center gap-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Giá từ (đồng)</span>
        <input value={minText} inputMode="numeric" onChange={(event) => setMinText(event.target.value)} onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }}
          placeholder={placeholder ? `Từ ${formatAmount(placeholder.min)}` : 'Từ'} className={input} />
      </label>
      <span className="text-charcoal-400" aria-hidden>–</span>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Giá đến (đồng)</span>
        <input value={maxText} inputMode="numeric" onChange={(event) => setMaxText(event.target.value)} onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }}
          placeholder={placeholder ? `Đến ${formatAmount(placeholder.max)}` : 'Đến'} className={input} />
      </label>
    </div>
    {changed && <button type="button" onClick={commit}
      className="min-h-9 w-full rounded-xl border border-honey-400 bg-honey-50 text-xs font-bold text-honey-800 hover:bg-honey-100">Áp dụng khoảng giá</button>}
  </div>;
}

/**
 * Các nhóm lọc dùng chung cho cột lọc (máy tính, áp dụng ngay) và bảng lọc (điện thoại, áp dụng khi bấm "Xem").
 * Nhóm chỉ hiện khi có ít nhất hai lựa chọn có nghĩa với danh sách đang xem.
 */
export function FilterSections({ value, facets, onChange, options, layout }: {
  value: CatalogFilters; facets: CatalogFacets; onChange: (next: CatalogFilters) => void;
  options: FilterSectionOptions; layout: 'list' | 'grid';
}) {
  const toggle = (key: ListKey, item: string) => {
    const values = value[key] as string[];
    onChange({ ...value, [key]: values.includes(item) ? values.filter((entry) => entry !== item) : [...values, item] });
  };
  const flags = ([
    { key: 'inStock', label: 'Còn hàng', count: facets.inStock },
    ...(options.showSale ? [{ key: 'sale', label: 'Đang giảm giá', count: facets.sale }] : []),
    { key: 'isNew', label: 'Hàng mới về', count: facets.isNew },
    { key: 'rating4', label: 'Đánh giá từ 4★', count: facets.rating4 },
  ] as { key: FlagKey; label: string; count: number }[]).filter((flag) => flag.count > 0 || value[flag.key]);

  return <div>
    {flags.length > 0 && <Section title="Nhanh">
      <div className="flex flex-wrap gap-2">
        {flags.map((flag) => {
          const on = value[flag.key];
          return <button key={flag.key} type="button" aria-pressed={on} onClick={() => onChange({ ...value, [flag.key]: !on })}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${on
              ? 'border-honey-500 bg-honey-500 text-white' : 'border-cream-300 bg-white text-charcoal-700 hover:bg-cream-50'}`}>
            {on && <Check className="h-3.5 w-3.5" aria-hidden />}{flag.label}
            <span className={on ? 'text-white/80' : 'text-charcoal-400'}>{flag.count}</span>
          </button>;
        })}
      </div>
    </Section>}

    {facets.sizes.length > 0 && <Section title="Size / cân nặng của bé">
      <OptionList layout={layout} options={facets.sizes} selected={value.sizes} onToggle={(item) => toggle('sizes', item)} />
      <p className="mt-2 text-[11px] text-charcoal-500">Bật “Còn hàng” để chỉ xem mẫu còn đúng size đã chọn.</p>
    </Section>}

    {options.showTypes && facets.types.length > 1 && <Section title="Loại sản phẩm">
      <OptionList layout={layout} options={facets.types} selected={value.types} onToggle={(item) => toggle('types', item)} columns="grid-cols-2 sm:grid-cols-4" />
    </Section>}

    <Section title="Khoảng giá">
      <OptionList layout={layout} options={facets.price} selected={value.price} onToggle={(item) => toggle('price', item)} />
      <PriceRange min={value.min} max={value.max} placeholder={facets.priceRange}
        onCommit={(min, max) => onChange({ ...value, min, max })} />
    </Section>

    {facets.colors.length > 1 && <Section title="Màu sắc">
      <OptionList layout={layout} options={facets.colors} selected={value.colors} onToggle={(item) => toggle('colors', item)} />
    </Section>}

    {options.showCollections && facets.collections.length > 1 && <Section title="Bộ sưu tập">
      <OptionList layout={layout} options={facets.collections} selected={value.collections} onToggle={(item) => toggle('collections', item)} />
    </Section>}
  </div>;
}
