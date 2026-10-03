'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { errorText, toast } from '@/client/toast';
import { PASSWORD_MIN } from '@/lib/account/account-input';

const field = 'w-full rounded-2xl border border-cream-300 px-4 py-2.5 text-sm outline-none focus:border-honey-500 focus:ring-2 focus:ring-honey-100';

/**
 * Đổi mật khẩu của khách. Tài khoản tạo bằng Google chưa có mật khẩu thì để trống ô "Mật khẩu hiện tại" để đặt mật khẩu
 * lần đầu (đăng nhập được bằng email + mật khẩu). Đổi xong thì đăng nhập lại ngay bằng mật khẩu mới vì các phiên cũ hết hạn.
 */
export function ChangePasswordForm() {
  const [draft, setDraft] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.next.length < PASSWORD_MIN) { toast.warning(`Mật khẩu mới cần ít nhất ${PASSWORD_MIN} ký tự.`, { id: 'change-password' }); return; }
    if (draft.next !== draft.confirm) { toast.warning('Mật khẩu xác nhận không khớp.', { id: 'change-password' }); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/user/password', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: draft.current, newPassword: draft.next }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không đổi được mật khẩu');
      if (data.email) await signIn('credentials', { redirect: false, email: data.email, password: draft.next });
      setDraft({ current: '', next: '', confirm: '' });
      toast.success('Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.', { id: 'change-password' });
    } catch (submitError) { toast.error(errorText(submitError, 'Có lỗi xảy ra'), { id: 'change-password' }); }
    finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="space-y-4" noValidate>
    <label className="block space-y-1 text-xs font-bold text-charcoal-800">Mật khẩu hiện tại
      <input type="password" autoComplete="current-password" className={field} value={draft.current}
        onChange={(event) => setDraft({ ...draft, current: event.target.value })} />
      <span className="block font-normal text-charcoal-500">Tài khoản tạo bằng Google và chưa từng đặt mật khẩu thì để trống.</span>
    </label>
    <label className="block space-y-1 text-xs font-bold text-charcoal-800">Mật khẩu mới (ít nhất {PASSWORD_MIN} ký tự)
      <input type="password" autoComplete="new-password" className={field} value={draft.next}
        onChange={(event) => setDraft({ ...draft, next: event.target.value })} />
    </label>
    <label className="block space-y-1 text-xs font-bold text-charcoal-800">Nhập lại mật khẩu mới
      <input type="password" autoComplete="new-password" className={field} value={draft.confirm}
        onChange={(event) => setDraft({ ...draft, confirm: event.target.value })} />
    </label>
    <button type="submit" disabled={busy}
      className="min-h-11 rounded-2xl bg-honey-500 px-6 text-sm font-bold text-white shadow-sm hover:bg-honey-600 disabled:opacity-50">
      {busy ? 'Đang lưu…' : 'Đổi mật khẩu'}
    </button>
  </form>;
}
