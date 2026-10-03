'use client';

import { useState } from 'react';
import { DataTable, tableParams, type Column, type TableFilter, type TableQuery } from '@/components/admin/DataTable';
import { readJson } from '@/client/http';
import { errorText, toast } from '@/client/toast';

type Customer = {
  id: string; name: string | null; email: string | null; username: string | null;
  phone: string | null; city: string | null; status: string; points: number; orderCount: number;
  createdAt: string; lastLoginAt: string | null;
};

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '—';

const CUSTOMER_SORTS = [
  { value: 'newest', label: 'Mới tham gia' }, { value: 'login', label: 'Đăng nhập gần nhất' },
  { value: 'orders', label: 'Nhiều đơn nhất' }, { value: 'name', label: 'Tên A–Z' },
];
const CUSTOMER_FILTERS: TableFilter[] = [
  { key: 'status', label: 'Trạng thái', options: [{ value: 'active', label: 'Đang hoạt động' }, { value: 'blocked', label: 'Đã khóa' }] },
  { key: 'ordered', label: 'Đơn hàng', all: 'Tất cả khách hàng',
    options: [{ value: 'yes', label: 'Đã từng đặt hàng' }, { value: 'no', label: 'Chưa đặt đơn nào' }] },
];

async function fetchCustomers(query: TableQuery) {
  const response = await fetch(`/api/admin/users?${tableParams(query, { filter: 'user' })}`, { cache: 'no-store' });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Không tải được khách hàng');
  return { items: data.items as Customer[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function CustomerManager() {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const open = (customer: Customer | null) => { setTemporaryPassword(''); setSelected(customer); };

  /** Khách quên mật khẩu (chưa có gửi email đặt lại): tạo mật khẩu tạm để shop gửi cho khách qua Zalo/điện thoại. */
  const resetPassword = async (customer: Customer) => {
    if (!window.confirm(`Tạo mật khẩu tạm mới cho ${customer.name || customer.email || 'khách này'}? Mật khẩu cũ và mọi phiên đăng nhập cũ sẽ hết hiệu lực.`)) return;
    setBusy(true); setTemporaryPassword('');
    const id = toast.loading('Đang tạo mật khẩu tạm…');
    try {
      const response = await fetch(`/api/admin/users/${customer.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.temporaryPassword) throw new Error(data.error || 'Không đặt lại được mật khẩu');
      setTemporaryPassword(data.temporaryPassword);
      toast.success('Đã tạo mật khẩu tạm mới', { id });
    } catch (resetError) {
      const text = errorText(resetError, 'Không đặt lại được mật khẩu');
      toast.error(text, { id });
    }
    finally { setBusy(false); }
  };

  const change = async (customer: Customer, action: 'block' | 'unblock' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Xóa tài khoản của ${customer.name || customer.email || customer.id}? Đơn hàng cũ vẫn được giữ lại.`)) return;
    setBusy(true);
    const id = toast.loading(action === 'delete' ? 'Đang xóa tài khoản…' : action === 'block' ? 'Đang khóa tài khoản…' : 'Đang mở khóa tài khoản…');
    try {
      const response = action === 'delete'
        ? await fetch(`/api/admin/users/${customer.id}`, { method: 'DELETE' })
        : await fetch(`/api/admin/users/${customer.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: action === 'block' ? 'blocked' : 'active' }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Thao tác thất bại');
      toast.success(action === 'delete' ? 'Đã xóa tài khoản khách hàng'
        : action === 'block' ? 'Đã khóa tài khoản; phiên đăng nhập cũ sẽ hết hiệu lực' : 'Đã mở lại tài khoản', { id });
      // Về danh sách: mật khẩu tạm của khách này không được hiện tiếp khi mở khách khác.
      setSelected(null); setTemporaryPassword('');
      setReloadKey((key) => key + 1);
    } catch (changeError) {
      const text = errorText(changeError, 'Thao tác thất bại');
      toast.error(text, { id });
    }
    finally { setBusy(false); }
  };

  if (selected) return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">{selected.name || 'Chưa đặt tên'}</h2>
        <p className="text-xs text-charcoal-500">{selected.email || selected.username || selected.id}</p>
      </div>
      <button type="button" onClick={() => open(null)} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {temporaryPassword && <p className="rounded-xl bg-honey-50 p-3 text-sm">
      Mật khẩu tạm mới: <strong className="select-all font-mono">{temporaryPassword}</strong> — chỉ hiện một lần. Gửi cho khách (Zalo/điện thoại),
      dặn khách đăng nhập rồi đổi mật khẩu trong trang Tài khoản.
    </p>}

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
      {selected.email && <button type="button" disabled={busy} onClick={() => void resetPassword(selected)}
        className="min-h-11 rounded-xl bg-sage-700 px-5 text-sm font-bold text-white disabled:opacity-50">Đặt lại mật khẩu</button>}
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
    { key: 'orders', header: 'Đơn', render: (row) => row.orderCount },
    { key: 'joined', header: 'Tham gia', render: (row) => <div className="text-xs text-charcoal-600">
        <p>{formatDate(row.createdAt)}</p>
        {row.lastLoginAt && <p className="text-charcoal-500">Đăng nhập: {formatDate(row.lastLoginAt)}</p>}
      </div> },
    { key: 'status', header: 'Trạng thái', render: (row) => <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
      row.status === 'active' ? 'bg-sage-100 text-sage-800' : 'bg-blush-100 text-blush-700'}`}>
      {row.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</span> },
    { key: 'action', header: '', render: (row) => <button type="button" onClick={(event) => { event.stopPropagation(); open(row); }} className="min-h-9 whitespace-nowrap rounded-lg border border-cream-300 px-3 text-xs font-bold">Chỉnh sửa</button> },
  ];

  return <div className="space-y-4">
    <DataTable columns={columns} fetchPage={fetchCustomers} reloadKey={reloadKey}
      searchPlaceholder="Tìm theo tên, email hoặc SĐT"
      sorts={CUSTOMER_SORTS} filters={CUSTOMER_FILTERS}
      emptyText="Chưa có khách hàng nào."
      onRowClick={(row) => open(row)} />
  </div>;
}
