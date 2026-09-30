import 'server-only';

/**
 * Kiểm tra yêu cầu ghi đến từ chính website (lớp phòng thủ bổ sung cho CSRF).
 * NextAuth dùng cookie SameSite=Lax nên đây là lớp thứ hai, không phải lớp duy nhất.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
