'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatVND, formatVNDShort } from '@/lib/utils/formatters';

export type TrendPoint = { label: string; value: number; previous: number };

const HEIGHT = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 52 };
// Màu dữ liệu tách khỏi màu thương hiệu: xanh cho kỳ này, xám nhạt cho kỳ trước (làm nền so sánh).
const CURRENT = '#2a78d6';
const PREVIOUS = '#B8BFCB';

/** Bước chia trục tròn (1, 2, 5 × 10ⁿ) để nhãn trục dễ đọc. */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw) || raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, index) => index * step);
}

/**
 * Biểu đồ đường doanh thu theo thời gian: kỳ này so với kỳ trước cùng độ dài.
 * Rê chuột hoặc dùng phím mũi tên để xem số liệu từng mốc; bảng số liệu luôn mở được bên dưới.
 */
export function TrendChart({ points, currentLabel, previousLabel }: {
  points: TrendPoint[]; currentLabel: string; previousLabel: string;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    const ticks = niceTicks(Math.max(...points.map((point) => Math.max(point.value, point.previous)), 0));
    const top = ticks[ticks.length - 1];
    const plotWidth = width - PAD.left - PAD.right;
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    const x = (index: number) => PAD.left + (points.length > 1 ? (index / (points.length - 1)) * plotWidth : plotWidth / 2);
    const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;
    const line = (key: 'value' | 'previous') => points.map((point, index) =>
      `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join('');
    const baseline = y(0);
    const area = `${line('value')}L${x(points.length - 1).toFixed(1)},${baseline}L${x(0).toFixed(1)},${baseline}Z`;
    // Khoảng 6 nhãn trục X là đủ quét mắt, tránh chồng chữ trên màn hình hẹp.
    const labelEvery = Math.max(1, Math.ceil(points.length / (width < 480 ? 4 : 7)));
    return { ticks, x, y, current: line('value'), previous: line('previous'), area, baseline, labelEvery, plotWidth };
  }, [points, width]);

  const pickIndex = (clientX: number) => {
    const box = wrapper.current?.getBoundingClientRect();
    if (!box || points.length === 0) return;
    const ratio = (clientX - box.left - PAD.left) / geometry.plotWidth;
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setActive((current) => {
      const start = current ?? (event.key === 'ArrowLeft' ? points.length : -1);
      return Math.min(points.length - 1, Math.max(0, start + (event.key === 'ArrowLeft' ? -1 : 1)));
    });
  };

  const point = active === null ? null : points[active];
  const tooltipLeft = active === null ? 0 : Math.min(Math.max(geometry.x(active) - 90, 0), width - 180);

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-charcoal-600">
      <span className="flex items-center gap-2"><span className="h-0.5 w-4 rounded-full" style={{ background: CURRENT }} />{currentLabel}</span>
      <span className="flex items-center gap-2"><span className="h-0.5 w-4 rounded-full" style={{ background: PREVIOUS }} />{previousLabel}</span>
    </div>

    <div ref={wrapper} className="relative w-full min-w-0" style={{ height: HEIGHT }}>
      {width > 0 && <svg width={width} height={HEIGHT} role="img" tabIndex={0}
        aria-label={`Biểu đồ doanh thu ${points.length} mốc. Dùng phím mũi tên trái phải để xem từng mốc.`}
        onPointerMove={(event) => pickIndex(event.clientX)} onPointerLeave={() => setActive(null)}
        onKeyDown={onKeyDown} onBlur={() => setActive(null)}
        className="block touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-honey-500">
        {geometry.ticks.map((tick) => <g key={tick}>
          <line x1={PAD.left} x2={width - PAD.right} y1={geometry.y(tick)} y2={geometry.y(tick)} className="stroke-cream-200" />
          <text x={PAD.left - 8} y={geometry.y(tick)} dy="0.32em" textAnchor="end" className="fill-charcoal-500 text-[11px] tabular-nums">
            {formatVNDShort(tick)}
          </text>
        </g>)}
        {points.map((entry, index) => index % geometry.labelEvery === 0 || index === points.length - 1
          ? <text key={entry.label} x={geometry.x(index)} y={HEIGHT - 8}
            textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} className="fill-charcoal-500 text-[11px]">{entry.label}</text>
          : null)}

        <path d={geometry.previous} fill="none" stroke={PREVIOUS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={geometry.area} fill={CURRENT} fillOpacity={0.1} className="motion-safe:animate-fade-in" />
        <path d={geometry.current} fill="none" stroke={CURRENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
          className="motion-safe:animate-fade-in" />

        {point && active !== null && <g pointerEvents="none">
          <line x1={geometry.x(active)} x2={geometry.x(active)} y1={PAD.top} y2={geometry.baseline} stroke="#98A1B0" />
          <circle cx={geometry.x(active)} cy={geometry.y(point.previous)} r={4} fill={PREVIOUS} stroke="#fff" strokeWidth={2} />
          <circle cx={geometry.x(active)} cy={geometry.y(point.value)} r={5} fill={CURRENT} stroke="#fff" strokeWidth={2} />
        </g>}
      </svg>}

      {point && <div role="status" style={{ left: tooltipLeft }}
        className="pointer-events-none absolute top-0 w-[180px] rounded-xl border border-cream-200 bg-white px-3 py-2 text-xs shadow-soft">
        <p className="font-semibold text-charcoal-600">{point.label}</p>
        <p className="mt-1 flex items-center gap-2"><span className="h-0.5 w-3 rounded-full" style={{ background: CURRENT }} />
          <strong className="text-sm text-charcoal-900">{formatVND(point.value)}</strong></p>
        <p className="flex items-center gap-2 text-charcoal-600"><span className="h-0.5 w-3 rounded-full" style={{ background: PREVIOUS }} />
          {formatVND(point.previous)} <span className="text-charcoal-500">kỳ trước</span></p>
      </div>}
    </div>

    <details className="group text-sm">
      <summary className="cursor-pointer select-none text-xs font-semibold text-charcoal-600 hover:text-honey-700">Xem dạng bảng</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-cream-200">
        <table className="w-full text-left text-xs tabular-nums">
          <thead className="sticky top-0 bg-cream-50 text-charcoal-600"><tr>
            <th className="px-3 py-2">Mốc</th><th className="px-3 py-2 text-right">{currentLabel}</th><th className="px-3 py-2 text-right">{previousLabel}</th>
          </tr></thead>
          <tbody>{points.map((entry) => <tr key={entry.label} className="border-t border-cream-100">
            <td className="px-3 py-1.5">{entry.label}</td>
            <td className="px-3 py-1.5 text-right">{formatVND(entry.value)}</td>
            <td className="px-3 py-1.5 text-right text-charcoal-600">{formatVND(entry.previous)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </div>;
}
