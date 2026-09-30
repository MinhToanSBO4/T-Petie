import { redirect } from 'next/navigation';
import { SiteContentManager } from '@/components/admin/SiteContentManager';
import { getStaffSession } from '@/server/auth/staff-session';
import { prisma } from '@/server/db/client';
import { SITE_CONTENT_KEYS } from '@/lib/content/site-content';

export const dynamic = 'force-dynamic';

export default async function AdminSiteContentPage() {
  if (!(await getStaffSession())) redirect('/login?callbackUrl=/admin/content');
  const rows = await prisma.siteContent.findMany({ where: { key: { in: [...SITE_CONTENT_KEYS] } } });
  const content: Record<string, unknown> = {};
  for (const key of SITE_CONTENT_KEYS) content[key] = rows.find((row) => row.key === key)?.data ?? null;
  return <SiteContentManager initialContent={content} />;
}
