import 'server-only';
import { timingSafeEqual } from 'node:crypto';

/** Vercel Cron và bộ hẹn giờ ngoài (GitHub Actions) gửi `Authorization: Bearer <CRON_SECRET>`. */
export function cronAuthorized(request: Request) {
  // Bỏ khoảng trắng/xuống dòng thừa khi dán giá trị vào Vercel hoặc GitHub.
  const secret = process.env.CRON_SECRET?.trim();
  const header = (request.headers.get('authorization') || '').trim();
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
