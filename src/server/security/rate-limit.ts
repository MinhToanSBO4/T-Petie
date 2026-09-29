import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '@/server/db/client';

export async function allowAttempt(bucket: string, max: number, minutes = 10) {
  const key = createHash('sha256').update(bucket).digest('hex');
  await prisma.rateLimitCounter.deleteMany({ where: { key, expiresAt: { lt: new Date() } } });
  const counter = await prisma.rateLimitCounter.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date(Date.now() + minutes * 60 * 1000) },
    update: { count: { increment: 1 } },
  });
  return counter.count <= max;
}
