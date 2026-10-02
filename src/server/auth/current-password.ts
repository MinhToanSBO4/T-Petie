import 'server-only';
import * as bcrypt from 'bcryptjs';
import { allowAttempt } from '@/server/security/rate-limit';

/**
 * Xác nhận lại mật khẩu trước thao tác nhạy cảm (đổi email đăng nhập, đổi mật khẩu). Giới hạn số lần thử theo tài khoản
 * để người cầm được phiên đăng nhập bị lộ không dò được mật khẩu.
 */
export async function checkCurrentPassword(userId: string, hash: string | null | undefined, attempt: unknown) {
  if (!(await allowAttempt(`reauth:${userId}`, 8))) {
    return { ok: false, status: 429, error: 'Nhập sai quá nhiều lần, vui lòng thử lại sau 10 phút' } as const;
  }
  if (typeof attempt !== 'string' || !attempt || attempt.length > 128 || !hash || !(await bcrypt.compare(attempt, hash))) {
    return { ok: false, status: 400, error: 'Mật khẩu hiện tại không đúng' } as const;
  }
  return { ok: true } as const;
}
