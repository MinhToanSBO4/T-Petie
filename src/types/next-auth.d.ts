import { UserRole, UserStatus, BabyProfile } from '@/types/auth';
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      points?: number;
      babyProfile?: BabyProfile | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    role: UserRole;
    status: UserStatus;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    points?: number;
    babyProfile?: BabyProfile | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    points?: number;
    babyProfile?: BabyProfile | null;
  }
}
