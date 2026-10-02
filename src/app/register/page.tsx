'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { normalizePhone } from '@/lib/account/account-input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { BrandLogo } from '@/components/layout/BrandLogo';
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
    // Số điện thoại không bắt buộc; nhập thì chấp nhận cả "0988 123 456" hay "+84 988 123 456".
    if (phone.trim() && !normalizePhone(phone)) {
      setErrorMessage('Số điện thoại gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09 (có thể bỏ trống).');
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
    const result = await register({ name, email, password, phone: phone.trim() ? normalizePhone(phone) ?? phone : undefined });
    setIsSubmitting(false);

    if (result.success) {
      showToast(result.emailSent ? 'Tài khoản đã tạo. Vui lòng kiểm tra email xác thực.' : 'Tài khoản đã tạo. Chưa gửi được email, Mẹ chọn gửi lại nhé.');
      window.location.assign(`/verify-email?email=${encodeURIComponent(email.trim())}&sent=${result.emailSent ? '1' : '0'}`);
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
              <BrandLogo className="h-11 w-auto object-contain hover:scale-105 transition-transform" />
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
                <span>Lưu hồ sơ bé và <strong>gợi ý size tự động</strong> cho từng đơn</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-cream-200">
                <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                <span>Gợi ý size đồ tự động theo cân nặng & chiều cao bé</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-cream-200">
                <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                <span>Theo dõi trạng thái đơn hàng trong trang tài khoản</span>
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

            {/* Google Signup: chỉ hiện khi máy chủ đã cấu hình Google. */}
            <GoogleSignInButton callbackUrl="/" label="Đăng ký nhanh với Google"
              onStart={() => setErrorMessage(null)}
              separator={<div className="relative flex items-center justify-center">
                <div className="border-t border-cream-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-medium text-charcoal-400 uppercase tracking-wider">
                  hoặc điền thông tin
                </span>
              </div>} />

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
                  Tôi đồng ý với <a href="/privacy-policy" className="text-honey-600 underline">Chính sách bảo mật</a> và Điều khoản mua hàng của T&apos;Petie.
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
              <Link href="/login" className="font-bold text-honey-600 hover:text-honey-700 underline">
                Đăng nhập ngay
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}
