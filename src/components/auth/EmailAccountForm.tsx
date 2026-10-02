'use client';
import { useState } from 'react';
import Link from 'next/link';

export function EmailAccountForm({ mode, token = '', initialEmail = '', sent }: { mode: 'verify' | 'forgot' | 'reset'; token?: string; initialEmail?: string; sent?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(mode === 'verify' && !token
    ? sent === '0' ? 'Tài khoản đã tạo nhưng chưa gửi được thư. Vui lòng thử gửi lại bên dưới.' : 'Vui lòng mở thư xác thực trong hộp thư hoặc thư rác. Bạn cũng có thể gửi lại liên kết.' : '');
  const action = mode === 'verify' && !token ? 'resend' : mode;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (mode === 'reset' && password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/email/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'forgot' || action === 'resend' ? { email } : { token, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể xử lý yêu cầu.');
      setMessage(result.message);
      if (action === 'verify' || action === 'reset') { setDone(true); setPassword(''); setConfirm(''); }
    } catch (error) { setError(error instanceof Error ? error.message : 'Không kết nối được máy chủ.'); }
    finally { setBusy(false); }
  }
  const title = mode === 'verify' ? 'Xác thực email' : mode === 'forgot' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu';
  const field = 'w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3';
  return <div className="mx-auto max-w-lg px-4 py-12"><div className="space-y-6 rounded-3xl border border-cream-200 bg-white p-8 shadow-card">
    <h1 className="text-2xl font-bold">{title}</h1>
    {mode === 'forgot' && <p className="text-sm text-charcoal-600">Nhập email đăng ký để nhận liên kết đặt lại mật khẩu, có hiệu lực trong 30 phút.</p>}
    {mode === 'verify' && token && !done && <p className="text-sm text-charcoal-600">Bấm xác nhận bên dưới để kích hoạt tài khoản. Liên kết có hiệu lực trong 24 giờ.</p>}
    {message && <p role="status" className="rounded-xl bg-sage-50 p-4 text-sm text-sage-700">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-blush-50 p-4 text-sm text-blush-700">{error}</p>}
    {!done && <form onSubmit={submit} className="space-y-4">
      {(action === 'forgot' || action === 'resend') && <label className="block space-y-2"><span>Email đăng ký</span><input className={field} type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></label>}
      {mode === 'reset' && <><label className="block space-y-2"><span>Mật khẩu mới (12–128 ký tự)</span><input className={field} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></label><label className="block space-y-2"><span>Nhập lại mật khẩu</span><input className={field} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label></>}
      <button disabled={busy || (mode === 'reset' && !token)} className="w-full rounded-xl bg-honey-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý…' : action === 'resend' ? 'Gửi lại thư xác thực' : mode === 'forgot' ? 'Gửi liên kết' : title}</button>
    </form>}
    <div className="flex flex-wrap gap-4 text-sm text-honey-700"><Link href="/login">Về đăng nhập</Link>{mode === 'reset' && <a href="/forgot-password">Yêu cầu liên kết mới</a>}{mode === 'verify' && token && !done && <a href="/verify-email">Gửi lại thư xác thực</a>}</div>
  </div></div>;
}
