'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorText, toast } from '@/client/toast';
import { PASSWORD_MIN } from '@/lib/account/account-input';
import { VERIFIED_EVENT, formatCountdown, inboxUrl, useResendVerification } from '@/components/auth/EmailVerification';

type Mode = 'verify' | 'forgot' | 'reset';
type Props = { mode: Mode; token?: string; initialEmail?: string; sent?: string };

const field = 'w-full rounded-2xl border border-cream-300 bg-white px-4 py-3 text-sm text-charcoal-900 outline-none transition-colors placeholder:text-charcoal-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-100';
const primary = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-honey-500 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-honey-600 disabled:cursor-not-allowed disabled:opacity-60';
const secondary = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cream-300 bg-white px-4 text-sm font-bold text-charcoal-800 transition-colors hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-60';

async function post(action: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/auth/email/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Không thể xử lý yêu cầu. Vui lòng thử lại.');
  return result as { message: string; retryAfter?: number };
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="rounded-[28px] border border-cream-200 bg-white p-6 shadow-xl shadow-cream-200/50 sm:p-8">
        <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-honey-100 text-honey-600">{icon}</div>
        <h1 className="text-xl font-bold text-charcoal-900 sm:text-2xl">{title}</h1>
        <div className="mt-3 space-y-5 text-sm leading-relaxed text-charcoal-600">{children}</div>
      </div>
    </div>
  );
}

function ResendButton({ email, initialCooldown = 0, label = 'Gửi lại email xác thực', disabled = false }: {
  email?: string; initialCooldown?: number; label?: string; disabled?: boolean;
}) {
  const { busy, secondsLeft, resend } = useResendVerification(initialCooldown);
  return (
    <button type="button" className={secondary} disabled={disabled || busy || secondsLeft > 0} onClick={() => void resend(email)}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
      {busy ? 'Đang gửi…' : secondsLeft > 0 ? `Gửi lại sau ${formatCountdown(secondsLeft)}` : label}
    </button>
  );
}

/** Mở link trong email: xác thực ngay khi trang tải (không bắt khách bấm thêm), nút dự phòng nếu lỗi mạng. */
function VerifyToken({ token }: { token: string }) {
  const { isAuthenticated, user, refreshSession } = useAuth();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  const verify = async () => {
    setState('working');
    try {
      const result = await post('verify', { token });
      setMessage(result.message);
      setState('done');
      // Báo cho các tab khác đang mở shop để mở khóa đặt hàng ngay.
      try { const channel = new BroadcastChannel(VERIFIED_EVENT); channel.postMessage('verified'); channel.close(); } catch { /* trình duyệt cũ */ }
      window.dispatchEvent(new Event(VERIFIED_EVENT));
      await refreshSession().catch(() => {});
    } catch (error) {
      setState('error');
      toast.error(errorText(error, 'Không kết nối được máy chủ.'), { id: 'verify-email' });
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'done') {
    return (
      <Card icon={<CheckCircle2 className="size-6" aria-hidden />} title="Xác thực email thành công">
        <p>{message}</p>
        <Link href={isAuthenticated ? '/' : '/login'} className={primary}>{isAuthenticated ? 'Tiếp tục mua sắm' : 'Đăng nhập'}</Link>
      </Card>
    );
  }
  return (
    <Card icon={<MailCheck className="size-6" aria-hidden />} title="Xác thực email">
      <p>{state === 'error' ? 'Chưa xác thực được email. Bạn bấm "Thử lại" hoặc gửi liên kết mới nhé.' : 'Đang xác thực email của bạn, vui lòng đợi trong giây lát…'}</p>
      <form onSubmit={(event) => { event.preventDefault(); void verify(); }} className="space-y-3">
        <button type="submit" className={primary} disabled={state === 'working'}>
          {state === 'working' ? <><Loader2 className="size-4 animate-spin" aria-hidden /> Đang xác thực…</> : 'Thử lại'}
        </button>
        {state === 'error' && (isAuthenticated && user?.emailVerified === false
          ? <ResendButton label="Gửi liên kết mới" />
          : <Link href="/verify-email" className={secondary}>Yêu cầu liên kết mới</Link>)}
      </form>
    </Card>
  );
}

/** Sau khi đăng ký, hoặc khách cần gửi lại thư: hướng dẫn mở hộp thư và nút gửi lại có đếm ngược. */
function CheckInbox({ initialEmail, sent }: { initialEmail?: string; sent?: string }) {
  const { isAuthenticated, user } = useAuth();
  const signedInUnverified = isAuthenticated && user?.emailVerified === false;
  const [email, setEmail] = useState(initialEmail || '');
  const target = signedInUnverified ? user?.email : email.trim();
  const inbox = inboxUrl(target);

  if (isAuthenticated && user?.emailVerified) {
    return (
      <Card icon={<CheckCircle2 className="size-6" aria-hidden />} title="Email đã được xác thực">
        <p>Tài khoản <strong className="break-all text-charcoal-900">{user.email}</strong> đã sẵn sàng để đặt hàng.</p>
        <Link href="/" className={primary}>Tiếp tục mua sắm</Link>
      </Card>
    );
  }

  return (
    <Card icon={<MailCheck className="size-6" aria-hidden />} title="Kiểm tra hộp thư của bạn">
      {sent === '0'
        ? <p>Tài khoản đã được tạo nhưng shop chưa gửi được email xác thực. Bạn bấm &quot;Gửi lại email xác thực&quot; bên dưới nhé.</p>
        : <p>Shop đã gửi liên kết xác thực tới {target ? <strong className="break-all text-charcoal-900">{target}</strong> : 'email đăng ký của bạn'}. Mở thư và bấm <strong>&quot;Xác thực email&quot;</strong> để bắt đầu đặt hàng. Liên kết có hiệu lực 24 giờ.</p>}
      <form onSubmit={(event) => event.preventDefault()} className="space-y-3">
        {!signedInUnverified && (
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-charcoal-800">Email đăng ký</span>
            <input className={field} type="email" autoComplete="email" required maxLength={254} value={email}
              placeholder="mebe@gmail.com" onChange={(event) => setEmail(event.target.value)} />
          </label>
        )}
        {inbox && <a href={inbox} target="_blank" rel="noopener noreferrer" className={primary}>Mở hộp thư</a>}
        <ResendButton email={signedInUnverified ? undefined : email.trim()} initialCooldown={sent === '1' ? 60 : 0}
          disabled={!signedInUnverified && !email.trim()} />
      </form>
      <p className="text-xs text-charcoal-500">Không thấy thư? Kiểm tra mục Quảng cáo, Cập nhật hoặc Thư rác. Thư được gửi từ địa chỉ No-Reply của T&apos;Petie.</p>
      <div className="flex flex-wrap justify-between gap-3 border-t border-cream-200 pt-4 text-sm font-semibold">
        <Link href="/" className="text-honey-700 hover:text-honey-800">Tiếp tục xem sản phẩm</Link>
        {!isAuthenticated && <Link href="/login" className="text-charcoal-700 hover:text-honey-700">Đăng nhập</Link>}
      </div>
    </Card>
  );
}

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000));

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || secondsLeft > 0) return;
    setBusy(true);
    try {
      const result = await post('forgot', { email: email.trim() });
      toast.success('Đã gửi yêu cầu đặt lại mật khẩu', { id: 'forgot-password', description: result.message });
      setSent(true);
      setUntil(Date.now() + (result.retryAfter || 60) * 1000);
      setNow(Date.now());
    } catch (submitError) {
      toast.error(errorText(submitError, 'Không kết nối được máy chủ.'), { id: 'forgot-password' });
    } finally { setBusy(false); }
  };

  return (
    <Card icon={<KeyRound className="size-6" aria-hidden />} title="Quên mật khẩu">
      <p>Nhập email đã đăng ký, shop sẽ gửi liên kết để bạn đặt mật khẩu mới. Liên kết có hiệu lực trong 30 phút.</p>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-charcoal-800">Email đăng ký</span>
          <input className={field} type="email" autoComplete="email" required maxLength={254} value={email}
            placeholder="mebe@gmail.com" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <button type="submit" className={primary} disabled={busy || secondsLeft > 0}>
          {busy ? <><Loader2 className="size-4 animate-spin" aria-hidden /> Đang gửi…</>
            : secondsLeft > 0 ? `Gửi lại sau ${formatCountdown(secondsLeft)}` : sent ? 'Gửi lại liên kết' : 'Gửi liên kết đặt lại mật khẩu'}
        </button>
      </form>
      <div className="border-t border-cream-200 pt-4 text-sm font-semibold">
        <Link href="/login" className="text-honey-700 hover:text-honey-800">Quay lại đăng nhập</Link>
      </div>
    </Card>
  );
}

