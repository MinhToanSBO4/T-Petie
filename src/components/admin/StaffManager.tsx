'use client';

import { useEffect, useState, type FormEvent } from 'react';

type Staff = { id: string; name: string; username: string; email: string; status: 'active' | 'blocked' };
const inputClass = 'w-full rounded-xl border border-cream-200 bg-white px-4 py-3 outline-none focus:border-honey-500';

export function StaffManager() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState({ name: '', username: '', email: '', password: '' });
  const [reset, setReset] = useState<Record<string, string>>({});

  async function reload() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được nhân viên');
      setStaff((data.users || []).filter((user: { role: string }) => user.role === 'staff'));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không tải được nhân viên'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tạo được tài khoản');
      setDraft({ name: '', username: '', email: '', password: '' });
      setMessage('Đã tạo tài khoản nhân viên.');
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không tạo được tài khoản'); }
    finally { setBusy(false); }
  }

  async function update(id: string, body: Record<string, string>) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được tài khoản');
      setReset((current) => ({ ...current, [id]: '' }));
      setMessage('Đã cập nhật tài khoản nhân viên.');
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không cập nhật được tài khoản'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <form onSubmit={create} className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-6 space-y-4">
      <h2 className="text-lg font-bold">Thêm nhân viên</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <input className={inputClass} placeholder="Họ và tên" aria-label="Họ và tên" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required minLength={2} />
        <input className={inputClass} placeholder="Tên đăng nhập" aria-label="Tên đăng nhập" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value.toLowerCase() })} required pattern="[a-z][a-z0-9_]{2,31}" />
        <input className={inputClass} type="email" placeholder="Email" aria-label="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} required />
        <input className={inputClass} type="password" placeholder="Mật khẩu (từ 12 ký tự)" aria-label="Mật khẩu" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} required minLength={12} autoComplete="new-password" />
      </div>
      <button disabled={busy} className="rounded-xl bg-honey-600 px-5 py-3 text-white font-semibold disabled:opacity-50">{busy ? 'Đang lưu…' : 'Tạo nhân viên'}</button>
    </form>

    {message && <p role="status" className="rounded-xl bg-cream-100 px-4 py-3 text-sm">{message}</p>}
    <section className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-6 space-y-4">
      <h2 className="text-lg font-bold">Danh sách nhân viên</h2>
      {loading ? <div className="space-y-3" aria-label="Đang tải nhân viên">{[1, 2, 3].map((index) => <div key={index} className="h-16 rounded-xl bg-cream-100 animate-pulse" />)}</div> :
        staff.length === 0 ? <p className="text-sm text-charcoal-500">Chưa có nhân viên.</p> :
          staff.map((person) => <div key={person.id} className="border-t border-cream-100 pt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="font-semibold">{person.name} <span className="text-xs text-charcoal-500">@{person.username}</span></p>
              <p className="text-sm text-charcoal-500">{person.email} · {person.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={busy} onClick={() => void update(person.id, { status: person.status === 'active' ? 'blocked' : 'active' })} className="rounded-xl border border-cream-200 px-3 py-2 text-sm disabled:opacity-50">{person.status === 'active' ? 'Khóa' : 'Mở khóa'}</button>
              <input type="password" aria-label={`Mật khẩu mới cho ${person.username}`} placeholder="Mật khẩu mới" minLength={12} value={reset[person.id] || ''} onChange={(e) => setReset((current) => ({ ...current, [person.id]: e.target.value }))} className="rounded-xl border border-cream-200 px-3 py-2 text-sm" autoComplete="new-password" />
              <button type="button" disabled={busy || (reset[person.id] || '').length < 12} onClick={() => void update(person.id, { password: reset[person.id] })} className="rounded-xl bg-charcoal-900 px-3 py-2 text-sm text-white disabled:opacity-50">Đặt lại mật khẩu</button>
            </div>
          </div>)}
    </section>
  </div>;
}
