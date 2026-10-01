'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { safeCallbackPath } from '@/lib/auth-identity';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

/**
 * Component xử lý logic và giao diện Form Đăng Nhập
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Chỉ quay lại trang trong website (ví dụ Đơn mua), không chuyển khách sang địa chỉ ngoài.
  const callbackUrl = safeCallbackPath(searchParams.get('callbackUrl'));

  const { login, isLoading } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xử lý đăng nhập bằng Email / Mật khẩu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập email hoặc tên đăng nhập.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    let result;
    try {
      result = await login({ email, password });
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Không kết nối được máy chủ. Vui lòng thử lại.');
      return;
    }

    if (result.success) {
      window.dispatchEvent(new Event('tpetie:navigation-start'));
      showToast(`Chào mừng bạn trở lại với T'Petie! 🌸`);
      if (result.role === 'admin') {
        router.push(callbackUrl || '/admin');
      } else if (result.role === 'staff') {
        router.push(callbackUrl || '/admin/products');
      } else {
        router.push(callbackUrl || '/');
      }
    } else {
      setIsSubmitting(false);
      setErrorMessage(result.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  // Xử lý đăng nhập bằng Google
  const handleGoogleLogin = () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    signIn('google', { callbackUrl: callbackUrl || '/' });
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

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-blush-50 border border-blush-200 text-blush-700 text-sm flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Google OAuth Login */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-2xl border-2 border-cream-200 hover:border-honey-500 hover:bg-cream-50/50 active:scale-[0.99] flex items-center justify-center gap-3 transition-all duration-200 shadow-2xs cursor-pointer font-medium text-charcoal-700"
              aria-label="Đăng nhập bằng tài khoản Google"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="text-sm font-semibold">Đăng nhập với Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-cream-200 w-full" />
            <span className="bg-white px-4 text-sm font-medium text-charcoal-600 absolute">
              Hoặc
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <input
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Email hoặc tên đăng nhập"
                className="w-full px-5 py-4 rounded-2xl border-2 border-cream-200 focus:border-honey-500 focus:bg-honey-50/30 outline-none text-base text-charcoal-900 placeholder:text-charcoal-400 transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
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
            <button
              type="button"
              onClick={() => setErrorMessage('Khôi phục mật khẩu qua email chưa được triển khai. Vui lòng liên hệ quản trị viên để được hỗ trợ.')}
              className="font-medium text-charcoal-900 hover:text-honey-600 transition-colors underline underline-offset-4"
            >
              Quên mật khẩu?
            </button>
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
