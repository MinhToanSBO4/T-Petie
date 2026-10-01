import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Package } from 'lucide-react';
import { CartShortcut } from '@/components/orders/CartShortcut';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderTabs } from '@/components/orders/OrderTabs';
import { SignInPrompt } from '@/components/orders/SignInPrompt';
import { getActiveSession } from '@/server/auth/session';
import { listCustomerOrders } from '@/server/orders/customer-orders';
import { CUSTOMER_ORDER_TABS, parseOrderTab, type CustomerOrderTab } from '@/lib/orders/customer-orders';
import { RefreshWhenStale } from '@/components/orders/RefreshWhenStale';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: "Đơn mua | T'Petie", robots: { index: false, follow: false } };

const EMPTY_TEXT: Record<CustomerOrderTab, string> = {
  all: 'Mẹ chưa có đơn hàng nào.',
  pending: 'Không có đơn nào đang chờ shop xác nhận.',
  preparing: 'Không có đơn nào đang được chuẩn bị.',
  shipping: 'Không có đơn nào đang giao.',
  'to-review': 'Mẹ đã đánh giá hết sản phẩm đã nhận. Cảm ơn mẹ! 🌸',
  completed: 'Chưa có đơn nào hoàn tất.',
  cancelled: 'Không có đơn nào bị hủy.',
};

/**
 * Đơn mua của khách: tách hẳn khỏi giỏ hàng (giỏ = món chưa đặt, Đơn mua = đơn đã đặt).
 * Chia tab theo việc cần làm như Shopee, dữ liệu đọc trực tiếp ở máy chủ cho từng tài khoản.
 */
export default async function OrdersPage({ searchParams }: { searchParams: { tab?: string; page?: string } }) {
  const session = await getActiveSession();
  if (!session) return <SignInPrompt callbackUrl="/orders" />;
  if (session.user.role !== 'user') redirect(session.user.role === 'admin' ? '/admin/orders' : '/admin/products');
  const tab = parseOrderTab(searchParams.tab);
  const data = await listCustomerOrders(session.user.id, tab, Number(searchParams.page) || 1);
  const tabLabel = CUSTOMER_ORDER_TABS.find((entry) => entry.id === tab)!.label;
  const pageHref = (page: number) => `/orders?${new URLSearchParams({ ...(tab === 'all' ? {} : { tab }), page: String(page) })}`;

  return <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-2 sm:px-6">
    {/* Trạng thái đơn đổi từ phía shop: không để trình duyệt hiện bản cũ quá 30 giây. */}
    <RefreshWhenStale renderId={crypto.randomUUID()} />
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-sage-100 text-sage-700"><Package className="size-6" aria-hidden /></span>
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-charcoal-900 sm:text-3xl">Đơn mua</h1>
          <p className="text-xs text-charcoal-600 sm:text-sm">Đơn mẹ đã đặt — theo dõi giao hàng, đánh giá và mua lại.</p>
        </div>
      </div>
      <CartShortcut />
    </header>

    <OrderTabs active={tab} counts={data.counts} />

    {tab === 'to-review' && data.orders.length > 0 && <p className="rounded-2xl bg-blush-50 px-4 py-3 text-xs text-blush-900">
      Mẹ đánh giá trong 30 ngày kể từ khi nhận hàng. Đánh giá thật, kèm ảnh bé mặc, giúp các mẹ khác chọn size chuẩn hơn.
    </p>}

    {data.orders.length > 0 ? <div className="space-y-4">
      {data.orders.map((order) => <OrderCard key={order.code} order={order} />)}
    </div> : <div className="rounded-3xl border border-cream-200 bg-white p-10 text-center shadow-card">
      <p className="text-sm text-charcoal-600">{data.page > 1 ? `Không còn đơn ở mục “${tabLabel}”.` : EMPTY_TEXT[tab]}</p>
      <Link href={data.page > 1 ? pageHref(1) : '/girls'}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-honey-500 px-6 text-sm font-bold text-white shadow-md hover:bg-honey-600">
        {data.page > 1 ? 'Về trang đầu' : 'Mua sắm ngay'}
      </Link>
    </div>}

    {data.pages > 1 && <nav aria-label="Phân trang đơn mua" className="flex items-center justify-center gap-3 text-sm">
      {data.page > 1 ? <Link href={pageHref(data.page - 1)} className="rounded-full border border-cream-300 bg-white px-4 py-2 font-semibold">← Trước</Link>
        : <span className="rounded-full px-4 py-2 text-charcoal-300">← Trước</span>}
      <span className="text-charcoal-600">Trang {data.page}/{data.pages}</span>
      {data.page < data.pages ? <Link href={pageHref(data.page + 1)} className="rounded-full border border-cream-300 bg-white px-4 py-2 font-semibold">Sau →</Link>
        : <span className="rounded-full px-4 py-2 text-charcoal-300">Sau →</span>}
    </nav>}
  </div>;
}
