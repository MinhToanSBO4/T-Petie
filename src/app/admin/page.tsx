import Link from 'next/link';
import { AlertTriangle, PackageSearch } from 'lucide-react';
import { requireAdminPage } from '@/server/auth/staff-session';
import { getDashboardData, LOW_STOCK_THRESHOLD } from '@/server/admin/dashboard';
import { DASHBOARD_RANGES, bucketLabel, parseRange, percentChange } from '@/lib/admin/dashboard-range';
import { formatVND, formatVNDShort } from '@/lib/utils/formatters';
import { TrendChart } from '@/components/admin/dashboard/TrendChart';
import { RefreshButton } from '@/components/admin/dashboard/RefreshButton';
import { BarList, EmptyState, Panel, StatTile, StatusBreakdown } from '@/components/admin/dashboard/DashboardParts';
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge';
import { autoCompleteShippedOrders } from '@/server/orders/order-status';

export const dynamic = 'force-dynamic';

/** "01/10 · 09:05" theo giờ Việt Nam, bất kể múi giờ máy chủ. */
function time(value: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit',
    month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month} · ${parts.hour}:${parts.minute}`;
}
const percentText = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

export default async function AdminPage({ searchParams }: { searchParams: { range?: string } }) {
  await requireAdminPage('/admin');
  const range = parseRange(searchParams.range);
  // Hoàn tất các đơn giao quá hạn trước khi đọc số liệu (tự giới hạn tần suất).
  await autoCompleteShippedOrders();
  const data = await getDashboardData(range);
  const { current, previous } = data;
  const averageOrder = (totals: typeof current) => totals.completed ? totals.revenue / totals.completed : 0;
  const cancelRate = (totals: typeof current) => {
    const all = totals.orders + totals.cancelled;
    return all ? (totals.cancelled / all) * 100 : 0;
  };
  const rangeLabel = DASHBOARD_RANGES[range].label;
  const attention = data.pendingNow + data.lowStock.total;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal-900">Tổng quan</h1>
        <p className="text-sm text-charcoal-500">Cập nhật lúc {time(data.generatedAt)}</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <RefreshButton />
      <nav aria-label="Khoảng thời gian" className="grid w-full grid-cols-4 rounded-xl border border-cream-300 bg-white p-1 sm:flex sm:w-auto">
        {Object.entries(DASHBOARD_RANGES).map(([key, option]) => <Link key={key} href={`/admin?range=${key}`} scroll={false}
          aria-current={key === range ? 'page' : undefined}
          className={`min-h-9 whitespace-nowrap rounded-lg px-2 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${key === range
            ? 'bg-honey-600 text-white shadow-sm' : 'text-charcoal-600 hover:bg-honey-100 hover:text-honey-800'}`}>
          {option.label}
        </Link>)}
      </nav>
      </div>
    </header>

    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Doanh thu hoàn tất" value={formatVND(current.revenue)}
        change={percentChange(current.revenue, previous.revenue)} />
      <StatTile label="Đơn hàng" value={current.orders.toLocaleString('vi-VN')} hint="không tính đơn hủy"
        change={percentChange(current.orders, previous.orders)} />
      <StatTile label="Giá trị trung bình / đơn" value={formatVND(averageOrder(current))}
        change={percentChange(averageOrder(current), averageOrder(previous))} />
      <StatTile label="Tỷ lệ hủy đơn" value={percentText(cancelRate(current))}
        hint={`Kỳ trước ${percentText(cancelRate(previous))}`} />
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      <Panel title="Doanh thu theo thời gian" subtitle={`Đơn hoàn tất · ${rangeLabel} gần nhất so với kỳ trước`} className="xl:col-span-2">
        {current.revenue === 0 && previous.revenue === 0
          ? <EmptyState>Chưa có đơn hoàn tất trong {rangeLabel.toLowerCase()} gần nhất.</EmptyState>
          : <TrendChart currentLabel="Kỳ này" previousLabel="Kỳ trước"
            points={data.trend.map((point) => ({ label: bucketLabel(point.key), value: point.revenue, previous: point.prevRevenue }))} />}
      </Panel>

      <Panel title="Cần chú ý" subtitle={attention ? `${attention} việc cần xử lý` : 'Mọi thứ đều ổn'}>
        <ul className="space-y-2">
          <li>
            <Link href="/admin/orders" className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-honey-50">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${data.pendingNow ? 'bg-amber-100 text-amber-800' : 'bg-cream-100 text-charcoal-500'}`}>
                <AlertTriangle className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-semibold text-charcoal-900">{data.pendingNow} đơn chờ xử lý</span>
                <span className="text-xs text-charcoal-500">Tất cả thời gian</span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/admin/products" className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-honey-50">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${data.lowStock.total ? 'bg-blush-100 text-blush-700' : 'bg-cream-100 text-charcoal-500'}`}>
                <PackageSearch className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-semibold text-charcoal-900">{data.lowStock.total} size sắp hết hàng</span>
                <span className="text-xs text-charcoal-500">Còn ≤ {LOW_STOCK_THRESHOLD} sản phẩm</span>
              </span>
            </Link>
          </li>
        </ul>
        {data.lowStock.items.length > 0 && <ul className="mt-3 divide-y divide-cream-100 border-t border-cream-100 text-sm">
          {data.lowStock.items.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 items-baseline gap-1 text-charcoal-800">
              <span className="truncate">{item.productName}</span>
              <span className="shrink-0 text-xs text-charcoal-500">· {item.size}</span>
            </span>
            <span className={`shrink-0 tabular-nums font-semibold ${item.stock === 0 ? 'text-blush-700' : 'text-charcoal-900'}`}>
              {item.stock === 0 ? 'Hết' : `Còn ${item.stock}`}</span>
          </li>)}
        </ul>}
      </Panel>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Trạng thái đơn hàng" subtitle={`Đơn tạo trong ${rangeLabel.toLowerCase()} gần nhất`}>
        <StatusBreakdown counts={data.statusCounts} />
      </Panel>
      <Panel title="Sản phẩm bán chạy" subtitle="Theo doanh số, không tính đơn hủy">
        {data.topProducts.length
          ? <BarList format={formatVNDShort} rows={data.topProducts.map((product) => ({ key: product.productId,
            label: product.name, value: product.revenue, detail: `· ${product.quantity} sp` }))} />
          : <EmptyState>Chưa có sản phẩm nào được bán.</EmptyState>}
      </Panel>
      <Panel title="Kênh khách biết đến shop" subtitle="Do khách chọn khi đặt hàng">
        {data.sources.length
          ? <BarList format={(value) => `${value} đơn`} rows={data.sources.map((source) => ({ key: source.source,
            label: source.source, value: source.orders }))} />
          : <EmptyState>Chưa có dữ liệu kênh.</EmptyState>}
      </Panel>
    </div>

    <Panel title="Đơn hàng gần đây" action={<Link href="/admin/orders" className="text-sm font-semibold text-honey-700 hover:underline">Xem tất cả</Link>}>
      {data.recentOrders.length === 0
        ? <EmptyState>Chưa có đơn hàng.</EmptyState>
        : <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-charcoal-600">
              <tr><th className="px-5 py-2 font-semibold sm:px-6">Mã đơn</th><th className="px-3 py-2 font-semibold">Khách hàng</th>
                <th className="px-3 py-2 font-semibold">Trạng thái</th><th className="px-5 py-2 text-right font-semibold sm:px-6">Tổng tiền</th></tr>
            </thead>
            <tbody>{data.recentOrders.map((order) => <tr key={order.id} className="border-t border-cream-100">
              <td className="px-5 py-3 sm:px-6"><span className="font-semibold text-charcoal-900">{order.orderCode}</span>
                <span className="block text-xs text-charcoal-500">{time(order.createdAt)}</span></td>
              <td className="px-3 py-3 text-charcoal-800">{order.customerName}</td>
              <td className="px-3 py-3"><OrderStatusBadge status={order.orderStatus} /></td>
              <td className="px-5 py-3 text-right font-semibold tabular-nums text-charcoal-900 sm:px-6">{formatVND(order.totalAmount)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
    </Panel>
  </div>;
}
