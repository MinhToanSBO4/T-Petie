import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { allowAttempt } from '@/lib/rate-limit';
import { parseLoginIdentifier } from '@/lib/auth-identity';
import { credentialFingerprint } from '@/lib/password-reset';
import { toBabyProfile } from '@/lib/baby-profile';
import type { UserRole, UserStatus } from '@/types/auth';

const googleProviders = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
  : [];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/dang-nhap', error: '/dang-nhap' },
  providers: [
    CredentialsProvider({
      name: 'Email hoặc tên đăng nhập và mật khẩu',
      credentials: { email: { label: 'Email hoặc tên đăng nhập', type: 'text' }, password: { label: 'Mật khẩu', type: 'password' } },
      async authorize(credentials, request) {
        const identity = parseLoginIdentifier(credentials?.email);
        const password = credentials?.password;
        if (!identity || !password) return null;
        const ip = request.headers?.['x-forwarded-for']?.split(',')[0] || 'unknown';
        if (!(await allowAttempt(`login:${ip}:${Object.values(identity)[0]}`, 10))) return null;
        const user = await prisma.user.findUnique({ where: identity });
        if (!user?.password || user.status !== 'active') return null;
        if (!(await bcrypt.compare(password, user.password))) return null;
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role as UserRole,
          status: user.status as UserStatus,
        };
      },
    }),
    ...googleProviders,
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const stored = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
      return !stored || stored.status === 'active';
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      if (!token.id) return token;
      const stored = await prisma.user.findUnique({ where: { id: token.id } });
      token.role = (stored?.role || 'user') as UserRole;
      const currentFingerprint = credentialFingerprint(stored?.password || null, process.env.NEXTAUTH_SECRET || '');
      if (user) token.credentialFingerprint = currentFingerprint;
      token.status = (stored?.status === 'active' && token.credentialFingerprint === currentFingerprint ? 'active' : 'blocked') as UserStatus;
      token.phone = stored?.phone;
      token.address = stored?.address;
      token.city = stored?.city;
      token.points = stored?.points;
      token.babyProfile = stored ? toBabyProfile(stored) : null;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.phone = token.phone;
        session.user.address = token.address;
        session.user.city = token.city;
        session.user.points = token.points;
        session.user.babyProfile = token.babyProfile;
      }
      return session;
    },
  },
};
