import { Ban, Hourglass, PackageCheck, PackageOpen, Truck, type LucideIcon } from 'lucide-react';
import { customerStatus, type StatusTone } from '@/lib/orders/status';

export const TONE_STYLES: Record<StatusTone, { badge: string; icon: LucideIcon }> = {
  pending: { badge: 'bg-honey-50 text-honey-800 ring-honey-200', icon: Hourglass },
  progress: { badge: 'bg-sky-50 text-sky-800 ring-sky-200', icon: PackageOpen },
  shipping: { badge: 'bg-sky-50 text-sky-800 ring-sky-200', icon: Truck },
  done: { badge: 'bg-sage-50 text-sage-800 ring-sage-200', icon: PackageCheck },
  cancelled: { badge: 'bg-blush-50 text-blush-700 ring-blush-200', icon: Ban },
};

/** Trạng thái đơn cho khách: biểu tượng + chữ + màu, không truyền đạt chỉ bằng màu. */
export function CustomerStatusBadge({ status }: { status: string }) {
  const copy = customerStatus(status);
  const tone = TONE_STYLES[copy.tone];
  const Icon = tone.icon;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ring-1 ${tone.badge}`}>
    <Icon className="size-3.5" aria-hidden />{copy.label}
  </span>;
}
