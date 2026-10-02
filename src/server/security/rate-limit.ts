import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '@/server/db/client';
import { table } from '@/server/db/sql';

/**
 * Đếm số lần thử của một "bucket" (ví dụ đăng nhập theo IP + tài khoản) trong cửa sổ `minutes` phút.
 * Một câu lệnh duy nhất: tạo bộ đếm mới, tăng bộ đếm còn hạn, hoặc bắt đầu lại bộ đếm đã hết hạn — không có khoảng
 * hở giữa hai lệnh khi nhiều request cùng lúc. Bộ đếm hết hạn của bucket khác được cron bảo trì dọn mỗi ngày.
 * Trả về số giây còn lại của cửa sổ để giao diện hiện đồng hồ đếm ngược khi bị chặn.
 */
export async function takeAttempt(bucket: string, max: number, minutes = 10) {
  const key = createHash('sha256').update(bucket).digest('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO ${table('rate_limit_counters')} AS counter ("key", "count", "expiresAt")
    VALUES (${key}, 1, ${expiresAt}::timestamp)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN counter."expiresAt" < ${now.toISOString()}::timestamp THEN 1 ELSE counter."count" + 1 END,
      "expiresAt" = CASE WHEN counter."expiresAt" < ${now.toISOString()}::timestamp THEN EXCLUDED."expiresAt" ELSE counter."expiresAt" END
    RETURNING "count", "expiresAt"`;
  const row = rows[0];
  const windowEnd = row?.expiresAt ? new Date(row.expiresAt).getTime() : now.getTime() + minutes * 60_000;
  return {
    allowed: Number(row?.count ?? 0) <= max,
    retryAfter: Math.max(1, Math.ceil((windowEnd - now.getTime()) / 1000)),
  };
}

export async function allowAttempt(bucket: string, max: number, minutes = 10) {
  return (await takeAttempt(bucket, max, minutes)).allowed;
}
