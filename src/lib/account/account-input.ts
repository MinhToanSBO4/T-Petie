/** Số di động Việt Nam 10 chữ số, cùng quy tắc với form đặt hàng. */
const MOBILE = /^0[35789]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Một chính sách mật khẩu cho mọi tài khoản: khách, nhân viên, quản trị viên. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export type AccountProfileInput = { name: string; email: string; phone: string | null };

/** "+84 912 345 678", "0912.345.678" → "0912345678"; null nếu không phải số di động Việt Nam. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s.()-]/g, '').replace(/^\+?84(?=[35789]\d{8}$)/, '0');
  return MOBILE.test(digits) ? digits : null;
}

/** Hồ sơ tài khoản quản trị/nhân viên tự sửa. Email bắt buộc vì dùng để đăng nhập; số điện thoại để trống được. */
export function parseAccountProfile(raw: unknown): AccountProfileInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Dữ liệu không hợp lệ');
  const { name, email, phone } = raw as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) throw new Error('Họ tên cần 2–100 ký tự');
  if (typeof email !== 'string' || email.trim().length > 254 || !EMAIL.test(email.trim())) throw new Error('Email không hợp lệ');
  if (phone !== undefined && phone !== null && typeof phone !== 'string') throw new Error('Số điện thoại không hợp lệ');
  const cleanPhone = typeof phone === 'string' && phone.trim() ? normalizePhone(phone) : null;
  if (typeof phone === 'string' && phone.trim() && !cleanPhone) {
    throw new Error('Số điện thoại gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09');
  }
  return { name: name.trim().replace(/\s+/g, ' '), email: email.trim().toLowerCase(), phone: cleanPhone };
}

/** Lý do mật khẩu chưa đạt chính sách (độ dài), hoặc null. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự`;
  if (password.length > PASSWORD_MAX) return `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`;
  return null;
}

/** Lý do mật khẩu mới chưa dùng được, hoặc null. */
export function newPasswordProblem(password: unknown, current?: unknown): string | null {
  const problem = passwordProblem(password);
  if (problem) return problem;
  if (password === current) return 'Mật khẩu mới phải khác mật khẩu hiện tại';
  return null;
}
