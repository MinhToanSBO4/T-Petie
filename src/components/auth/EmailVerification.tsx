'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, MailCheck, RefreshCw, X } from 'lucide-react';
import { DialogBehavior } from '@/components/layout/DialogBehavior';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/client/toast';

/**
 * Xác thực email của khách đăng ký bằng email + mật khẩu:
 * - Chưa xác thực vẫn đăng nhập, xem tài khoản, thêm giỏ hàng; bấm đặt hàng thì hiện hộp thoại nhắc xác thực
 *   (`requireVerifiedEmail()`), máy chủ cũng từ chối đơn (api/checkout trả EMAIL_UNVERIFIED).
 * - Nút "Gửi lại email" có đồng hồ đếm ngược theo thời gian chờ máy chủ trả về; lưu trong trình duyệt để tải lại
 *   trang không đặt lại đồng hồ. Máy chủ vẫn là nơi quyết định (giới hạn theo tài khoản và IP).
 * - Xác thực xong ở tab khác (mở link trong email) thì tab này tự cập nhật khi khách quay lại.
 */

const COOLDOWN_KEY = 'tpetie:verify-resend-until';
export const VERIFIED_EVENT = 'tpetie:email-verified';

type ResendState = { busy: boolean; secondsLeft: number; resend: (email?: string) => Promise<boolean> };

function readCooldown() {
  try { return Number(window.localStorage.getItem(COOLDOWN_KEY)) || 0; } catch { return 0; }
}
function writeCooldown(until: number) {
  try { window.localStorage.setItem(COOLDOWN_KEY, String(until)); } catch { /* chế độ riêng tư: chỉ nhớ trong tab */ }
}

/** Gửi lại thư xác thực kèm đồng hồ đếm ngược. `initialCooldown`: vừa gửi xong (ví dụ ngay sau khi đăng ký). */
export function useResendVerification(initialCooldown = 0): ResendState {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = readCooldown();
    const start = initialCooldown ? Math.max(stored, Date.now() + initialCooldown * 1000) : stored;
    if (initialCooldown) writeCooldown(start);
    setUntil(start);
  }, [initialCooldown]);

  const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000));
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const startCooldown = (seconds: number) => {
    const next = Date.now() + seconds * 1000;
    writeCooldown(next);
    setUntil(next);
    setNow(Date.now());
  };

  const resend = async (email?: string) => {
    if (busy || secondsLeft > 0) return false;
    setBusy(true);
    try {
      const response = await fetch('/api/auth/email/resend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(email ? { email } : {}),
      });
      const result = await response.json().catch(() => ({}));
      if (typeof result.retryAfter === 'number' && result.retryAfter > 0) startCooldown(result.retryAfter);
      if (!response.ok) { toast.error(result.error || 'Chưa gửi được email. Vui lòng thử lại.'); return false; }
      if (result.verified) { window.dispatchEvent(new Event(VERIFIED_EVENT)); toast.success(result.message); return true; }
      toast.success('Đã gửi lại email xác thực', { description: result.message });
      return true;
    } catch {
      toast.error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, secondsLeft, resend };
}

export function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Hộp thư web phổ biến để khách mở nhanh; null nếu không nhận ra nhà cung cấp. */
export function inboxUrl(email: string | undefined) {
  const domain = email?.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  if (domain === 'gmail.com' || domain === 'googlemail.com') return 'https://mail.google.com/mail/u/0/#inbox';
  if (/^(outlook|hotmail|live|msn)\./.test(domain)) return 'https://outlook.live.com/mail/0/';
  if (domain.startsWith('yahoo.')) return 'https://mail.yahoo.com/';
  if (domain === 'icloud.com' || domain === 'me.com') return 'https://www.icloud.com/mail';
  return null;
}

type Ctx = {
  /** Khách đã đăng nhập nhưng chưa xác thực email. */
  needsVerification: boolean;
  /** true nếu được đặt hàng; false thì đã mở hộp thoại nhắc xác thực. */
  requireVerifiedEmail: () => boolean;
  openVerificationDialog: () => void;
  /** Hỏi máy chủ (không qua bộ đệm) rồi cập nhật phiên; trả về true nếu đã xác thực. */
  checkVerification: () => Promise<boolean>;
};

const EmailVerificationContext = createContext<Ctx | null>(null);

export function useEmailVerification() {
  const context = useContext(EmailVerificationContext);
  if (!context) throw new Error('useEmailVerification must be used within EmailVerificationProvider');
  return context;
}

