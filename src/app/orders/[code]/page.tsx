import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, MapPin, MessageCircle, Phone, Receipt, Star } from 'lucide-react';
import { CustomerStatusBadge } from '@/components/orders/CustomerStatusBadge';
import { OrderActions } from '@/components/orders/OrderActions';
import { OrderItemRow } from '@/components/orders/OrderCard';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { SignInPrompt } from '@/components/orders/SignInPrompt';
import { getActiveSession } from '@/server/auth/session';
import { getCustomerOrder } from '@/server/orders/customer-orders';
import { getSiteContent } from '@/server/content/site-content';
import { customerStatus } from '@/lib/orders/status';
import { telHref } from '@/lib/content/site-content';
import { formatDateVN, formatPriceCompact } from '@/lib/utils/formatters';
import { RefreshWhenStale } from '@/components/orders/RefreshWhenStale';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: "Chi tiết đơn mua | T'Petie", robots: { index: false, follow: false } };

function Row({ label, value, total = false }: { label: string; value: string; total?: boolean }) {
  return <div className={`flex justify-between gap-3 ${total ? 'border-t border-cream-200 pt-2 font-bold text-charcoal-900' : 'text-charcoal-700'}`}>
    <dt>{label}</dt><dd className={total ? 'font-heading text-lg text-honey-700' : 'font-semibold'}>{value}</dd>
  </div>;
}

const card = 'rounded-3xl border border-cream-200 bg-white p-5 shadow-card';

/** Chi tiết một đơn của khách: hành trình đơn, món đã mua kèm đánh giá, địa chỉ, thanh toán và thao tác. */
export default async function OrderDetailPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code);
  const session = await getActiveSession();
  if (!session) return <SignInPrompt callbackUrl={`/orders/${code}`} />;
  if (session.user.role !== 'user') redirect(session.user.role === 'admin' ? '/admin/orders' : '/admin/products');
  const [order, content] = await Promise.all([getCustomerOrder(session.user.id, code), getSiteContent()]);
  if (!order) notFound();
  const status = customerStatus(order.status);
  const contact = content.contact_info;

  return <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-2 sm:px-6">
    {/* Trạng thái đơn đổi từ phía shop: không để trình duyệt hiện bản cũ quá 30 giây. */}
    <RefreshWhenStale renderId={crypto.randomUUID()} />
    <Link href="/orders" className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-3 py-1.5 text-xs font-bold text-charcoal-700 hover:text-honey-700">
      <ArrowLeft className="size-4" aria-hidden />Đơn mua
    </Link>

    <section className={card} aria-labelledby="order-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">Mã đơn</p>
          <h1 id="order-title" className="font-heading text-xl font-extrabold text-charcoal-900 sm:text-2xl">{order.code}</h1>
          <p className="text-xs text-charcoal-600">Đặt lúc {formatDateVN(order.createdAt, true)}</p>
        </div>
        <CustomerStatusBadge status={order.status} />
      </div>
      {status.description && <p className="mt-3 text-sm text-charcoal-700">{status.description}</p>}
      {order.cancelReason && <p className="mt-2 text-sm text-charcoal-700">Lý do: <strong>{order.cancelReason}</strong></p>}
      {order.autoCompleteAt && <p className="mt-2 text-xs text-charcoal-500">
        Nếu mẹ chưa bấm xác nhận, đơn sẽ tự hoàn tất vào {formatDateVN(order.autoCompleteAt)}. Có vấn đề khi nhận hàng, mẹ nhắn shop trước ngày này nhé.
      </p>}
      {order.pendingReviews > 0 && order.reviewDeadline && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-blush-50 px-4 py-3 text-sm text-blush-900">
        <Star className="size-4 shrink-0" fill="currentColor" aria-hidden />
        Còn {order.pendingReviews} sản phẩm chờ đánh giá — mẹ đánh giá trước {formatDateVN(order.reviewDeadline)} nhé.
      </p>}
      <div className="mt-5 border-t border-cream-100 pt-5"><OrderTimeline steps={order.timeline} /></div>
    </section>

    <section className={card} aria-labelledby="order-items-title">
      <h2 id="order-items-title" className="mb-3 scroll-mt-24 font-heading text-base font-bold text-charcoal-900">Sản phẩm đã mua ({order.itemCount})</h2>
      <ul className="divide-y divide-cream-100">
        {order.items.map((item) => <OrderItemRow key={item.id} item={item} orderCode={order.code} showWaiting />)}
      </ul>
    </section>

    <div className="grid gap-5 md:grid-cols-2">
      <section className={card} aria-labelledby="order-address-title">
        <h2 id="order-address-title" className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-charcoal-900">
          <MapPin className="size-4 text-honey-600" aria-hidden />Địa chỉ nhận hàng</h2>
        <p className="text-sm font-semibold text-charcoal-900">{order.recipient.name} · {order.recipient.phone}</p>
        <p className="mt-1 text-sm text-charcoal-700">{order.recipient.address}</p>
        {order.note && <p className="mt-3 whitespace-pre-line rounded-xl bg-cream-50 p-3 text-xs text-charcoal-600">Ghi chú: {order.note}</p>}
      </section>
      <section className={card} aria-labelledby="order-payment-title">
        <h2 id="order-payment-title" className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-charcoal-900">
          <Receipt className="size-4 text-honey-600" aria-hidden />Thanh toán</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Tạm tính" value={formatPriceCompact(order.subtotal)} />
          <Row label="Phí vận chuyển" value={order.shippingFee === 0 ? 'Miễn phí' : formatPriceCompact(order.shippingFee)} />
          {order.discount > 0 && <Row label={`Giảm giá${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`-${formatPriceCompact(order.discount)}`} />}
          <Row total label="Tổng thanh toán" value={formatPriceCompact(order.total)} />
        </dl>
        <p className="mt-3 text-xs text-charcoal-600">
          Phương thức: {order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : order.paymentMethod}
        </p>
      </section>
    </div>

    <section className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`} aria-label="Thao tác với đơn hàng">
      <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-600">
        <span>Cần hỗ trợ đơn này?</span>
        {contact?.zaloUrl && <a href={contact.zaloUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cream-300 px-3 font-bold text-charcoal-800 hover:bg-cream-50">
          <MessageCircle className="size-3.5" aria-hidden />{contact.zaloLabel || 'Nhắn Zalo'}</a>}
        {contact?.hotline && <a href={telHref(contact.hotline)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cream-300 px-3 font-bold text-charcoal-800 hover:bg-cream-50">
          <Phone className="size-3.5" aria-hidden />{contact.hotline}</a>}
      </div>
      <OrderActions code={order.code} status={order.status} items={order.items} />
    </section>
  </div>;
}
