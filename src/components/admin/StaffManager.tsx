'use client';

import { useState } from 'react';
import { DataTable, type Column, type TableQuery } from '@/components/admin/DataTable';

type Staff = {
  id: string; name: string; username: string; email: string;
  status: 'active' | 'blocked'; lastLoginAt?: string;
};
type View = { mode: 'list' } | { mode: 'create' } | { mode: 'detail'; staff: Staff };

const field = 'w-full rounded-xl border border-cream-200 px-4 py-3';
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('vi-VN') : '—';

async function fetchStaff(query: TableQuery) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: 'staff' });
  const response = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không tải được nhân viên');
  return { items: data.items as Staff[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function StaffManager() {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState('');
  const back = (text?: string) => { if (text) setMessage(text); setView({ mode: 'list' }); setReloadKey((key) => key + 1); };

  if (view.mode === 'create') return <StaffCreateForm onDone={back} />;
  if (view.mode === 'detail') return <StaffDetail staff={view.staff} onBack={back} />;

  const columns: Column<Staff>[] = [
    { key: 'name', header: 'Nhân viên', render: (row) => <div>
        <p className="font-semibold text-charcoal-900">{row.name}</p>
        <p className="text-xs text-charcoal-500">{row.email}</p>
      </div> },
    { key: 'username', header: 'Tên đăng nhập', render: (row) => row.username || '—' },
    { key: 'login', header: 'Đăng nhập gần nhất', render: (row) => <span className="text-xs text-charcoal-600">{formatDate(row.lastLoginAt)}</span> },
    { key: 'status', header: 'Trạng thái', render: (row) => <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
      row.status === 'active' ? 'bg-sage-100 text-sage-800' : 'bg-blush-100 text-blush-700'}`}>
      {row.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</span> },
    { key: 'action', header: '', render: (row) => <button type="button" onClick={(event) => { event.stopPropagation(); setView({ mode: 'detail', staff: row }); }} className="min-h-9 whitespace-nowrap rounded-lg border border-cream-300 px-3 text-xs font-bold">Chỉnh sửa</button> },
  ];

  return <div className="space-y-4">
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    <DataTable columns={columns} fetchPage={fetchStaff} reloadKey={reloadKey}
      searchPlaceholder="Tìm theo tên, email hoặc tên đăng nhập"
      emptyText="Chưa có nhân viên nào."
      onRowClick={(row) => setView({ mode: 'detail', staff: row })}
      toolbar={<button type="button" onClick={() => setView({ mode: 'create' })}
        className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">Thêm nhân viên</button>} />
    <p className="text-xs text-charcoal-500">Bấm vào một dòng để xem chi tiết, khóa tài khoản hoặc đặt lại mật khẩu.</p>
  </div>;
}

/** Tạo tài khoản nhân viên mới. */
function StaffCreateForm({ onDone }: { onDone: (message?: string) => void }) {
  const [draft, setDraft] = useState({ name: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tạo được tài khoản');
      onDone(`Đã tạo tài khoản nhân viên ${draft.name}.`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="space-y-4 rounded-2xl border border-cream-200 bg-white p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold">Thêm nhân viên</h2>
      <button type="button" onClick={() => onDone()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Họ tên
        <input className={`${field} mt-1`} required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="text-sm font-semibold">Tên đăng nhập
        <input className={`${field} mt-1`} required value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} /></label>
      <label className="text-sm font-semibold">Email
        <input className={`${field} mt-1`} type="email" required value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
      <label className="text-sm font-semibold">Mật khẩu ban đầu (tối thiểu 12 ký tự)
        <input className={`${field} mt-1`} type="text" required minLength={12} value={draft.password}
          onChange={(event) => setDraft({ ...draft, password: event.target.value })} /></label>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="min-h-11 rounded-xl bg-honey-600 px-6 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
    </button>
  </form>;
}

/** Chi tiết nhân viên: khóa/mở tài khoản và đặt lại mật khẩu. */
function StaffDetail({ staff, onBack }: { staff: Staff; onBack: (message?: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const update = async (body: Record<string, unknown>, okMessage: string) => {
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch(`/api/admin/users/${staff.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Thao tác thất bại');
      setMessage(okMessage);
      if (data.temporaryPassword) setTemporaryPassword(data.temporaryPassword);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">{staff.name}</h2>
        <p className="text-xs text-charcoal-500">{staff.username} · {staff.email}</p>
      </div>
      <button type="button" onClick={() => onBack()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {temporaryPassword && <p className="rounded-xl bg-honey-50 p-3 text-sm">
      Mật khẩu tạm thời mới: <strong className="font-mono">{temporaryPassword}</strong> — hãy gửi cho nhân viên và yêu cầu đổi ngay sau khi đăng nhập.
    </p>}

    <section className="grid gap-3 rounded-2xl border border-cream-200 bg-white p-5 sm:grid-cols-2">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">Trạng thái</p>
        <p className="text-sm">{staff.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</p></div>
      <div><p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">Đăng nhập gần nhất</p>
        <p className="text-sm">{formatDate(staff.lastLoginAt)}</p></div>
    </section>

    <div className="flex flex-wrap gap-2">
      {staff.status === 'active'
        ? <button type="button" disabled={busy} onClick={() => void update({ status: 'blocked' }, 'Đã khóa tài khoản nhân viên.')}
            className="min-h-11 rounded-xl border border-cream-300 px-5 text-sm font-semibold disabled:opacity-50">Khóa tài khoản</button>
        : <button type="button" disabled={busy} onClick={() => void update({ status: 'active' }, 'Đã mở lại tài khoản.')}
            className="min-h-11 rounded-xl border border-cream-300 px-5 text-sm font-semibold disabled:opacity-50">Mở khóa</button>}
      <button type="button" disabled={busy} onClick={() => void update({ resetPassword: true }, 'Đã tạo mật khẩu tạm thời mới.')}
        className="min-h-11 rounded-xl bg-sage-700 px-5 text-sm font-bold text-white disabled:opacity-50">Đặt lại mật khẩu</button>
    </div>
  </div>;
}
