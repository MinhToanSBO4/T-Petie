import 'server-only';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient Singleton cho Next.js App Router
 * Tránh việc khởi tạo quá nhiều database connections trong môi trường development (Hot Reloading).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function pooledConnectionUrl() {
  const value = process.env.CONNECTION_STRING;
  if (!value) return undefined;
  const url = new URL(value);
  if (!url.searchParams.has('connection_limit')) {
    // Lúc build, Next dựng nhiều trang song song và mỗi trang chạy vài truy vấn cùng lúc,
    // nên cần nhiều kết nối hơn. Runtime serverless vẫn giữ một kết nối cho mỗi tiến trình.
    const building = process.env.NEXT_PHASE === 'phase-production-build';
    url.searchParams.set('connection_limit', building ? '5' : '1');
    if (building && !url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '30');
  }
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: pooledConnectionUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
