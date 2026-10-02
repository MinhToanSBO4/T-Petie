import 'server-only';
import type { NextAuthOptions } from 'next-auth';
import type { AdapterAccount } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/server/db/client';
import { allowAttempt } from '@/server/security/rate-limit';
import { parseLoginIdentifier } from '@/lib/auth-identity';
import { requiresEmailVerification } from '@/lib/email/tokens';
import { AUTH_NOTICE_TTL_MS, googleNoticeKind, googleSignInVerdict } from '@/lib/auth-google';
import { credentialFingerprint } from '@/server/security/password-reset';
import { linkOAuthAccount } from '@/server/auth/google-link';
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

/**
 * Kết quả gắn Google vào tài khoản khách sẵn có trong lần đăng nhập đang xử lý: ghi ở signIn(), đọc ở jwt() cùng
 * request để báo cho khách. Khóa là object `account` mà NextAuth truyền cho cả hai callback.
 */
const googleLinks = new WeakMap<object, { passwordRemoved: boolean }>();

export const authOptions: NextAuthOptions = {
  // Tài khoản mới tạo từ Google cũng được ghi nhận email đã xác minh (server/auth/google-link.ts).
  adapter: { ...PrismaAdapter(prisma), linkAccount: async (account: AdapterAccount) => { await linkOAuthAccount(account); } },
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
        if (user.deletedAt) return null;
        // Khách chưa xác thực email vẫn đăng nhập được để xem tài khoản và gửi lại thư; chỉ đặt hàng mới bị chặn
        // (api/checkout). Chặn ngay ở đây khiến khách mới đăng ký bị "khóa ngoài" và không hiểu vì sao.
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
      const stored = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() }, select: { id: true, role: true, status: true },
      });
      if (account?.provider !== 'google') return !stored || stored.status === 'active';
      // Chỉ nhận email Google đã được Google xác minh: email chưa xác minh có thể là của người khác.
      const verdict = googleSignInVerdict({
        emailVerified: (profile as { email_verified?: unknown } | undefined)?.email_verified, stored, userId: user.id,
      });
      if (verdict === 'deny') return false;
      if (verdict === 'staff-password-only') return '/login?error=GoogleStaffAccount';
      if (verdict === 'link' && stored) {
        // Khách đã đăng ký bằng email + mật khẩu: gắn Google vào tài khoản đó ngay sau các bước kiểm tra trên, NextAuth
        // tìm thấy tài khoản qua liên kết vừa tạo thay vì báo OAuthAccountNotLinked. Không bật cơ chế tự gắn theo email
        // của NextAuth: cơ chế đó không phân biệt khách với admin/nhân viên (tests/security.test.mjs).
        try {
          googleLinks.set(account, await linkOAuthAccount({ ...account, type: 'oauth', userId: stored.id }));
        } catch (error) {
          // P2002: một lần đăng nhập khác cùng lúc vừa gắn xong, đi tiếp như tài khoản đã liên kết.
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
            console.error('Google account link failed:', error instanceof Error ? error.message.split('\n')[0] : error);
            return '/login?error=Callback';
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account, isNewUser, trigger }) {
      if (user) token.id = user.id;
      if (!token.id) return token;
      let stored: Awaited<ReturnType<typeof readUserSnapshot>>;
      try {
        // `update()` từ trình duyệt (ví dụ sau khi xác thực email ở tab khác) đọc lại database, không dùng bản đệm.
        stored = await readUserSnapshot(token.id, { fresh: Boolean(user) || trigger === 'update' });
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
      token.emailVerified = stored ? !requiresEmailVerification(stored) : true;
      token.babyProfile = stored ? toBabyProfile(stored) : null;
      if (user && account?.provider === 'google') {
        const link = googleLinks.get(account);
        token.notice = {
          kind: googleNoticeKind({ linked: Boolean(link), passwordRemoved: Boolean(link?.passwordRemoved), isNewUser }),
          at: Date.now(),
        };
      } else if (token.notice && Date.now() - token.notice.at > AUTH_NOTICE_TTL_MS) {
        delete token.notice;
      }
      return token;
    },
    async session({ session, token }) {
      // Thông báo một lần sau khi quay về từ Google (đăng nhập, tạo tài khoản, liên kết); AuthNotice hiện thành toast.
      if (token.notice) session.notice = token.notice;
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.phone = token.phone;
        session.user.address = token.address;
        session.user.city = token.city;
        session.user.points = token.points;
        session.user.emailVerified = token.emailVerified !== false;
        session.user.babyProfile = token.babyProfile;
      }
      return session;
    },
  },
};
