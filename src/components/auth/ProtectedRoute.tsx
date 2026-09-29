'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/auth';
import { ShieldAlert, ArrowLeft, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/tai-khoan?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // Đang tải phiên đăng nhập
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 p-4">
        <div className="w-12 h-12 rounded-full border-4 border-cream-200 border-t-honey-500 animate-spin" />
        <p className="text-xs sm:text-sm font-medium text-charcoal-500 font-sans">
          Đang xác thực phiên đăng nhập... 🌸
        </p>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-cream-100 text-honey-600 flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold font-heading text-charcoal-900">Yêu Cầu Đăng Nhập</h2>
        <p className="text-xs text-charcoal-500 max-w-sm">
          Mẹ vui lòng đăng nhập tài khoản để truy cập vào tính năng này nhé.
        </p>
        <Link
          href={`/tai-khoan?returnUrl=${encodeURIComponent(pathname)}`}
          className="px-6 py-2.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white text-xs font-bold shadow-md transition-all active:scale-95"
        >
          Đến Trang Đăng Nhập
        </Link>
      </div>
    );
  }

  // Nếu trang yêu cầu quyền Admin mà tài khoản hiện tại chỉ là User -> 403 Forbidden
  if (requiredRole === 'admin' && user.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-blush-100 text-blush-600 flex items-center justify-center mx-auto shadow-soft">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blush-600 bg-blush-50 px-3 py-1 rounded-full border border-blush-200 inline-block">
            Mã lỗi 403 • Truy Cập Bị Từ Chối
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-charcoal-900">
            Khu Vực Dành Riêng Cho Quản Trị Viên (Admin)
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed max-w-md mx-auto">
            Tài khoản của bạn (<strong>{user.email}</strong>) hiện đang có vai trò <strong>Khách Hàng (User)</strong> và không có quyền truy cập vào cổng quản trị này.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 text-xs text-charcoal-600 text-left space-y-1.5">
          <p className="font-bold text-charcoal-800 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-honey-600" />
            <span>Gợi ý kiểm thử quyền Admin:</span>
          </p>
          <p>• Liên hệ quản trị viên để được cấp quyền phù hợp.</p>
          <p>• Hoặc quay về Dashboard cá nhân của Mẹ.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
          >
            <span>Về Dashboard Của Mẹ</span>
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-full bg-white hover:bg-cream-100 border border-cream-300 text-charcoal-700 text-xs font-bold transition-all active:scale-95 flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Trang Chủ</span>
          </Link>
        </div>
      </div>
    );
  }

  // Đã xác thực và có đủ quyền
  return <>{children}</>;
}
