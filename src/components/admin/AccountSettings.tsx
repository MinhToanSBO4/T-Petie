'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Check, Eye, EyeOff, KeyRound, UserRound } from 'lucide-react';
import { markAdminPagesStale } from '@/client/admin-freshness';
import { errorText, toast } from '@/client/toast';
import { PASSWORD_MIN } from '@/lib/account/account-input';

export type AccountProfile = {
  name: string; email: string; phone: string; username: string; role: 'admin' | 'staff';
  createdAt: string; lastLoginAt: string | null;
};

const field = 'mt-1 block w-full rounded-xl border p-3 text-sm font-normal';
const card = 'rounded-2xl border border-cream-200 bg-white p-5';
/** "09:05 02/10/2026" (hoặc chỉ ngày) theo giờ Việt Nam. */
const formatTime = (value: string | null, withTime = true) => value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit', month: '2-digit', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const : {}) })
  .format(new Date(value)) : '—';

async function send(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Có lỗi xảy ra, vui lòng thử lại');
  return data;
}

/** Trang tài khoản của quản trị viên/nhân viên: thông tin liên hệ, đổi mật khẩu và lần đăng nhập gần nhất. */
export function AccountSettings({ profile }: { profile: AccountProfile }) {
  const [saved, setSaved] = useState({ name: profile.name, email: profile.email, phone: profile.phone });
  const initial = (saved.name.trim()[0] || '?').toUpperCase();

  return <div className="max-w-3xl space-y-5">
    <h1 className="font-heading text-3xl font-bold text-charcoal-900">Tài khoản của tôi</h1>

    <section className={`${card} flex flex-wrap items-center gap-4`}>
      <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-honey-100 font-heading text-2xl font-bold text-honey-800">{initial}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-lg font-bold text-charcoal-900">
          <span className="truncate">{saved.name}</span>
          <span className="rounded-full bg-honey-100 px-2.5 py-0.5 text-xs font-bold text-honey-800">{profile.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</span>
        </p>
        <p className="text-sm text-charcoal-600">Tên đăng nhập: <span className="font-semibold">{profile.username || saved.email}</span></p>
      </div>
      <dl className="grid w-full gap-x-6 gap-y-1 border-t border-cream-100 pt-3 text-sm sm:w-auto sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
        <div className="flex gap-2"><dt className="text-charcoal-500">Đăng nhập gần nhất</dt><dd className="font-semibold tabular-nums">{formatTime(profile.lastLoginAt)}</dd></div>
        <div className="flex gap-2"><dt className="text-charcoal-500">Tạo tài khoản</dt><dd className="font-semibold tabular-nums">{formatTime(profile.createdAt, false)}</dd></div>
      </dl>
    </section>

    <ContactForm saved={saved} onSaved={setSaved} />
    <PasswordForm loginName={profile.username || saved.email} />
  </div>;
}

function ContactForm({ saved, onSaved }: {
  saved: { name: string; email: string; phone: string }; onSaved: (next: { name: string; email: string; phone: string }) => void;
}) {
  const [draft, setDraft] = useState(saved);
  const [currentPassword, setCurrentPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const emailChanged = draft.email.trim().toLowerCase() !== saved.email.toLowerCase();
  const dirty = emailChanged || draft.name.trim() !== saved.name || draft.phone.trim() !== saved.phone;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const id = toast.loading('Đang lưu thông tin…');
    try {
      const { profile } = await send('/api/admin/account', 'PATCH', { ...draft, ...(emailChanged ? { currentPassword } : {}) });
      const next = { name: profile.name || '', email: profile.email || '', phone: profile.phone || '' };
      onSaved(next); setDraft(next); setCurrentPassword('');
      // Tên trên thanh đầu trang được làm mới ở lần chuyển trang kế tiếp.
      markAdminPagesStale();
      toast.success('Đã lưu thông tin', { id,
        description: emailChanged ? 'Từ giờ đăng nhập bằng email mới hoặc tên đăng nhập.' : undefined });
    } catch (error) { toast.error(errorText(error, 'Không lưu được thông tin'), { id }); }
    finally { setBusy(false); }
  };

  return <form onSubmit={submit} className={`${card} space-y-4`}>
    <h2 className="flex items-center gap-2 text-lg font-bold"><UserRound className="size-5 text-honey-700" aria-hidden />Thông tin liên hệ</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold sm:col-span-2">Họ tên
        <input className={field} required minLength={2} maxLength={100} autoComplete="name" value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="text-sm font-semibold">Email
        <input className={field} type="email" required maxLength={254} autoComplete="email" value={draft.email}
          onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
      <label className="text-sm font-semibold">Số điện thoại
        <input className={field} type="tel" inputMode="tel" maxLength={20} autoComplete="tel" placeholder="0912 345 678" value={draft.phone}
          onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
      {emailChanged && <label className="text-sm font-semibold sm:col-span-2">Mật khẩu hiện tại để xác nhận đổi email
        <input className={field} type="password" required autoComplete="current-password" value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)} /></label>}
    </div>
    <button disabled={busy || !dirty} className="min-h-11 rounded-xl bg-honey-600 px-6 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
    </button>
  </form>;
}

