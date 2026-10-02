import Link from 'next/link';
import { AlertTriangle, ArrowRight, ClipboardCheck, PackageCheck, Phone, Star, Truck, type LucideIcon } from 'lucide-react';
import { requireStaffAreaPage } from '@/server/auth/staff-session';
import { getStaffHomeData, type OpenStatus } from '@/server/admin/staff-home';
import { LOW_STOCK_THRESHOLD } from '@/server/admin/dashboard';
import { autoCompleteShippedOrders } from '@/server/orders/order-status';
import { EmptyState, Panel } from '@/components/admin/dashboard/DashboardParts';
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge';
import { RefreshButton } from '@/components/admin/dashboard/RefreshButton';
import { AutoRefresh } from '@/components/admin/dashboard/AutoRefresh';
import { formatVND } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

/** Mỗi bước của đơn kèm việc nhân viên cần làm, theo thứ tự quy trình. */
const QUEUE: { status: OpenStatus; label: string; todo: string; icon: LucideIcon }[] = [
  { status: 'PENDING', label: 'Chờ xác nhận', todo: 'Gọi xác nhận với khách', icon: Phone },
  { status: 'CONFIRMED', label: 'Chờ đóng gói', todo: 'Kiểm hàng và đóng gói', icon: ClipboardCheck },
  { status: 'PROCESSING', label: 'Chờ giao shipper', todo: 'Bàn giao cho đơn vị vận chuyển', icon: PackageCheck },
  { status: 'SHIPPING', label: 'Đang giao', todo: 'Theo dõi đến khi khách nhận', icon: Truck },
];
const HOUR_MS = 60 * 60 * 1000;
/** Đơn chưa giao cho shipper sau mốc này được tô đỏ để ưu tiên. */
const LATE_MS = 24 * HOUR_MS;
/** Đơn đang giao lâu hơn mốc này nên gọi hỏi đơn vị vận chuyển (đơn tự hoàn tất sau 7 ngày). */
const SLOW_SHIPPING_MS = 4 * 24 * HOUR_MS;

function waited(fromIso: string, now: number) {
  const ms = Math.max(0, now - new Date(fromIso).getTime());
  if (ms < HOUR_MS) return `${Math.max(1, Math.round(ms / 60_000))} phút`;
  if (ms < 48 * HOUR_MS) return `${Math.floor(ms / HOUR_MS)} giờ`;
  return `${Math.floor(ms / (24 * HOUR_MS))} ngày`;
}

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hourCycle: 'h23' }).format(now));
  return hour < 11 ? 'Chào buổi sáng' : hour < 13 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

const ordersHref = (status: OpenStatus, code?: string) => `/staff/orders?${new URLSearchParams({ tab: status, ...(code ? { order: code } : {}) })}`;

/**
 * Trang chủ nhân viên: bảng việc trong ngày thay cho số liệu kinh doanh. Đơn chia theo bước kèm việc cần làm, đơn chờ
 * lâu nhất lên đầu (đặt trước giao trước), hàng sắp hết và đánh giá chưa trả lời. Trang tự cập nhật mỗi phút.
 */
