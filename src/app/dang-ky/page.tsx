'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Gift
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của Mẹ.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ Email.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Email không hợp lệ. Vui lòng nhập đúng định dạng (VD: mebe@gmail.com).');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng tạo mật khẩu cho tài khoản.');
      return;
    }
    if (password.length < 12) {
      setErrorMessage('Mật khẩu phải có ít nhất 12 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của T\'Petie.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({ name, email, password, phone });
    setIsSubmitting(false);

    if (result.success) {
      showToast('🎉 Đăng ký thành công! Chào mừng Mẹ đến với T\'Petie.');
      router.push('/');
    } else {
      setErrorMessage(result.error || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <div className="bg-white rounded-3xl border border-cream-200 shadow-card overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* LEFT COLUMN: BENEFIT BANNER */}
        <div className="lg:col-span-5 bg-gradient-to-br from-cream-100 via-blush-50 to-sage-50 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <Link href="/" className="inline-block">
              <img
                src="/images/logo.png"
                alt="T'Petie Logo"
                className="h-11 w-auto object-contain hover:scale-105 transition-transform"
              />
            </Link>

            <div className="pt-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sage-700 bg-white/80 px-2.5 py-1 rounded-full border border-sage-200 inline-block">
                Đặc Quyền Thành Viên Mới
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif italic text-charcoal-900 leading-tight">
                Gia nhập gia đình T&apos;Petie ngay hôm nay!
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed font-sans">
                Đăng ký tài khoản để nhận ngay ưu đãi chào mừng và lưu thông tin size của bé để mua sắm nhanh hơn.
              </p>
            </div>

            {/* Privilege list */}
            <div className="pt-4 space-y-2.5 text-xs text-charcoal-700">
              <div className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-cream-200">
                <Gift className="w-4 h-4 text-honey-600 shrink-0" />
                <span><strong>Tặng 100 điểm</strong> tích lũy ngay khi tạo tài khoản</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-cream-200">
                <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                <span>Gợi ý size đồ tự động theo cân nặng & chiều cao bé</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-cream-200">
                <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                <span>Tra cứu lịch trình và thông báo đơn hàng thời gian thực</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-cream-200 text-xs text-charcoal-500">
            <span>🌿 100% Bảo mật thông tin cá nhân của mẹ &amp; bé</span>
          </div>
        </div>

        {/* RIGHT COLUMN: REGISTER FORM */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-5">
            
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-charcoal-900">
                Đăng Ký Thành Viên
              </h1>
              <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
                Tạo tài khoản để nhận những trải nghiệm mua sắm trọn vẹn nhất
              </p>
            </div>

            {/* Error Alert Box */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-blush-50 border border-blush-200 text-blush-700 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Google Signup */}
            <button
              type="button"
              disabled
              className="w-full py-2.5 px-4 rounded-2xl border border-cream-300 bg-cream-50/50 text-charcoal-800 text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2.5 opacity-50 cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google · Sắp ra mắt</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-cream-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-medium text-charcoal-400 uppercase tracking-wider">
                hoặc điền thông tin
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Họ tên */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-charcoal-800">Họ và tên của Mẹ</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mẹ Thu Trang"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm text-charcoal-900 placeholder:text-charcoal-400"
                  />
                </div>
              </div>

              {/* Email & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-charcoal-800">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="mebe@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs text-charcoal-900 placeholder:text-charcoal-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-charcoal-800">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0988 123 456"
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs text-charcoal-900 placeholder:text-charcoal-400"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-charcoal-800">Mật khẩu</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm text-charcoal-900 placeholder:text-charcoal-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-charcoal-800">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-cream-300 focus:border-honey-500 focus:ring-2 focus:ring-honey-100 outline-none text-xs sm:text-sm text-charcoal-900 placeholder:text-charcoal-400"
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="rounded text-honey-500 focus:ring-honey-400 w-4 h-4 mt-0.5 accent-honey-500 cursor-pointer"
                />
                <label htmlFor="terms" className="text-[11px] text-charcoal-600 cursor-pointer select-none leading-snug">
                  Tôi đồng ý với <a href="/chinh-sach-bao-mat" className="text-honey-600 underline">Chính sách bảo mật</a> và Điều khoản mua hàng của T&apos;Petie.
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full py-3.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Đang đăng ký tài khoản...</span>
                ) : (
                  <>
                    <span>Tạo Tài Khoản Thành Viên</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-charcoal-500 pt-1">
              Mẹ đã có tài khoản?{' '}
              <Link href="/dang-nhap" className="font-bold text-honey-600 hover:text-honey-700 underline">
                Đăng nhập ngay
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}
