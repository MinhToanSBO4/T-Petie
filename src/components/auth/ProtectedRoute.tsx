'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/auth';
import { backOfficeHome } from '@/lib/admin/back-office';
import { Home, Lock, ShieldCheck, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { ErrorScreen, errorButtonClass } from '@/components/error/ErrorScreen';

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
      router.push(`/account?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // Tài khoản quản trị và nhân viên không dùng khu vực mua hàng của khách.
  const workspace = backOfficeHome(user?.role);
  useEffect(() => {
    if (isLoading || requiredRole !== 'user' || !workspace) return;
    router.replace(workspace);
  }, [isLoading, workspace, requiredRole, router]);

  // Đang tải phiên đăng nhập
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in" role="status" aria-label="Đang xác thực phiên đăng nhập">
        <div className="h-5 w-36 rounded-lg shimmer" />
        <div className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-8 space-y-6 shadow-card">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full shimmer" />
            <div className="space-y-2">
              <div className="h-6 w-48 rounded-xl shimmer" />
              <div className="h-4 w-64 rounded-lg shimmer" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="h-24 rounded-2xl shimmer" />
            <div className="h-24 rounded-2xl shimmer" />
            <div className="h-24 rounded-2xl shimmer" />
          </div>
        </div>
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
          href={`/account?returnUrl=${encodeURIComponent(pathname)}`}
          className="px-6 py-2.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white text-xs font-bold shadow-md transition-all active:scale-95"
        >
          Đến Trang Đăng Nhập
        </Link>
      </div>
    );
  }

  // Tài khoản quản trị/nhân viên: hiển thị trong lúc chuyển về khu làm việc.
  if (requiredRole === 'user' && workspace) {
    const area = user.role === 'admin' ? 'trang quản trị' : 'trang nhân viên';
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center space-y-3" role="status">
        <div className="w-14 h-14 rounded-3xl bg-honey-100 text-honey-700 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold font-heading text-charcoal-900">Đang chuyển về {area}</h2>
        <p className="text-xs text-charcoal-500 max-w-sm">
          Tài khoản <strong>{user.name || user.email}</strong> thuộc khu vực nội bộ nên không dùng giao diện mua hàng của khách.
        </p>
        <Link href={workspace}
          className="px-6 py-2.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white text-xs font-bold shadow-md transition-all active:scale-95">
          Vào {area}
        </Link>
      </div>
    );
  }

  // Trang yêu cầu quyền quản trị mà tài khoản không có: báo 403 cùng kiểu với các màn hình lỗi khác.
  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <ErrorScreen illustration="lock" code={403} title="Khu vực này dành riêng cho shop"
      actions={<>
        <Link href="/dashboard" className={errorButtonClass('primary')}><UserIcon className="size-4" aria-hidden />Về trang cá nhân</Link>
        <Link href="/" className={errorButtonClass('secondary')}><Home className="size-4" aria-hidden />Về trang chủ</Link>
      </>}>
      Tài khoản của mẹ chưa có quyền mở trang này. Mẹ quay về trang cá nhân hoặc tiếp tục mua sắm nhé.
    </ErrorScreen>;
  }

  // Đã xác thực và có đủ quyền
  return <>{children}</>;
}
