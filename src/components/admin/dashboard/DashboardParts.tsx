import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

/** Thẻ số liệu: nhãn, giá trị lớn, mức thay đổi so với kỳ trước (màu theo hướng tốt/xấu, kèm mũi tên). */
export function StatTile({ label, value, change, upIsGood = true, hint, href }: {
  label: string; value: string; change?: number | null; upIsGood?: boolean; hint?: string; href?: string;
}) {
  const body = <>
    <p className="text-sm font-semibold text-charcoal-600">{label}</p>
    <p className="mt-2 font-heading text-2xl font-bold text-charcoal-900 sm:text-3xl">{value}</p>
    <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-2 text-xs">
      {change !== undefined && <ChangeBadge change={change} upIsGood={upIsGood} />}
      {hint && <span className="text-charcoal-500">{hint}</span>}
    </div>
  </>;
  const className = 'block rounded-2xl border border-cream-200 bg-white p-5 shadow-card transition duration-200';
  return href
    ? <Link href={href} className={`${className} hover:-translate-y-0.5 hover:border-honey-300 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey-500 motion-reduce:transform-none`}>{body}</Link>
    : <div className={className}>{body}</div>;
}

function ChangeBadge({ change, upIsGood }: { change: number | null; upIsGood: boolean }) {
  if (change === null) return <span className="font-semibold text-charcoal-600">Mới so với kỳ trước</span>;
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return <span className="inline-flex items-center gap-1 font-semibold text-charcoal-600">
    <Minus className="h-3.5 w-3.5" aria-hidden />Không đổi so với kỳ trước</span>;
  const good = rounded > 0 === upIsGood;
  const Icon = rounded > 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-1 font-semibold ${good ? 'text-sage-800' : 'text-blush-700'}`}>
    <Icon className="h-3.5 w-3.5" aria-hidden />
    {rounded > 0 ? '+' : ''}{rounded.toLocaleString('vi-VN')}%
    <span className="font-normal text-charcoal-500">so với kỳ trước</span>
  </span>;
}

export function Panel({ title, subtitle, action, children, className = '' }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return <section className={`min-w-0 rounded-2xl border border-cream-200 bg-white p-5 shadow-card sm:p-6 ${className}`}>
    <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-bold text-charcoal-900">{title}</h2>
        {subtitle && <p className="text-xs text-charcoal-500">{subtitle}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="flex min-h-32 items-center justify-center rounded-xl bg-cream-50 px-4 text-center text-sm text-charcoal-500">{children}</p>;
}

/**
 * Thanh ngang so sánh độ lớn: một màu, giá trị ghi ở đầu thanh, nhãn ở trên để tên dài không bị cắt.
 * Chiều dài tính theo giá trị lớn nhất trong nhóm.
 */
export function BarList({ rows, format }: {
  rows: { key: string; label: string; value: number; detail?: string; href?: string }[];
  format: (value: number) => string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <ol className="space-y-3">
    {rows.map((row, index) => <li key={row.key} className="text-sm">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        {row.href
          ? <Link href={row.href} className="min-w-0 truncate font-medium text-charcoal-800 hover:text-honey-700 hover:underline">{row.label}</Link>
          : <span className="min-w-0 truncate font-medium text-charcoal-800">{row.label}</span>}
        <span className="shrink-0 tabular-nums font-semibold text-charcoal-900">{format(row.value)}
          {row.detail && <span className="ml-1 font-normal text-charcoal-500">{row.detail}</span>}</span>
      </div>
      <div className="h-2 rounded-full bg-cream-100">
        <div className="chart-grow h-2 rounded-full bg-[#2a78d6]"
          style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, animationDelay: `${index * 60}ms` }} />
      </div>
    </li>)}
  </ol>;
}

// Bốn nhóm trạng thái đã qua kiểm tra phân biệt màu cho người mù màu; luôn kèm nhãn và số, không dựa vào màu.
export const STATUS_GROUPS = [
  { key: 'done', label: 'Hoàn tất', color: '#008300', statuses: ['COMPLETED'] },
  { key: 'progress', label: 'Đang xử lý', color: '#2a78d6', statuses: ['CONFIRMED', 'PROCESSING', 'SHIPPING'] },
  { key: 'pending', label: 'Chờ xử lý', color: '#eda100', statuses: ['PENDING'] },
  { key: 'cancelled', label: 'Đã hủy', color: '#e34948', statuses: ['CANCELLED'] },
] as const;

/** Thanh xếp chồng thể hiện tỷ lệ đơn theo trạng thái, kèm chú thích có số lượng và phần trăm. */
export function StatusBreakdown({ counts }: { counts: Record<string, number> }) {
  const groups = STATUS_GROUPS.map((group) => ({ ...group,
    count: group.statuses.reduce((sum, status) => sum + (counts[status] || 0), 0) }));
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  if (total === 0) return <EmptyState>Chưa có đơn hàng trong khoảng này.</EmptyState>;
  const percent = (count: number) => `${Math.round((count / total) * 100)}%`;
  return <div className="space-y-4">
    <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img"
      aria-label={groups.map((group) => `${group.label}: ${group.count}`).join(', ')}>
      {groups.filter((group) => group.count > 0).map((group) => <div key={group.key} title={`${group.label}: ${group.count} đơn`}
        className="chart-grow h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: group.count, background: group.color }} />)}
    </div>
    <ul className="grid grid-cols-2 gap-3">
      {groups.map((group) => <li key={group.key} className="flex items-start gap-2 text-sm">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: group.color }} aria-hidden />
        <span>
          <span className="block text-charcoal-600">{group.label}</span>
          <span className="font-semibold tabular-nums text-charcoal-900">{group.count}</span>
          <span className="ml-1 text-xs text-charcoal-500">{percent(group.count)}</span>
        </span>
      </li>)}
    </ul>
  </div>;
}
