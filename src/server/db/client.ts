import 'server-only';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { resolveConnectionUrl, type RuntimeKind } from '@/lib/db/connection-url';

/**
 * PrismaClient dùng chung cho toàn ứng dụng (một instance mỗi tiến trình, kể cả khi hot reload).
 * Số kết nối và thời gian chờ được chọn theo môi trường chạy, xem `resolveConnectionUrl`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isDev = process.env.NODE_ENV === 'development';

function runtimeKind(): RuntimeKind {
  if (process.env.NEXT_PHASE === 'phase-production-build') return 'build';
  return process.env.VERCEL ? 'serverless' : 'server';
}

function connectionUrl() {
  const value = process.env.CONNECTION_STRING;
  if (!value) return undefined;
  const { url, warning } = resolveConnectionUrl(value, runtimeKind());
  if (warning) console.warn(`[database] ${warning}`);
  return url;
}

const STALE_CLIENT_HINT = '\n\n[T\'Petie] Prisma Client đang cũ hơn prisma/schema.prisma (schema vừa đổi khi dev server đang chạy, '
  + 'hoặc dev server được mở bằng `next dev` thay vì `npm run dev`). Dừng dev server (Ctrl+C) rồi chạy lại `npm run dev`: '
  + 'lệnh này tự áp dụng migration và sinh lại Prisma Client.';

/** Chỉ chạy khi dev: so schema đang dùng với bản Prisma Client đã sinh, báo ngay khi khởi động nếu lệch. */
function warnIfClientIsStale() {
  try {
    const normalize = (file: string) => readFileSync(file, 'utf8').replace(/\s+/g, '');
    const root = process.cwd();
    const schema = normalize(join(root, 'prisma', 'schema.prisma'));
    const generated = normalize(join(root, 'node_modules', '.prisma', 'client', 'schema.prisma'));
    if (schema !== generated) console.error(`\n✖ ${STALE_CLIENT_HINT.trim()}\n`);
  } catch { /* không đọc được file thì bỏ qua, không chặn ứng dụng */ }
}

function createClient(): PrismaClient {
  const client = new PrismaClient({
    datasources: { db: { url: connectionUrl() } },
    log: isDev ? ['error', 'warn'] : ['error'],
    // Mặc định Prisma chỉ chờ 2 giây để mở transaction và cho transaction chạy 5 giây; pooler ở xa đôi khi chậm hơn.
    transactionOptions: { maxWait: 10_000, timeout: 15_000 },
  });
  if (!isDev) return client;
  warnIfClientIsStale();
  // Khi dev: lỗi "Unknown field/argument" gần như luôn do Prisma Client cũ, nên kèm luôn cách khắc phục vào thông báo lỗi.
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (error instanceof Prisma.PrismaClientValidationError && /Unknown (field|argument)/.test(error.message)
            && !error.message.includes(STALE_CLIENT_HINT)) {
            error.message += STALE_CLIENT_HINT;
          }
          throw error;
        }
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;

export default prisma;