function ResetPassword({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  // Mở trang không kèm liên kết hợp lệ: báo ngay thay vì để khách điền xong mới bị từ chối.
  useEffect(() => {
    if (!token) toast.error('Liên kết không hợp lệ hoặc đã hết hạn', { id: 'reset-password', description: 'Vui lòng yêu cầu liên kết mới.' });
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < PASSWORD_MIN) { toast.warning(`Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự.`, { id: 'reset-password' }); return; }
    if (password !== confirm) { toast.warning('Mật khẩu xác nhận không khớp.', { id: 'reset-password' }); return; }
    setBusy(true);
    try {
      const result = await post('reset', { token, password });
      setDone(result.message);
      setPassword(''); setConfirm('');
    } catch (submitError) {
      toast.error(errorText(submitError, 'Không kết nối được máy chủ.'), { id: 'reset-password' });
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <Card icon={<CheckCircle2 className="size-6" aria-hidden />} title="Đã đặt mật khẩu mới">
        <p>{done}</p>
        <Link href="/login" className={primary}>Đăng nhập</Link>
      </Card>
    );
  }
  return (
    <Card icon={<KeyRound className="size-6" aria-hidden />} title="Đặt lại mật khẩu">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-charcoal-800">Mật khẩu mới</span>
          <span className="relative block">
            <input className={`${field} pr-12`} type={show ? 'text' : 'password'} autoComplete="new-password" required maxLength={128}
              placeholder={`Tối thiểu ${PASSWORD_MIN} ký tự`} value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-charcoal-400 hover:text-charcoal-700">
              {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          </span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-charcoal-800">Nhập lại mật khẩu mới</span>
          <input className={field} type={show ? 'text' : 'password'} autoComplete="new-password" required maxLength={128}
            value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </label>
        <button type="submit" className={primary} disabled={busy || !token}>
          {busy ? <><Loader2 className="size-4 animate-spin" aria-hidden /> Đang lưu…</> : 'Đặt mật khẩu mới'}
        </button>
      </form>
      <div className="flex flex-wrap justify-between gap-3 border-t border-cream-200 pt-4 text-sm font-semibold">
        <Link href="/login" className="text-honey-700 hover:text-honey-800">Quay lại đăng nhập</Link>
        <Link href="/forgot-password" className="text-charcoal-700 hover:text-honey-700">Yêu cầu liên kết mới</Link>
      </div>
    </Card>
  );
}

export function EmailAccountForm({ mode, token = '', initialEmail = '', sent }: Props) {
  if (mode === 'verify') return token ? <VerifyToken token={token} /> : <CheckInbox initialEmail={initialEmail} sent={sent} />;
  if (mode === 'forgot') return <ForgotPassword />;
  return <ResetPassword token={token} />;
}
