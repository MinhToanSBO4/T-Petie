import { requireAdminPage } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';
const currency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export default async function AdminPage() {
  await requireAdminPage('/admin');
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const monthStarts = Array.from({ length: 7 }, (_, index) => new Date(since.getFullYear(), since.getMonth() + index, 1));
  const [orders, productCount, lowStock, pending, ...monthlyTotals] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 } } }),
    prisma.order.count({ where: { orderStatus: 'PENDING' } }),
    ...monthStarts.slice(0, 6).map((start, index) => prisma.order.aggregate({
      where: { orderStatus: 'COMPLETED', createdAt: { gte: start, lt: monthStarts[index + 1] } },
      _sum: { totalAmount: true },
    })),
  ]);
  const months = monthStarts.slice(0, 6).map((date, index) => {
    const total = Number(monthlyTotals[index]._sum.totalAmount || 0);
    return { label: `${date.getMonth() + 1}/${date.getFullYear()}`, total };
  });
  const revenue = months.reduce((sum, month) => sum + month.total, 0);
  const max = Math.max(...months.map((month) => month.total), 1);
  return <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-bold font-heading">Tổng quan kinh doanh</h1>
      <p className="text-sm text-charcoal-500">Dữ liệu 6 tháng gần nhất từ PostgreSQL. Các chức năng quản trị nằm ở thanh điều hướng bên trái.</p>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        ['Doanh thu hoàn tất', currency(revenue)],
        ['Đơn chờ xử lý', String(pending)],
        ['Sản phẩm đang bán', String(productCount)],
        ['Biến thể sắp hết', String(lowStock)],
      ].map(([label, value]) => <div key={label} className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm">
        <p className="text-xs text-charcoal-500 font-semibold">{label}</p><p className="text-2xl font-bold mt-2">{value}</p>
      </div>)}
    </div>
    <section className="bg-white rounded-2xl border border-cream-200 p-6">
      <h2 className="text-lg font-bold">Doanh thu theo tháng</h2>
      <p className="text-xs text-charcoal-500 mb-5">Chỉ tính đơn đã hoàn tất</p>
      <div className="h-56 grid grid-cols-6 gap-3 items-end border-b border-cream-200">
        {months.map((month) => <div key={month.label} className="h-full flex flex-col justify-end items-center gap-2" title={currency(month.total)}>
          <span className="text-xs font-semibold">{currency(month.total)}</span>
          <div className="w-full max-w-20 bg-honey-400 rounded-t-lg min-h-1" style={{ height: `${Math.max(2, month.total / max * 75)}%` }} />
          <span className="text-xs text-charcoal-500">{month.label}</span>
        </div>)}
      </div>
    </section>
    <section className="bg-white rounded-2xl border border-cream-200 p-6">
      <h2 className="text-lg font-bold mb-4">Đơn hàng gần đây</h2>
      {orders.map((order) => <div key={order.id} className="flex justify-between gap-4 py-3 border-t border-cream-100 text-sm">
        <span className="font-semibold">{order.orderCode}</span><span>{order.customerName}</span>
        <span>{order.orderStatus}</span><span className="font-bold">{currency(Number(order.totalAmount))}</span>
      </div>)}
      {orders.length === 0 && <p className="text-sm text-charcoal-500">Chưa có đơn hàng.</p>}
    </section>
  </div>;
}
