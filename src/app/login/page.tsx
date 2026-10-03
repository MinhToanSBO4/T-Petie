'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/client/toast';
import { safeCallbackPath } from '@/lib/auth-identity';
import { landingPath } from '@/lib/admin/back-office';
import { authErrorMessage } from '@/lib/auth-errors';
import { GoogleSignInButton, useGoogleSignInEnabled } from '@/components/auth/GoogleSignInButton';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';

/** Thông báo của form đăng nhập dùng chung id: lỗi mới thay lỗi cũ, đăng nhập được thì lời chào thay lỗi còn đang hiện. */
const NOTICE_ID = 'login';

/**
 * Component xử lý logic và giao diện Form Đăng Nhập
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Chỉ quay lại trang trong website (ví dụ Đơn mua), không chuyển khách sang địa chỉ ngoài.
  const callbackUrl = safeCallbackPath(searchParams.get('callbackUrl'));

  const { login, isLoading } = useAuth();
  const googleEnabled = useGoogleSignInEnabled();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lỗi NextAuth trả về qua URL (đăng nhập Google bị từ chối, tài khoản bị khóa…) báo ngay khi mở trang.
  const urlError = authErrorMessage(searchParams.get('error'));
  useEffect(() => {
    if (urlError) toast.error(urlError, { id: NOTICE_ID });
  }, [urlError]);

  // Xử lý đăng nhập bằng Email / Mật khẩu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.warning('Vui lòng nhập email hoặc tên đăng nhập.', { id: NOTICE_ID });
      return;
    }

    if (!password) {
      toast.warning('Vui lòng nhập mật khẩu.', { id: NOTICE_ID });
      return;
    }

    setIsSubmitting(true);
    let result;
    try {
      result = await login({ email, password });
    } catch {
      setIsSubmitting(false);
      toast.error('Không kết nối được máy chủ. Vui lòng thử lại.', { id: NOTICE_ID });
      return;
    }

    if (result.success) {
      window.dispatchEvent(new Event('tpetie:navigation-start'));
      if (result.emailVerified === false) {
        toast.warning('Mẹ chưa xác thực email', {
          id: NOTICE_ID,
          description: 'Mẹ vẫn xem và thêm vào giỏ được; xác thực email để đặt hàng nhé.',
          action: { label: 'Xác thực ngay', href: '/verify-email' }, duration: 7_000,
        });
      } else {
        toast.success(`Chào mừng bạn trở lại với T'Petie! 🌸`, { id: NOTICE_ID });
      }
      router.push(landingPath(result.role, callbackUrl));
    } else {
      setIsSubmitting(false);
      const message = result.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      // Tài khoản đã liên kết Google có thể không còn mật khẩu (lib/auth-google.ts): nhắc lối đăng nhập còn lại.
      toast.error(result.reason === 'credentials' && googleEnabled
        ? `${message} Nếu từng đăng nhập bằng Google, Mẹ bấm "Đăng nhập với Google" nhé.` : message, { id: NOTICE_ID });
    }
  };


  return (
    <div className="max-w-[480px] mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="bg-white rounded-[32px] border border-cream-200 shadow-xl shadow-cream-200/50 p-6 sm:p-10 flex flex-col justify-center">
        <div className="w-full space-y-7">
          
          {/* Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 mb-1">
              Đăng nhập hoặc đăng ký (miễn phí)
            </h1>
            <p className="text-sm text-charcoal-500 font-medium">
              Chào mừng Mẹ đến với T&apos;Petie 🌸
            </p>
          </div>

          {/* Google OAuth Login: chỉ hiện khi máy chủ đã cấu hình Google. */}
          <GoogleSignInButton callbackUrl={callbackUrl || '/'} label="Đăng nhập với Google" disabled={isSubmitting}
            onStart={() => toast.dismiss(NOTICE_ID)}
            separator={<div className="relative flex items-center justify-center">
              <div className="border-t border-cream-200 w-full" />
              <span className="bg-white px-4 text-sm font-medium text-charcoal-600 absolute">
                Hoặc
              </span>
            </div>} />

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <input
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email hoặc tên đăng nhập"
                className="w-full px-5 py-4 rounded-2xl border-2 border-cream-200 focus:border-honey-500 focus:bg-honey-50/30 outline-none text-base text-charcoal-900 placeholder:text-charcoal-400 transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                className="w-full pl-5 pr-12 py-4 rounded-2xl border-2 border-cream-200 focus:border-honey-500 focus:bg-honey-50/30 outline-none text-base text-charcoal-900 placeholder:text-charcoal-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-charcoal-400 hover:text-charcoal-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-4 mt-2 rounded-2xl bg-[#A88160] hover:bg-[#8F6B4C] text-white font-bold text-base shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Bottom Links */}
          <div className="flex items-center justify-between pt-2 text-sm">
            <Link
              href="/register"
              className="font-medium text-charcoal-900 hover:text-honey-600 transition-colors"
            >
              Đăng ký tài khoản mới
            </Link>
            <a
              href="/forgot-password"
              className="font-medium text-charcoal-900 hover:text-honey-600 transition-colors underline underline-offset-4"
            >
              Quên mật khẩu?
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * Loading Fallback khi component con đang hydrate
 */
function LoginLoadingFallback() {
  return (
    <div className="max-w-[480px] mx-auto px-4 sm:px-6 py-10 sm:py-16 animate-fade-in">
      <div className="bg-white rounded-[32px] border border-cream-200 shadow-xl shadow-cream-200/50 p-6 sm:p-10 space-y-7">
        <div className="space-y-2">
          <div className="h-7 w-3/4 rounded-xl shimmer" />
          <div className="h-4 w-1/2 rounded-lg shimmer" />
        </div>
        <div className="h-14 w-full rounded-2xl shimmer" />
        <div className="h-3 w-1/4 mx-auto rounded-full shimmer" />
        <div className="space-y-4 pt-2">
          <div className="h-14 w-full rounded-2xl shimmer" />
          <div className="h-14 w-full rounded-2xl shimmer" />
          <div className="h-14 w-full rounded-2xl shimmer" />
        </div>
      </div>
    </div>
  );
}

/**
 * Component Cha bọc <Suspense> theo đúng chuẩn Next.js App Router
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
