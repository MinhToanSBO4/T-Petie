'use client';

import { useId, useState } from 'react';
import { Check, Plus } from 'lucide-react';

export type ColorPreset = { value: string; name: string };

/** "#ABC", "abc", "#AABBCC" → "#aabbcc"; null nếu không phải mã màu. */
function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  const full = /^[0-9a-f]{3}$/i.test(raw) ? raw.replace(/./g, (digit) => digit + digit) : raw;
  return /^[0-9a-f]{6}$/i.test(full) ? `#${full.toLowerCase()}` : null;
}

/** Dấu tích màu tối trên ô màu sáng, màu trắng trên ô màu đậm. */
function checkColor(hex: string) {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160 ? '#2D3142' : '#FFFFFF';
}

const swatch = 'relative flex size-8 shrink-0 items-center justify-center rounded-full border border-charcoal-900/10 transition-transform motion-safe:hover:scale-110';
const selectedRing = 'ring-2 ring-honey-600 ring-offset-2';

/**
 * Ô chọn màu gọn: bấm một màu gợi ý, mở bảng màu của hệ điều hành bằng ô "+", hoặc dán đúng mã HEX.
 * Mã đang gõ dở không ghi vào giá trị; rời ô mà mã chưa hợp lệ thì trả lại màu đang chọn.
 */
export function ColorPicker({ label, value, presets, onChange }: {
  label: string; value: string; presets: readonly ColorPreset[]; onChange: (value: string) => void;
}) {
  const labelId = useId();
  const [typing, setTyping] = useState<string | null>(null);
  const current = value.toLowerCase();
  const custom = !presets.some((preset) => preset.value.toLowerCase() === current);
  const finishTyping = () => {
    const next = typing === null ? null : normalizeHex(typing);
    if (next && next !== current) onChange(next);
    setTyping(null);
  };

  return <div role="group" aria-labelledby={labelId}>
    <span id={labelId} className="block text-sm font-semibold">{label}</span>
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3">
      <label className="flex h-11 items-center gap-2 rounded-xl border bg-white pl-1.5 pr-3 focus-within:border-honey-500">
        <span className="size-8 shrink-0 rounded-lg border border-charcoal-900/10" style={{ background: value }} aria-hidden />
        <span className="text-sm text-charcoal-400" aria-hidden>#</span>
        <input value={typing ?? current.slice(1)} aria-label="Mã màu HEX" maxLength={7}
          spellCheck={false} autoComplete="off" autoCapitalize="characters"
          onFocus={() => setTyping(current.slice(1))}
          onChange={(event) => {
            const text = event.target.value.replace(/^#/, '').slice(0, 6);
            setTyping(text);
            if (text.length === 6 && normalizeHex(text)) onChange(normalizeHex(text)!);
          }}
          onBlur={finishTyping}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }}
          className="w-[4.75rem] bg-transparent font-mono text-sm uppercase tracking-wide text-charcoal-900 outline-none" />
      </label>

      <div className="flex flex-wrap items-center gap-2.5">
        {presets.map((preset) => {
          const selected = preset.value.toLowerCase() === current;
          return <button key={preset.value} type="button" aria-pressed={selected} aria-label={preset.name}
            title={`${preset.name} · ${preset.value.toUpperCase()}`} onClick={() => onChange(preset.value.toLowerCase())}
            className={`${swatch} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-honey-500 ${selected ? selectedRing : ''}`}
            style={{ background: preset.value }}>
            {selected && <Check className="size-4" strokeWidth={3} style={{ color: checkColor(preset.value) }} aria-hidden />}
          </button>;
        })}
        <label title="Chọn màu khác"
          className={`${swatch} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-honey-500 ${custom ? selectedRing : ''}`}
          style={{ background: 'conic-gradient(#f87171, #fbbf24, #a3e635, #34d399, #38bdf8, #818cf8, #e879f9, #f87171)' }}>
          <Plus className="size-4 text-white drop-shadow" strokeWidth={3} aria-hidden />
          <input type="color" value={current} aria-label="Chọn màu khác" onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer rounded-full opacity-0" />
        </label>
      </div>
    </div>
  </div>;
}
