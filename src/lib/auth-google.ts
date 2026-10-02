/**
 * Quy tắc đăng nhập Google, viết thuần để kiểm thử (tests/auth-google.test.mjs).
 *
 * Trước đây khách đã đăng ký bằng email + mật khẩu bấm "Đăng nhập với Google" (cùng email) chỉ nhận lỗi
 * OAuthAccountNotLinked. Giờ tài khoản Google được gắn thẳng vào tài khoản khách sẵn có, vì Google chỉ trả email đã
 * xác minh là của người đang đăng nhập. Đổi lại, mật khẩu của tài khoản chưa từng xác minh email bị gỡ khi liên kết:
 * form đăng ký không kiểm tra email, nên mật khẩu đó có thể do người khác đặt sẵn bằng email của khách để chờ khách
 * đăng nhập Google rồi dùng chung tài khoản (account pre-hijacking).
 */

export type GoogleSignInVerdict = 'allow' | 'link' | 'deny' | 'staff-password-only';

type StoredAccount = { id: string; role: string; status: string };

/**
 * Quyết định cho một lần đăng nhập Google.
 * - `userId`: id NextAuth đưa vào callback signIn: id tài khoản khi Google đã được liên kết, ngược lại là id Google.
 * - `stored`: tài khoản trong DB có cùng email.
 */
export function googleSignInVerdict({ emailVerified, stored, userId }: {
  emailVerified: unknown; stored: StoredAccount | null; userId: string;
}): GoogleSignInVerdict {
  if (emailVerified !== true) return 'deny';
  if (!stored) return 'allow';
  if (stored.status !== 'active') return 'deny';
  if (stored.id === userId) return 'allow';
  // Tài khoản admin/nhân viên do admin tạo, email chưa ai xác minh (gõ nhầm một ký tự là trao quyền cho chủ email đó):
  // không tự liên kết, vẫn đăng nhập bằng mật khẩu.
  return stored.role === 'user' ? 'link' : 'staff-password-only';
}

/**
 * Email đã được Google xác minh, đọc từ ID token của lần đăng nhập. Token này NextAuth (openid-client) vừa kiểm tra
 * chữ ký, issuer, audience và hạn dùng trong cùng request nên chỉ cần giải mã phần payload.
 */
export function verifiedEmailFromIdToken(idToken: unknown): string | null {
  if (typeof idToken !== 'string') return null;
  const payload = idToken.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))));
    return claims?.email_verified === true && typeof claims.email === 'string' && claims.email
      ? claims.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Thay đổi cần ghi vào tài khoản vừa được gắn Google; null khi không có gì đổi hoặc email Google khác email tài khoản. */
export function googleLinkUpdate(
  user: { email: string | null; emailVerified: Date | null; password: string | null },
  verifiedEmail: string | null,
  now: Date,
): { emailVerified: Date; password?: null } | null {
  // Liên kết khi đang đăng nhập sẵn một tài khoản khác email: Google không chứng minh gì về email của tài khoản đó.
  if (!verifiedEmail || !user.email || user.email.trim().toLowerCase() !== verifiedEmail) return null;
  if (user.emailVerified) return null;
  return { emailVerified: now, ...(user.password ? { password: null } : {}) };
}

export type AuthNoticeKind = 'google-signed-in' | 'google-signed-up' | 'google-linked' | 'google-linked-password-removed';
export type AuthNotice = { kind: AuthNoticeKind; at: number };

/** Thông báo sau đăng nhập Google chỉ giữ trong phiên chừng này, đủ cho lần chuyển trang về từ Google. */
export const AUTH_NOTICE_TTL_MS = 2 * 60_000;

export function googleNoticeKind({ linked, passwordRemoved, isNewUser }: {
  linked: boolean; passwordRemoved: boolean; isNewUser: boolean | undefined;
}): AuthNoticeKind {
  if (passwordRemoved) return 'google-linked-password-removed';
  if (linked) return 'google-linked';
  return isNewUser ? 'google-signed-up' : 'google-signed-in';
}
