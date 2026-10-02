'use client';

import React, { createContext, useContext } from 'react';
import { getSession, signIn, signOut, useSession } from 'next-auth/react';
import { AuthCredentials, BabyProfile, RegisterData, User, UserRole } from '@/types/auth';
import { trackLogin, trackLogout } from '@/client/analytics/tracker';

type Result = { success: boolean; error?: string; role?: UserRole };
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<Result>;
  register: (data: RegisterData) => Promise<Result>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<Result>;
  updateBabyProfile: (baby: BabyProfile) => Promise<Result>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Phiên đăng nhập của khách trong trình duyệt. Đăng nhập Google dùng `GoogleSignInButton`; quản lý tài khoản ở trang quản trị. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const user: User | null = session?.user ? {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || 'Thành viên',
    role: session.user.role,
    status: session.user.status,
    avatar: session.user.image || undefined,
    phone: session.user.phone || undefined,
    address: session.user.address || undefined,
    city: session.user.city || undefined,
    points: session.user.points,
    babyProfile: session.user.babyProfile || undefined,
    createdAt: '',
  } : null;

  const login = async (credentials: AuthCredentials): Promise<Result> => {
    const result = await signIn('credentials', {
      redirect: false,
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    if (!result || result.error) return { success: false, error: 'Tên đăng nhập, email hoặc mật khẩu không đúng.' };
    const fresh = await getSession();
    if (!fresh?.user || fresh.user.status !== 'active') return { success: false, error: 'Không thể xác thực tài khoản.' };
    // Mã tài khoản nội bộ, không gửi email: điều khoản Google Analytics cấm gửi thông tin nhận dạng cá nhân.
    trackLogin('password', fresh.user.id);
    return { success: true, role: fresh.user.role };
  };

  const register = async (data: RegisterData): Promise<Result> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) return { success: false, error: json.error || 'Đăng ký không thành công.' };
      return login({ email: data.email, password: data.password });
    } catch {
      return { success: false, error: 'Không kết nối được máy chủ.' };
    }
  };

  const logout = () => {
    trackLogout();
    void signOut({ callbackUrl: '/' });
  };

  const updateProfile = async (data: Partial<User>): Promise<Result> => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        return { success: false, error: json.error || 'Không thể lưu thông tin.' };
      }
      await updateSession();
      return { success: true };
    } catch {
      return { success: false, error: 'Không kết nối được máy chủ.' };
    }
  };

  return <AuthContext.Provider value={{
    user,
    isAuthenticated: status === 'authenticated' && user?.status === 'active',
    isLoading: status === 'loading',
    login, register, logout, updateProfile,
    updateBabyProfile: (baby) => updateProfile({ babyProfile: baby }),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