export function EmailVerificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, refreshSession } = useAuth();
  const needsVerification = Boolean(isAuthenticated && user?.role === 'user' && user.emailVerified === false);
  const [open, setOpen] = useState(false);
  const checking = useRef<Promise<boolean> | null>(null);

  const checkVerification = useCallback(() => {
    checking.current ??= (async () => {
      try {
        const response = await fetch('/api/auth/email/status', { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.verified) { await refreshSession(); return true; }
        return false;
      } catch { return false; }
      finally { checking.current = null; }
    })();
    return checking.current;
  }, [refreshSession]);

  // Khách mở link xác thực ở tab/thiết bị khác rồi quay lại: kiểm tra một lần khi tab được xem lại.
  useEffect(() => {
    if (!needsVerification) return;
    const onVisible = () => { if (document.visibilityState === 'visible') void checkVerification(); };
    const onVerified = () => { void refreshSession(); };
    let channel: BroadcastChannel | null = null;
    try { channel = new BroadcastChannel(VERIFIED_EVENT); channel.onmessage = onVerified; } catch { /* trình duyệt cũ */ }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(VERIFIED_EVENT, onVerified);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(VERIFIED_EVENT, onVerified);
      channel?.close();
    };
  }, [needsVerification, checkVerification, refreshSession]);

  useEffect(() => { if (!needsVerification) setOpen(false); }, [needsVerification]);

  const requireVerifiedEmail = useCallback(() => {
    if (!needsVerification) return true;
    setOpen(true);
    return false;
  }, [needsVerification]);

  return (
    <EmailVerificationContext.Provider value={{ needsVerification, requireVerifiedEmail, openVerificationDialog: () => setOpen(true), checkVerification }}>
      {children}
      <VerifyEmailDialog open={open && needsVerification} email={user?.email} onClose={() => setOpen(false)} onCheck={checkVerification} />
    </EmailVerificationContext.Provider>
  );
}

function VerifyEmailDialog({ open, email, onClose, onCheck }: {
  open: boolean; email?: string; onClose: () => void; onCheck: () => Promise<boolean>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { busy, secondsLeft, resend } = useResendVerification();
  const [checking, setChecking] = useState(false);
  const inbox = inboxUrl(email);

  const confirmVerified = async () => {
    setChecking(true);
    const verified = await onCheck();
    setChecking(false);
    if (verified) { toast.success('Email đã được xác thực. Mẹ tiếp tục đặt hàng nhé!'); onClose(); }
    else toast.warning('Email chưa được xác thực', { description: 'Mẹ mở thư từ T\'Petie và bấm nút "Xác thực email", rồi quay lại đây.' });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-charcoal-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <DialogBehavior target={panelRef} onClose={onClose} />
          <motion.div
            ref={panelRef} role="alertdialog" aria-modal="true" aria-labelledby="verify-email-title" aria-describedby="verify-email-desc"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-t-3xl border border-cream-200 bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7"
          >
            <button type="button" onClick={onClose} aria-label="Đóng"
              className="absolute right-3 top-3 rounded-full p-2 text-charcoal-400 transition-colors hover:bg-cream-100 hover:text-charcoal-700">
              <X className="size-5" aria-hidden />
            </button>
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-honey-100 text-honey-600">
              <MailCheck className="size-6" aria-hidden />
            </div>
            <h2 id="verify-email-title" className="text-lg font-bold text-charcoal-900">Xác thực email để đặt hàng</h2>
            <div id="verify-email-desc" className="mt-2 space-y-2 text-sm leading-relaxed text-charcoal-600">
              <p>Shop đã gửi email xác thực tới <strong className="break-all text-charcoal-900">{email}</strong>.</p>
              <p>Mẹ mở thư và bấm <strong>&quot;Xác thực email&quot;</strong> là có thể đặt hàng ngay. Không thấy thư? Mẹ xem thêm mục Quảng cáo hoặc Thư rác.</p>
            </div>

            <div className="mt-6 space-y-2.5">
              {inbox && (
                <a href={inbox} target="_blank" rel="noopener noreferrer"
                  className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-honey-500 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-honey-600">
                  Mở hộp thư
                </a>
              )}
              <button type="button" onClick={confirmVerified} disabled={checking}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition-colors disabled:opacity-60 ${
                  inbox ? 'border border-cream-300 bg-white text-charcoal-800 hover:bg-cream-50' : 'bg-honey-500 text-white hover:bg-honey-600'}`}>
                {checking ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
                Tôi đã xác thực
              </button>
              <button type="button" onClick={() => void resend()} disabled={busy || secondsLeft > 0}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-honey-700 transition-colors hover:bg-honey-50 disabled:cursor-not-allowed disabled:text-charcoal-400 disabled:hover:bg-transparent">
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
                {busy ? 'Đang gửi…' : secondsLeft > 0 ? `Gửi lại email sau ${formatCountdown(secondsLeft)}` : 'Gửi lại email xác thực'}
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-charcoal-500">Liên kết trong email có hiệu lực 24 giờ.</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Dải nhắc xác thực đặt ở đầu trang tài khoản và trang thanh toán. */
export function EmailVerificationBanner({ className = '' }: { className?: string }) {
  const { needsVerification, openVerificationDialog } = useEmailVerification();
  if (!needsVerification) return null;
  return (
    <div role="status" className={`flex flex-col gap-3 rounded-2xl border border-honey-200 bg-honey-50 p-4 text-sm text-charcoal-800 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-honey-600" aria-hidden />
        <p><strong>Email chưa được xác thực.</strong> Mẹ xác thực email để đặt hàng và nhận thông báo đơn hàng nhé.</p>
      </div>
      <button type="button" onClick={openVerificationDialog}
        className="min-h-10 shrink-0 rounded-xl bg-honey-500 px-4 text-sm font-bold text-white transition-colors hover:bg-honey-600">
        Xác thực ngay
      </button>
    </div>
  );
}
