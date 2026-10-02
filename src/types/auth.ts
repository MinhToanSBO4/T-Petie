/**
 * Type definitions cho Authentication & Authorization T'Petie
 */

export type UserRole = 'admin' | 'staff' | 'user';

export type UserStatus = 'active' | 'blocked';

export interface BabyProfile {
  name: string;
  birthDate?: string;
  gender?: 'girl';
  weight: number;      // kg
  height: number;      // cm
  recommendedSize: string; // VD: "Size 2 (10 - 12kg)"
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  points?: number;
  babyProfile?: BabyProfile;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
