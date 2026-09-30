import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';
import { OrderStatusControl } from '@/components/admin/OrderStatusControl';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin' || session.user.status !== 'active') redirect('/login?callbackUrl=/admin/orders');
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { items: true } });
  return <div className="space-y-6">
    <div className="flex justify-between items-center"><div><h1 className="text-3xl font-bold">Quản lý đơn hàng</h1></div>
      <a href="/admin/exports" className="px-4 py-2 rounded-xl bg-honey-600 text-white text-sm font-bold">Xuất Excel</a></div>
    {orders.map((order) => <article key={order.id} className="bg-white rounded-2xl border border-cream-200 p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><strong>{order.orderCode}</strong>
        <span className="text-xs text-charcoal-500">{order.createdAt.toLocaleString('vi-VN')}</span></div>
      <div className="text-sm">{order.customerName} · {order.customerPhone} · {order.city}, {order.district}</div>
      <div className="text-sm text-charcoal-500">{order.items.map((item) => `${item.productName} (${item.size}) ×${item.quantity}`).join(' · ')}</div>
      {order.source && <div className="text-xs text-charcoal-500">Kênh tiếp cận: {order.source}</div>}
      <div className="flex flex-wrap justify-between items-center gap-3"><div><span className="font-bold">{order.orderStatus}</span>
        <strong className="ml-4">{Number(order.totalAmount).toLocaleString('vi-VN')}₫</strong></div>
        <OrderStatusControl code={order.orderCode} status={order.orderStatus} /></div>
    </article>)}
    {orders.length === 0 && <p>Chưa có đơn hàng.</p>}
  </div>;
}
