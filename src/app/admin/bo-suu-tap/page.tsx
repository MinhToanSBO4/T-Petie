import { redirect } from 'next/navigation';
import { CollectionManager } from '@/components/admin/CollectionManager';
import { getStaffSession } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export default async function AdminCollectionsPage() {
  if (!(await getStaffSession())) redirect('/dang-nhap?callbackUrl=/admin/bo-suu-tap');
  const rows = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const collections = rows.map(({ _count, ...row }) => ({
    id: row.id, slug: row.slug, title: row.title, subtitle: row.subtitle, story: row.story,
    bannerUrl: row.bannerUrl, lookbookUrls: row.lookbookUrls, themeColor: row.themeColor,
    accentColor: row.accentColor, season: row.season, badge: row.badge, sortOrder: row.sortOrder,
    isActive: row.isActive, showInMenu: row.showInMenu, showOnHome: row.showOnHome,
    productCount: _count.products,
  }));
  return <CollectionManager initialCollections={collections} />;
}
