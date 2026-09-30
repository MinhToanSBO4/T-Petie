'use client';

import { useState } from 'react';
import { DataTable, type Column, type TableQuery } from '@/components/admin/DataTable';
import { OrderStatusControl } from '@/components/admin/OrderStatusControl';

type OrderItem = { name: string; size: string; quantity: number; total: number };
type Order = {
  id: string; orderCode: string; customerName: string; customerPhone: string;
  city: string; district: string; totalAmount: number; orderStatus: string;
  source: string | null; couponCode: string | null; note: string | null;
  createdAt: string; items: OrderItem[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy',
};

const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}₫`;
const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN');

async function fetchOrders(query: TableQuery) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: query.filter });
  const response = await fetch(`/api/admin/orders?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không tải được đơn hàng');
  return { items: data.items as Order[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function OrderManager() {
  const [selected, setSelected] = useState<Order | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  if (selected) return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">Đơn {selected.orderCode}</h2>
        <p className="text-xs text-charcoal-500">{formatDate(selected.createdAt)} · {STATUS_LABELS[selected.orderStatus] || selected.orderStatus}</p>
      </div>
      <button type="button" onClick={() => { setSelected(null); setReloadKey((key) => key + 1); }}
        className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>

    <section className="grid gap-3 rounded-2xl border border-cream-200 bg-white p-5 sm:grid-cols-2">
      {[
        ['Khách hàng', selected.customerName], ['Số điện thoại', selected.customerPhone],
        ['Địa chỉ', `${selected.district}, ${selected.city}`], ['Kênh tiếp cận', selected.source || '—'],
        ['Mã giảm giá', selected.couponCode || '—'], ['Tổng tiền', formatPrice(selected.totalAmount)],
      ].map(([label, value]) => <div key={label}>
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">{label}</p>
        <p className="text-sm text-charcoal-900">{value}</p>
      </div>)}
      {selected.note && <div className="sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">Ghi chú</p>
        <p className="text-sm text-charcoal-900 whitespace-pre-line">{selected.note}</p>
      </div>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-cream-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-cream-50 text-xs uppercase tracking-wide text-charcoal-600">
          <tr><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">SL</th><th className="px-4 py-3">Thành tiền</th></tr>
        </thead>
        <tbody>
          {selected.items.map((item, index) => <tr key={index} className="border-t border-cream-100">
            <td className="px-4 py-3">{item.name}</td>
            <td className="px-4 py-3">{item.size}</td>
            <td className="px-4 py-3">{item.quantity}</td>
            <td className="px-4 py-3">{formatPrice(item.total)}</td>
          </tr>)}
        </tbody>
      </table>
    </section>

    <section className="rounded-2xl border border-cream-200 bg-white p-5">
      <h3 className="mb-3 font-bold">Cập nhật trạng thái</h3>
      <OrderStatusControl code={selected.orderCode} status={selected.orderStatus} />
    </section>
  </div>;

  const columns: Column<Order>[] = [
    { key: 'code', header: 'Mã đơn', render: (row) => <div>
        <p className="font-semibold text-charcoal-900">{row.orderCode}</p>
        <p className="text-xs text-charcoal-500">{formatDate(row.createdAt)}</p>
      </div> },
    { key: 'customer', header: 'Khách hàng', render: (row) => <div>
        <p>{row.customerName}</p>
        <p className="text-xs text-charcoal-500">{row.customerPhone}</p>
      </div> },
    { key: 'address', header: 'Khu vực', render: (row) => <span className="text-xs text-charcoal-600">{row.district}, {row.city}</span> },
    { key: 'items', header: 'Sản phẩm', render: (row) => <span className="text-xs text-charcoal-600">
        {row.items.length} món · {row.items.slice(0, 2).map((item) => item.name).join(', ')}{row.items.length > 2 ? '…' : ''}
      </span> },
    { key: 'total', header: 'Tổng tiền', render: (row) => formatPrice(row.totalAmount) },
    { key: 'status', header: 'Trạng thái', render: (row) => <span className="rounded-full bg-cream-200 px-3 py-1 text-xs font-bold text-charcoal-700">
        {STATUS_LABELS[row.orderStatus] || row.orderStatus}</span> },
  ];

  return <div className="space-y-4">
    <DataTable columns={columns} fetchPage={fetchOrders} reloadKey={reloadKey}
      searchPlaceholder="Tìm theo mã đơn, tên khách hoặc số điện thoại"
      filters={[['PENDING', 'Chờ xử lý'], ['CONFIRMED', 'Đã xác nhận'], ['PROCESSING', 'Đang chuẩn bị'],
        ['SHIPPING', 'Đang giao'], ['COMPLETED', 'Hoàn tất'], ['CANCELLED', 'Đã hủy']]
        .map(([value, label]) => ({ value, label }))}
      emptyText="Chưa có đơn hàng nào."
      onRowClick={(row) => setSelected(row)} />
    <p className="text-xs text-charcoal-500">Bấm vào một dòng để xem chi tiết đơn và cập nhật trạng thái.</p>
  </div>;
}
