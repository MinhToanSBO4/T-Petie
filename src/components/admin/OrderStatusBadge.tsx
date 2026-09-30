import { orderStatusLabel } from '@/lib/orders/status';
import { STATUS_GROUPS } from '@/components/admin/dashboard/DashboardParts';

/** Nhãn trạng thái đơn: chấm màu theo nhóm trạng thái + chữ, không truyền đạt bằng màu đơn thuần. */
export function OrderStatusBadge({ status }: { status: string }) {
  const color = STATUS_GROUPS.find((group) => (group.statuses as readonly string[]).includes(status))?.color || '#98A1B0';
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-cream-100 px-2.5 py-1 text-xs font-semibold text-charcoal-800">
    <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
    {orderStatusLabel(status)}
  </span>;
}