export default async function StaffHomePage() {
  const session = await requireStaffAreaPage('/staff');
  // Hoàn tất các đơn giao quá hạn trước khi đếm (tự giới hạn tần suất), để "Đang giao" không đếm đơn khách đã nhận.
  await autoCompleteShippedOrders();
  const data = await getStaffHomeData();
  const now = new Date();
  const nowMs = now.getTime();
  const firstName = (session.user.name || '').trim().split(/\s+/).pop() || 'bạn';
  const toHandle = data.queue.PENDING.count + data.queue.CONFIRMED.count + data.queue.PROCESSING.count;
  const date = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);

  return <div className="space-y-6">
    <AutoRefresh />
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-charcoal-500">{date}</p>
        <h1 className="font-heading text-3xl font-bold text-charcoal-900">{greeting(now)}, {firstName}</h1>
        <p className="mt-1 text-sm text-charcoal-600">
          {toHandle ? <>Có <strong className="text-honey-800">{toHandle} đơn</strong> đang chờ shop xử lý.</> : 'Không còn đơn nào chờ xử lý. Làm tốt lắm!'}
        </p>
      </div>
      <RefreshButton clearCache={false} />
    </header>

    <section aria-label="Đơn theo từng bước" className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
      {QUEUE.map(({ status, label, todo, icon: Icon }) => {
        const { count, oldest } = data.queue[status];
        const age = oldest ? nowMs - new Date(oldest).getTime() : 0;
        const late = count > 0 && age > (status === 'SHIPPING' ? SLOW_SHIPPING_MS : LATE_MS);
        return <Link key={status} href={ordersHref(status)}
          className={`group flex flex-col rounded-2xl border bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey-500 motion-reduce:transform-none ${late ? 'border-blush-300' : count ? 'border-honey-200 hover:border-honey-300' : 'border-cream-200 hover:border-honey-200'}`}>
          <span className="flex items-center justify-between gap-2 text-sm font-semibold text-charcoal-700">
            <span className="flex items-center gap-2">
              <span className={`flex size-8 items-center justify-center rounded-full ${count ? 'bg-honey-100 text-honey-700' : 'bg-cream-100 text-charcoal-500'}`}><Icon className="size-4" aria-hidden /></span>
              {label}
            </span>
            <ArrowRight className="size-4 text-charcoal-400 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
          </span>
          <span className={`mt-3 font-heading text-3xl font-bold tabular-nums ${count ? 'text-charcoal-900' : 'text-charcoal-400'}`}>{count}</span>
          <span className="mt-1 text-xs text-charcoal-600">{count ? todo : 'Không có đơn'}</span>
          {count > 0 && oldest && <span className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${late ? 'text-blush-700' : 'text-charcoal-500'}`}>
            {late && <AlertTriangle className="size-3.5" aria-hidden />}{status === 'SHIPPING' ? 'Giao lâu nhất' : 'Chờ lâu nhất'}: {waited(oldest, nowMs)}
          </span>}
        </Link>;
      })}
    </section>

    <div className="grid gap-4 xl:grid-cols-3">
      <Panel title="Đơn chờ lâu nhất" subtitle="Đặt trước xử lý trước. Bấm mã đơn để mở chi tiết." className="xl:col-span-2"
        action={<Link href="/staff/orders" className="text-sm font-semibold text-honey-700 hover:underline">Tất cả đơn</Link>}>
        {data.waiting.length === 0
          ? <EmptyState>Không có đơn nào đang chờ. Đơn mới sẽ hiện ở đây.</EmptyState>
          : <ul className="divide-y divide-cream-100">
            {data.waiting.map((order) => {
              const late = nowMs - new Date(order.createdAt).getTime() > LATE_MS;
              return <li key={order.orderCode} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={ordersHref(order.orderStatus, order.orderCode)} className="font-semibold text-charcoal-900 hover:text-honey-700 hover:underline">{order.orderCode}</Link>
                    <OrderStatusBadge status={order.orderStatus} />
                  </p>
                  <p className="text-sm text-charcoal-700">
                    {order.customerName} · <a href={`tel:${order.customerPhone}`} className="font-semibold text-honey-700 hover:underline">{order.customerPhone}</a>
                    <span className="text-charcoal-500"> · {order.itemCount} sản phẩm · {order.paymentMethod === 'COD' ? 'Thu tiền khi giao' : 'Chuyển khoản'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-charcoal-900">{formatVND(order.totalAmount)}</p>
                  <p className={`text-xs ${late ? 'font-semibold text-blush-700' : 'text-charcoal-500'}`}>Đặt {waited(order.createdAt, nowMs)} trước</p>
                </div>
              </li>;
            })}
          </ul>}
      </Panel>

      <Panel title="Hôm nay">
        <dl className="divide-y divide-cream-100 text-sm">
          {[
            ['Đơn mới', data.today.newOrders],
            ['Giao thành công', data.today.completed],
            ['Đang trên đường giao', data.queue.SHIPPING.count],
            ['Đánh giá chưa trả lời', data.reviews.unreplied],
          ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-charcoal-600">{label}</dt>
            <dd className="font-heading text-xl font-bold tabular-nums text-charcoal-900">{value}</dd>
          </div>)}
        </dl>
      </Panel>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Hàng sắp hết" subtitle={data.lowStock.total ? `${data.lowStock.total} size còn ≤ ${LOW_STOCK_THRESHOLD} sản phẩm` : `Không có size nào còn ≤ ${LOW_STOCK_THRESHOLD} sản phẩm`}
        action={<Link href="/staff/products" className="text-sm font-semibold text-honey-700 hover:underline">Cập nhật tồn kho</Link>}>
        {data.lowStock.items.length === 0
          ? <EmptyState>Kho đang đủ hàng.</EmptyState>
          : <ul className="divide-y divide-cream-100 text-sm">
            {data.lowStock.items.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 items-baseline gap-1 text-charcoal-800">
                <span className="truncate">{item.productName}</span>
                <span className="shrink-0 text-xs text-charcoal-500">· {item.size}</span>
              </span>
              <span className={`shrink-0 font-semibold tabular-nums ${item.stock === 0 ? 'text-blush-700' : 'text-charcoal-900'}`}>
                {item.stock === 0 ? 'Hết hàng' : `Còn ${item.stock}`}</span>
            </li>)}
          </ul>}
      </Panel>

      <Panel title="Đánh giá cần trả lời"
        subtitle={data.reviews.unreplied ? `${data.reviews.unreplied} đánh giá chưa có phản hồi${data.reviews.lowRated ? ` · ${data.reviews.lowRated} đánh giá thấp nên trả lời trước` : ''}` : 'Mọi đánh giá đều đã được phản hồi'}
        action={<Link href="/staff/reviews" className="text-sm font-semibold text-honey-700 hover:underline">Trả lời đánh giá</Link>}>
        {data.reviews.items.length === 0
          ? <EmptyState>Không có đánh giá nào chờ phản hồi.</EmptyState>
          : <ul className="divide-y divide-cream-100">
            {data.reviews.items.map((review) => <li key={review.id} className="space-y-1 py-3">
              <p className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className={`inline-flex items-center gap-0.5 font-semibold ${review.rating <= 2 ? 'text-blush-700' : 'text-honey-700'}`}
                  aria-label={`${review.rating} trên 5 sao`}>
                  {review.rating}<Star className="size-3.5 fill-current" aria-hidden />
                </span>
                <span className="font-semibold text-charcoal-900">{review.customerName}</span>
                <span className="text-xs text-charcoal-500">· {review.productName} · {waited(review.createdAt, nowMs)} trước</span>
              </p>
              <p className="line-clamp-2 text-sm text-charcoal-700">{review.content || <span className="italic text-charcoal-500">Khách chỉ chấm sao</span>}</p>
            </li>)}
          </ul>}
      </Panel>
    </div>
  </div>;
}
