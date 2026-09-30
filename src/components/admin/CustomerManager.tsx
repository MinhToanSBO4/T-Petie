'use client';

import { useMemo, useState } from 'react';

type Customer = {
  id: string; name: string | null; email: string | null; username: string | null;
  phone: string | null; city: string | null; status: string; points: number;
  createdAt: string; lastLoginAt: string | null;
};

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '—';

export function CustomerManager({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => [customer.name, customer.email, customer.username, customer.phone]
      .some((value) => value?.toLowerCase().includes(query)));
  }, [customers, search]);

  const refresh = async () => {
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    if (!response.ok) throw new Error('Không tải lại được danh sách khách hàng');
    const data = await response.json();
    setCustomers((data.users || []).filter((user: Customer & { role: string }) => user.role === 'user'));
  };

  const change = async (customer: Customer, action: 'block' | 'unblock' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Xóa tài khoản của ${customer.name || customer.email || customer.id}? Đơn hàng cũ vẫn được giữ lại.`)) return;
    setBusy(true); setMessage('');
    try {
      const response = action === 'delete'
        ? await fetch(`/api/admin/users/${customer.id}`, { method: 'DELETE' })
        : await fetch(`/api/admin/users/${customer.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: action === 'block' ? 'blocked' : 'active' }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Thao tác thất bại');
      await refresh();
      setMessage(action === 'delete' ? 'Đã xóa tài khoản khách hàng.'
        : action === 'block' ? 'Đã khóa tài khoản; phiên đăng nhập cũ sẽ hết hiệu lực.' : 'Đã mở lại tài khoản.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <header><h1 className="mt-2 text-3xl font-bold font-heading">Khách hàng</h1>
      <p className="mt-1 text-sm text-charcoal-600">Tài khoản khách đăng ký trên website. Khóa tài khoản sẽ vô hiệu hóa phiên đăng nhập hiện có.</p>
    </header>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}

    <label className="block max-w-md text-sm font-semibold">Tìm theo tên, email hoặc số điện thoại
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="VD: 0912..."
        className="mt-1 block w-full rounded-xl border border-cream-300 p-3" />
    </label>

    <section className="space-y-3">
      <h2 className="text-xl font-bold">Danh sách ({filtered.length})</h2>
      {filtered.map((customer) => <article key={customer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-4">
        <div className="min-w-0">
          <h3 className="font-bold text-charcoal-900">{customer.name || 'Chưa đặt tên'}</h3>
          <p className="text-xs text-charcoal-600">{customer.email || customer.username || customer.id}</p>
          <p className="text-xs text-charcoal-600">{customer.phone || 'Chưa có số điện thoại'}{customer.city ? ` · ${customer.city}` : ''} · {customer.points} điểm</p>
          <p className="text-xs text-charcoal-400">Tham gia {formatDate(customer.createdAt)} · Đăng nhập gần nhất {formatDate(customer.lastLoginAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${customer.status === 'active' ? 'bg-sage-100 text-sage-800' : 'bg-blush-100 text-blush-700'}`}>
            {customer.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}
          </span>
          {customer.status === 'active'
            ? <button disabled={busy} onClick={() => void change(customer, 'block')} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">Khóa</button>
            : <button disabled={busy} onClick={() => void change(customer, 'unblock')} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">Mở khóa</button>}
          <button disabled={busy} onClick={() => void change(customer, 'delete')} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-red-700">Xóa</button>
        </div>
      </article>)}
      {filtered.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-sm text-charcoal-600">Không có khách hàng phù hợp.</p>}
    </section>
  </div>;
}
