'use client';

import { useState } from 'react';
import { DataTable, type Column, type TableQuery } from '@/components/admin/DataTable';

type Customer = {
  id: string; name: string | null; email: string | null; username: string | null;
  phone: string | null; city: string | null; status: string; points: number;
  createdAt: string; lastLoginAt: string | null;
};

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '—';

async function fetchCustomers(query: TableQuery) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: 'user' });
  const response = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không tải được khách hàng');
  return { items: data.items as Customer[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function CustomerManager() {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (customer: Customer, action: 'block' | 'unblock' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Xóa tài khoản của ${customer.name || customer.email || customer.id}? Đơn hàng cũ vẫn được giữ lại.`)) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const response = action === 'delete'
        ? await fetch(`/api/admin/users/${customer.id}`, { method: 'DELETE' })
        : await fetch(`/api/admin/users/${customer.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: action === 'block' ? 'blocked' : 'active' }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Thao tác thất bại');
      setMessage(action === 'delete' ? 'Đã xóa tài khoản khách hàng.'
        : action === 'block' ? 'Đã khóa tài khoản; phiên đăng nhập cũ sẽ hết hiệu lực.' : 'Đã mở lại tài khoản.');
      setSelected(null);
      setReloadKey((key) => key + 1);
    } catch (changeError) { setError(changeError instanceof Error ? changeError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  if (selected) return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">{selected.name || 'Chưa đặt tên'}</h2>
        <p className="text-xs text-charcoal-500">{selected.email || selected.username || selected.id}</p>
      </div>
      <button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <section className="grid gap-3 rounded-2xl border border-cream-200 bg-white p-5 sm:grid-cols-2">
      {[
        ['Email', selected.email || '—'], ['Tên đăng nhập', selected.username || '—'],
        ['Số điện thoại', selected.phone || '—'], ['Tỉnh/thành', selected.city || '—'],
        ['Điểm tích lũy', String(selected.points)], ['Trạng thái', selected.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'],
        ['Tham gia', formatDate(selected.createdAt)], ['Đăng nhập gần nhất', formatDate(selected.lastLoginAt)],
      ].map(([label, value]) => <div key={label}>
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">{label}</p>
        <p className="text-sm text-charcoal-900">{value}</p>
      </div>)}
    </section>

    <div className="flex flex-wrap gap-2">
      {selected.status === 'active'
        ? <button type="button" disabled={busy} onClick={() => void change(selected, 'block')}
            className="min-h-11 rounded-xl border border-cream-300 px-5 text-sm font-semibold disabled:opacity-50">Khóa tài khoản</button>
        : <button type="button" disabled={busy} onClick={() => void change(selected, 'unblock')}
            className="min-h-11 rounded-xl border border-cream-300 px-5 text-sm font-semibold disabled:opacity-50">Mở khóa</button>}
      <button type="button" disabled={busy} onClick={() => void change(selected, 'delete')}
        className="min-h-11 rounded-xl px-5 text-sm font-semibold text-red-700 disabled:opacity-50">Xóa tài khoản</button>
    </div>
  </div>;

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Khách hàng', render: (row) => <div>
        <p className="font-semibold text-charcoal-900">{row.name || 'Chưa đặt tên'}</p>
        <p className="text-xs text-charcoal-500">{row.email || row.username || row.id}</p>
      </div> },
    { key: 'phone', header: 'Điện thoại', render: (row) => row.phone || '—' },
    { key: 'city', header: 'Tỉnh/thành', render: (row) => row.city || '—' },
    { key: 'points', header: 'Điểm', render: (row) => row.points },
    { key: 'joined', header: 'Tham gia', render: (row) => <span className="text-xs text-charcoal-600">{formatDate(row.createdAt)}</span> },
    { key: 'status', header: 'Trạng thái', render: (row) => <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
      row.status === 'active' ? 'bg-sage-100 text-sage-800' : 'bg-blush-100 text-blush-700'}`}>
      {row.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</span> },
    { key: 'action', header: '', render: (row) => <button type="button" onClick={(event) => { event.stopPropagation(); setSelected(row); }} className="min-h-9 whitespace-nowrap rounded-lg border border-cream-300 px-3 text-xs font-bold">Chỉnh sửa</button> },
  ];

  return <div className="space-y-4">
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    <DataTable columns={columns} fetchPage={fetchCustomers} reloadKey={reloadKey}
      searchPlaceholder="Tìm theo tên, email hoặc số điện thoại"
      emptyText="Chưa có khách hàng nào."
      onRowClick={(row) => setSelected(row)} />
    <p className="text-xs text-charcoal-500">Bấm vào một dòng để xem chi tiết, khóa hoặc xóa tài khoản.</p>
  </div>;
}
