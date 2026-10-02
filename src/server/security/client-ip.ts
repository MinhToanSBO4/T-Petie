import 'server-only';

/**
 * IP của khách theo header proxy, dùng làm khóa giới hạn tần suất.
 * Trên Vercel header này do hạ tầng ghi đè; chỉ tin cậy khi chạy sau proxy tin cậy.
 */
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}
