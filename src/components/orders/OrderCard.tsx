import Image from 'next/image';
import Link from 'next/link';
import { ImageIcon, Package, Star } from 'lucide-react';
import { CustomerStatusBadge } from '@/components/orders/CustomerStatusBadge';
import { OrderActions } from '@/components/orders/OrderActions';
import { ReviewAction } from '@/components/orders/ReviewAction';
import { formatDateVN, formatPriceCompact } from '@/lib/utils/formatters';
import type { CustomerOrderItem, CustomerOrderSummary } from '@/types/order';

/** Một dòng sản phẩm đã mua: ảnh, tên (dẫn về trang sản phẩm), phân loại, số lượng, giá và trạng thái đánh giá. */
export function OrderItemRow({ item, orderCode, showWaiting = false }: { item: CustomerOrderItem; orderCode: string; showWaiting?: boolean }) {
  return <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-cream-200 bg-cream-100 sm:size-20">
      {item.thumbnail ? <Image src={item.thumbnail} alt="" fill sizes="80px" className="object-cover" />
        : <ImageIcon className="absolute inset-0 m-auto size-6 text-charcoal-300" aria-hidden />}
    </div>
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {item.productSlug
            ? <Link href={`/products/${item.productSlug}`} className="line-clamp-2 text-sm font-bold text-charcoal-900 hover:text-honey-700">{item.productName}</Link>
            : <p className="line-clamp-2 text-sm font-bold text-charcoal-900">{item.productName}</p>}
          <p className="text-xs text-charcoal-600">Phân loại: {item.size} · x{item.quantity}</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-charcoal-900">{formatPriceCompact(item.totalPrice)}</span>
      </div>
      <ReviewAction item={item} orderCode={orderCode} showWaiting={showWaiting} />
    </div>
  </li>;
}

const VISIBLE_ITEMS = 3;

/** Thẻ đơn trong trang Đơn mua: mã đơn và trạng thái, món đã mua, nhắc hạn đánh giá, tổng tiền và thao tác. */
export function OrderCard({ order }: { order: CustomerOrderSummary }) {
  const href = `/orders/${order.code}`;
  const hidden = order.items.length - VISIBLE_ITEMS;
  return <article className="rounded-3xl border border-cream-200 bg-white shadow-card" aria-labelledby={`order-${order.code}`}>
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-100 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <Package className="size-4 shrink-0 text-sage-700" aria-hidden />
        <Link id={`order-${order.code}`} href={href} className="scroll-mt-28 truncate text-sm font-bold text-charcoal-900 hover:text-honey-700">
          Đơn {order.code}
        </Link>
        <span className="shrink-0 text-xs text-charcoal-500">· {formatDateVN(order.createdAt)}</span>
      </div>
      <CustomerStatusBadge status={order.status} />
    </header>

    <ul className="divide-y divide-cream-100 px-4 py-3 sm:px-5">
      {order.items.slice(0, VISIBLE_ITEMS).map((item) => <OrderItemRow key={item.id} item={item} orderCode={order.code} />)}
    </ul>
    {hidden > 0 && <Link href={href} className="block border-t border-cream-100 px-5 py-2 text-center text-xs font-semibold text-charcoal-600 hover:text-honey-700">
      Xem thêm {hidden} sản phẩm khác</Link>}

    <footer className="space-y-3 rounded-b-3xl border-t border-cream-100 bg-cream-50/60 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {order.pendingReviews > 0 && order.reviewDeadline
          ? <p className="flex items-center gap-1.5 text-xs font-semibold text-blush-700">
              <Star className="size-3.5" fill="currentColor" aria-hidden />
              {order.pendingReviews} sản phẩm chờ đánh giá · hạn {formatDateVN(order.reviewDeadline)}
            </p>
          : <span className="text-xs text-charcoal-500">{order.itemCount} sản phẩm</span>}
        <p className="text-sm text-charcoal-700">Thành tiền: <strong className="font-heading text-base text-honey-700">{formatPriceCompact(order.total)}</strong></p>
      </div>
      <OrderActions code={order.code} status={order.status} items={order.items} detailHref={href} />
    </footer>
  </article>;
}
