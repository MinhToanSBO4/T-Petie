'use client';

import { useState } from 'react';
import { DataTable, tableParams, type Column, type TableFilter, type TableQuery } from '@/components/admin/DataTable';
import { readJson } from '@/client/http';
import { errorText, toast } from '@/client/toast';
import { normalizePhone, PASSWORD_MIN } from '@/lib/account/account-input';

type Staff = {
  id: string; name: string; username: string; email: string; phone?: string;
  status: 'active' | 'blocked'; lastLoginAt?: string;
};
type View = { mode: 'list' } | { mode: 'create' } | { mode: 'detail'; staff: Staff };

const field = 'w-full rounded-xl border border-cream-200 px-4 py-3';
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('vi-VN') : '—';

const STAFF_SORTS = [
  { value: 'newest', label: 'Mới tạo' }, { value: 'name', label: 'Tên A–Z' }, { value: 'login', label: 'Đăng nhập gần nhất' },
];
const STAFF_FILTERS: TableFilter[] = [
  { key: 'status', label: 'Trạng thái', options: [{ value: 'active', label: 'Đang hoạt động' }, { value: 'blocked', label: 'Đã khóa' }] },
];

async function fetchStaff(query: TableQuery) {
  const response = await fetch(`/api/admin/users?${tableParams(query, { filter: 'staff' })}`, { cache: 'no-store' });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Không tải được nhân viên');
  return { items: data.items as Staff[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function StaffManager() {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const back = () => { setView({ mode: 'list' }); setReloadKey((key) => key + 1); };

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
    <DataTable columns={columns} fetchPage={fetchStaff} reloadKey={reloadKey}
      searchPlaceholder="Tìm tên, email, tên đăng nhập"
      sorts={STAFF_SORTS} filters={STAFF_FILTERS}
      emptyText="Chưa có nhân viên nào."
      onRowClick={(row) => setView({ mode: 'detail', staff: row })}
      toolbar={<button type="button" onClick={() => setView({ mode: 'create' })}
        className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">Thêm nhân viên</button>} />
  </div>;
}

/** Tạo tài khoản nhân viên mới. */
function StaffCreateForm({ onDone }: { onDone: () => void }) {
  const [draft, setDraft] = useState({ name: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    const id = toast.loading('Đang tạo tài khoản…');
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Không tạo được tài khoản');
      toast.success(`Đã tạo tài khoản nhân viên ${draft.name}`, { id });
      onDone();
    } catch (submitError) {
      const text = errorText(submitError, 'Không tạo được tài khoản');
      setError(text); toast.error(text, { id });
    }
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
      <label className="text-sm font-semibold">Mật khẩu ban đầu (tối thiểu {PASSWORD_MIN} ký tự)
        <input className={`${field} mt-1`} type="text" required minLength={PASSWORD_MIN} value={draft.password}
          onChange={(event) => setDraft({ ...draft, password: event.target.value })} /></label>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="min-h-11 rounded-xl bg-honey-600 px-6 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
    </button>
  </form>;
}

/** Chi tiết nhân viên: sửa thông tin liên hệ, khóa/mở tài khoản và đặt lại mật khẩu. */
function StaffDetail({ staff: initial, onBack }: { staff: Staff; onBack: () => void }) {
  const [staff, setStaff] = useState(initial);
  const [draft, setDraft] = useState({ name: initial.name, email: initial.email, phone: initial.phone || '' });
  const [busy, setBusy] = useState(false);
  // Lỗi nhập liệu và lỗi thao tác hiện trên form (thông báo góc màn hình tự ẩn); kết quả thành công hiện ở góc màn hình.
  const [error, setError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const dirty = draft.name.trim() !== staff.name || draft.email.trim().toLowerCase() !== staff.email.toLowerCase()
    || draft.phone.trim() !== (staff.phone || '');

  const update = async (body: Record<string, unknown>, pending: string, okMessage: string) => {
    setBusy(true); setError('');
    const id = toast.loading(pending);
    try {
      const response = await fetch(`/api/admin/users/${staff.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Thao tác thất bại');
      // Hiện ngay trạng thái/thông tin mới thay vì giữ bản đọc từ danh sách.
      setStaff((current) => ({ ...current, ...data.user, ...(typeof body.phone === 'string' ? { phone: body.phone } : {}) }));
      toast.success(okMessage, { id });
      if (data.temporaryPassword) setTemporaryPassword(data.temporaryPassword);
    } catch (updateError) {
      const text = errorText(updateError, 'Thao tác thất bại');
      setError(text); toast.error(text, { id });
    }
    finally { setBusy(false); }
  };

  const saveContact = (event: React.FormEvent) => {
    event.preventDefault();
    const phone = draft.phone.trim() ? normalizePhone(draft.phone) : '';
    if (phone === null) { setError('Số điện thoại gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09'); return; }
    setDraft({ ...draft, phone });
    void update({ name: draft.name.trim(), email: draft.email.trim(), phone }, 'Đang lưu thông tin…', 'Đã lưu thông tin nhân viên');
  };

  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">{staff.name}</h2>
        <p className="text-xs text-charcoal-500">{staff.username} · {staff.email}</p>
      </div>
      <button type="button" onClick={() => onBack()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {temporaryPassword && <p className="rounded-xl bg-honey-50 p-3 text-sm">
      Mật khẩu tạm thời mới: <strong className="font-mono">{temporaryPassword}</strong> — hãy gửi cho nhân viên và yêu cầu đổi ngay sau khi đăng nhập.
    </p>}

    <form onSubmit={saveContact} className="space-y-3 rounded-2xl border border-cream-200 bg-white p-5">
      <h3 className="font-bold">Thông tin liên hệ</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold">Họ tên
          <input className={`${field} mt-1 font-normal`} required minLength={2} maxLength={100} value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="text-sm font-semibold">Email đăng nhập
          <input className={`${field} mt-1 font-normal`} type="email" required maxLength={254} value={draft.email}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
        <label className="text-sm font-semibold">Số điện thoại
          <input className={`${field} mt-1 font-normal`} type="tel" inputMode="tel" maxLength={20} placeholder="0912 345 678" value={draft.phone}
            onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
      </div>
      <button disabled={busy || !dirty} className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white disabled:opacity-50">Lưu thông tin</button>
    </form>

    <section className="grid gap-3 rounded-2xl border border-cream-200 bg-white p-5 sm:grid-cols-2">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">Trạng thái</p>
        <p className="text-sm">{staff.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</p></div>
      <div><p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">Đăng nhập gần nhất</p>
        <p className="text-sm">{formatDate(staff.lastLoginAt)}</p></div>
    </section>

    <div className="flex flex-wrap gap-2">
      {staff.status === 'active'
        ? <button type="button" disabled={busy} onClick={() => void update({ status: 'blocked' }, 'Đang khóa tài khoản…', 'Đã khóa tài khoản nhân viên')}
            className="min-h-11 rounded-xl border border-cream-300 px-5 text-sm font-semibold disabled:opacity-50">Khóa tài khoản</button>
        : <button type="button" disabled={busy} onClick={() => void update({ status: 'active' }, 'Đang mở khóa tài khoản…', 'Đã mở lại tài khoản')}
            className="min-h-11 rounded-xl border border-cream-300 px-5 text-sm font-semibold disabled:opacity-50">Mở khóa</button>}
      <button type="button" disabled={busy} onClick={() => void update({ resetPassword: true }, 'Đang tạo mật khẩu tạm thời…', 'Đã tạo mật khẩu tạm thời mới')}
        className="min-h-11 rounded-xl bg-sage-700 px-5 text-sm font-bold text-white disabled:opacity-50">Đặt lại mật khẩu</button>
    </div>
  </div>;
}
