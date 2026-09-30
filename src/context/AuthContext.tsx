'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSession, signIn, signOut, useSession } from 'next-auth/react';
import { AuthCredentials, BabyProfile, RegisterData, User, UserRole, UserStatus } from '@/types/auth';
import { trackLogin, trackLogout } from '@/client/analytics/tracker';

type Result = { success: boolean; error?: string; role?: UserRole };
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<Result>;
  loginWithGoogle: () => Promise<Result>;
  register: (data: RegisterData) => Promise<Result>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<Result>;
  updateBabyProfile: (baby: BabyProfile) => Promise<Result>;
  getAllUsers: () => User[];
  fetchAdminUsers: () => Promise<User[]>;
  updateUserRole: (userId: string, role: UserRole) => Promise<Result>;
  toggleUserStatus: (userId: string) => Promise<Result>;
  deleteUser: (userId: string) => Promise<Result>;
  addUser: (data: Omit<User, 'id' | 'createdAt'>) => Promise<Result>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
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

  const fetchAdminUsers = useCallback(async () => {
    // API quản trị trả danh sách phân trang dạng { items, total, page, pages }.
    const response = await fetch('/api/admin/users?limit=50', { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    const users = Array.isArray(data.items) ? data.items as User[] : [];
    setAdminUsers(users);
    return users;
  }, []);

  useEffect(() => {
    if (user?.role === 'admin' && user.status === 'active') void fetchAdminUsers();
  }, [user?.role, user?.status, fetchAdminUsers]);

  const login = async (credentials: AuthCredentials): Promise<Result> => {
    const result = await signIn('credentials', {
      redirect: false,
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    if (!result || result.error) return { success: false, error: 'Tên đăng nhập, email hoặc mật khẩu không đúng.' };
    const fresh = await getSession();
    if (!fresh?.user || fresh.user.status !== 'active') return { success: false, error: 'Không thể xác thực tài khoản.' };
    trackLogin('password', fresh.user.email || '');
    return { success: true, role: fresh.user.role };
  };

  const loginWithGoogle = async (): Promise<Result> => {
    try {
      const providersRes = await fetch('/api/auth/providers');
      if (providersRes.ok) {
        const providers = await providersRes.json();
        if (!providers?.google) {
          return {
            success: false,
            error: 'Google OAuth chưa được kích hoạt: Thiếu GOOGLE_CLIENT_SECRET trong file .env trên máy chủ.',
          };
        }
      }
      const result = await signIn('google', { callbackUrl: '/' });
      if (result?.error) {
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Không thể kết nối với dịch vụ đăng nhập Google.' };
    }
  };

  const register = async (data: RegisterData): Promise<Result> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await response.json();
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
    const response = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const json = await response.json();
      return { success: false, error: json.error || 'Không thể lưu thông tin.' };
    }
    await updateSession();
    return { success: true };
  };

  const changeUser = async (userId: string, body: object): Promise<Result> => {
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (response.ok) { await fetchAdminUsers(); return { success: true }; }
    const json = await response.json();
    return { success: false, error: json.error || 'Không thể cập nhật tài khoản.' };
  };

  const toggleUserStatus = async (userId: string): Promise<Result> => {
    const target = adminUsers.find((entry) => entry.id === userId);
    if (!target) return { success: false, error: 'Không tìm thấy tài khoản.' };
    const status: UserStatus = target.status === 'active' ? 'blocked' : 'active';
    return changeUser(userId, { status });
  };

  const deleteUser = async (userId: string): Promise<Result> => {
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    if (response.ok) { await fetchAdminUsers(); return { success: true }; }
    const json = await response.json();
    return { success: false, error: json.error || 'Không thể xóa tài khoản.' };
  };

  const addUser = async (data: Omit<User, 'id' | 'createdAt'>): Promise<Result> => {
    const response = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (response.ok) { await fetchAdminUsers(); return { success: true }; }
    const json = await response.json();
    return { success: false, error: json.error || 'Không thể tạo tài khoản.' };
  };

  return <AuthContext.Provider value={{
    user,
    isAuthenticated: status === 'authenticated' && user?.status === 'active',
    isLoading: status === 'loading',
    login, loginWithGoogle, register, logout, updateProfile,
    updateBabyProfile: (baby) => updateProfile({ babyProfile: baby }),
    getAllUsers: () => adminUsers,
    fetchAdminUsers,
    updateUserRole: (id, role) => changeUser(id, { role }),
    toggleUserStatus, deleteUser, addUser,
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