function PasswordForm({ loginName }: { loginName: string }) {
  const empty = { current: '', next: '', confirm: '' };
  const [draft, setDraft] = useState(empty);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const longEnough = draft.next.length >= PASSWORD_MIN;
  const matches = draft.confirm.length > 0 && draft.confirm === draft.next;
  const type = visible ? 'text' : 'password';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const id = toast.loading('Đang đổi mật khẩu…');
    try {
      await send('/api/admin/account/password', 'POST', { currentPassword: draft.current, newPassword: draft.next });
      // Phiên cũ hết hiệu lực ngay khi đổi mật khẩu: đăng nhập lại bằng mật khẩu mới để không bị đẩy ra trang đăng nhập.
      const result = await signIn('credentials', { redirect: false, email: loginName, password: draft.next });
      if (!result?.ok) { window.location.href = '/login'; return; }
      setDraft(empty);
      toast.success('Đã đổi mật khẩu', { id, description: 'Các thiết bị khác đã được đăng xuất.' });
    } catch (error) { toast.error(errorText(error, 'Không đổi được mật khẩu'), { id }); }
    finally { setBusy(false); }
  };

  return <form onSubmit={submit} className={`${card} space-y-4`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="size-5 text-honey-700" aria-hidden />Đổi mật khẩu</h2>
      <button type="button" onClick={() => setVisible((current) => !current)} aria-pressed={visible}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-charcoal-600 hover:bg-cream-100">
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}{visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      </button>
    </div>
    {/* Giúp trình quản lý mật khẩu biết đang đổi mật khẩu của tài khoản nào. */}
    <input type="text" name="username" autoComplete="username" value={loginName} readOnly tabIndex={-1} aria-hidden className="sr-only" />
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold sm:col-span-2">Mật khẩu hiện tại
        <input className={field} type={type} required autoComplete="current-password" value={draft.current}
          onChange={(event) => setDraft({ ...draft, current: event.target.value })} /></label>
      <label className="text-sm font-semibold">Mật khẩu mới
        <input className={field} type={type} required minLength={PASSWORD_MIN} maxLength={128} autoComplete="new-password" value={draft.next}
          aria-describedby="new-password-rule" onChange={(event) => setDraft({ ...draft, next: event.target.value })} /></label>
      <label className="text-sm font-semibold">Nhập lại mật khẩu mới
        <input className={field} type={type} required autoComplete="new-password" value={draft.confirm}
          onChange={(event) => setDraft({ ...draft, confirm: event.target.value })} /></label>
    </div>
    <ul className="space-y-1 text-xs">
      <li id="new-password-rule" className={`flex items-center gap-1.5 ${longEnough ? 'text-sage-700' : 'text-charcoal-500'}`}>
        <Check className={`size-3.5 ${longEnough ? '' : 'opacity-30'}`} aria-hidden />Ít nhất {PASSWORD_MIN} ký tự</li>
      <li className={`flex items-center gap-1.5 ${matches ? 'text-sage-700' : draft.confirm ? 'text-red-700' : 'text-charcoal-500'}`}>
        <Check className={`size-3.5 ${matches ? '' : 'opacity-30'}`} aria-hidden />{draft.confirm && !matches ? 'Mật khẩu nhập lại chưa khớp' : 'Nhập lại khớp mật khẩu mới'}</li>
    </ul>
    <button disabled={busy || !draft.current || !longEnough || !matches} className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang đổi…' : 'Đổi mật khẩu'}
    </button>
  </form>;
}
