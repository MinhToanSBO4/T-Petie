import 'server-only';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/server/db/client';
import { allowAttempt } from '@/server/security/rate-limit';
import { parseLoginIdentifier } from '@/lib/auth-identity';
import { credentialFingerprint } from '@/server/security/password-reset';
import { readUserSnapshot } from '@/server/auth/user-snapshot';
import { toBabyProfile } from '@/lib/baby-profile';
import type { UserRole, UserStatus } from '@/types/auth';

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

/** Mã băm bcrypt (cost 12) của một chuỗi ngẫu nhiên, chỉ để so khi tài khoản không tồn tại. */
const DUMMY_HASH = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8.6oPq7e1ylXGQ0ZrZz0nYbV7m1nJ2';

const googleProviders = googleClientId && googleClientSecret
  ? [GoogleProvider({ clientId: googleClientId, clientSecret: googleClientSecret })]
  : [];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login', error: '/login' },
  events: {
    // Đăng nhập mật khẩu đã ghi trong authorize(); đăng nhập Google ghi ở đây để cột "Đăng nhập gần nhất" đúng cho mọi khách.
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user.id) return;
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Email hoặc tên đăng nhập và mật khẩu',
      credentials: { email: { label: 'Email hoặc tên đăng nhập', type: 'text' }, password: { label: 'Mật khẩu', type: 'password' } },
      async authorize(credentials, request) {
        const identity = parseLoginIdentifier(credentials?.email);
        const password = credentials?.password;
        if (!identity || !password) return null;
        if (password.length > 128) return null;
        const ip = request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
        // Hai giới hạn: 10 lần/tài khoản/IP (gõ nhầm mật khẩu) và 30 lần/IP cho mọi tài khoản (dò mật khẩu hàng loạt).
        const [perAccount, perIp] = await Promise.all([
          allowAttempt(`login:${ip}:${Object.values(identity)[0]}`, 10), allowAttempt(`login-ip:${ip}`, 30),
        ]);
        if (!perAccount || !perIp) return null;
        const user = await prisma.user.findUnique({ where: identity });
        // Luôn chạy bcrypt (với mã băm giả khi không có tài khoản) để thời gian phản hồi không lộ email nào đã đăng ký.
        const valid = await bcrypt.compare(password, user?.password || DUMMY_HASH);
        if (!user?.password || user.status !== 'active' || !valid) return null;
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
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      // Chỉ nhận email Google đã được Google xác minh: email chưa xác minh có thể là của người khác.
      if (account?.provider === 'google' && (profile as { email_verified?: boolean } | undefined)?.email_verified !== true) return false;
      const stored = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
      return !stored || stored.status === 'active';
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      if (!token.id) return token;
      let stored: Awaited<ReturnType<typeof readUserSnapshot>>;
      try {
        stored = await readUserSnapshot(token.id, { fresh: Boolean(user) });
      } catch (error) {
        // Database tạm thời không phản hồi (mất mạng, hết kết nối): giữ quyền đã xác minh ở lần trước. Nếu ném lỗi,
        // NextAuth xóa cookie phiên và người dùng bị đăng xuất, còn API trả "Không có quyền" dù tài khoản hợp lệ.
        if (token.role && token.status) {
          console.warn('Session refresh skipped, database unavailable:', error instanceof Error ? error.message.split('\n')[0] : error);
          return token;
        }
        throw error;
      }
      token.role = (stored?.role || 'user') as UserRole;
      const currentFingerprint = credentialFingerprint(stored?.password || null, process.env.NEXTAUTH_SECRET || '');
      if (user) token.credentialFingerprint = currentFingerprint;
      token.status = (stored?.status === 'active' && token.credentialFingerprint === currentFingerprint ? 'active' : 'blocked') as UserStatus;
      // Họ tên/email sửa ở trang tài khoản hiện ngay, không phải chờ đăng nhập lại.
      if (stored) { token.name = stored.name; token.email = stored.email; }
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
