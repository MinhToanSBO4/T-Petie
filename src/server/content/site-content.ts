import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db/client';
import { parseHomeFeatures, parseSizeGuide } from '@/lib/content/site-content';
import type { HomeFeature, SizeGuide } from '@/lib/content/site-content';

export const getHomeFeatures = unstable_cache(async (): Promise<HomeFeature[]> => {
  const row = await prisma.siteContent.findUnique({ where: { key: 'home_features' }, select: { data: true } });
  return row ? parseHomeFeatures(row.data) : [];
}, ['home-features'], { revalidate: 300, tags: ['site-content'] });

export const getSizeGuide = unstable_cache(async (): Promise<SizeGuide | null> => {
  const row = await prisma.siteContent.findUnique({ where: { key: 'size_guide' }, select: { data: true } });
  return row ? parseSizeGuide(row.data) : null;
}, ['size-guide'], { revalidate: 300, tags: ['site-content'] });
