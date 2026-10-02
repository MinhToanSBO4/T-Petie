'use client';

import { useEffect, useState } from 'react';
import { getProviders, signIn } from 'next-auth/react';

/** Kết quả hỏi máy chủ một lần cho cả phiên: Google đã được cấu hình hay chưa. */
let googleEnabled: Promise<boolean> | null = null;
function isGoogleEnabled() {
  googleEnabled ??= getProviders().then((providers) => Boolean(providers?.google)).catch(() => false);
  return googleEnabled;
}

/**
 * Nút đăng nhập/đăng ký bằng Google. Chỉ hiện khi máy chủ đã bật Google (có GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET):
 * bấm khi chưa bật thì NextAuth đưa khách về lại trang đăng nhập mà không có lời giải thích nào.
 */
export function GoogleSignInButton({ callbackUrl, label, disabled, onStart, separator }: {
  callbackUrl: string; label: string; disabled?: boolean; onStart?: () => void;
  /** Hiện kèm nút (ví dụ dòng "Hoặc"), ẩn cùng nút khi Google chưa bật. */
  separator?: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    void isGoogleEnabled().then((value) => { if (alive) setEnabled(value); });
    return () => { alive = false; };
  }, []);
  // Bấm "Quay lại" từ trang Google: trình duyệt khôi phục trang cũ (bfcache) còn trạng thái đang chờ.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => { if (event.persisted) setBusy(false); };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);
  if (enabled === false) return null;

  return <>
  <button
    type="button"
    onClick={() => { setBusy(true); onStart?.(); void signIn('google', { callbackUrl }); }}
    disabled={disabled || busy || enabled === null}
    className="flex h-14 w-full flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-cream-200 font-medium text-charcoal-700 shadow-2xs transition-all duration-200 hover:border-honey-500 hover:bg-cream-50/50 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
  >
    <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
    <span className="text-sm font-semibold">{busy ? 'Đang chuyển sang Google…' : label}</span>
  </button>
  {separator}
  </>;
}
