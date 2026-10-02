import { requireAdminPage } from '@/server/auth/staff-session';
import { SiteContentManager } from '@/components/admin/SiteContentManager';
import { loadSiteContentEditor } from '@/server/content/site-content-editor';

export const dynamic = 'force-dynamic';

export default async function AdminSiteContentPage() {
  await requireAdminPage('/admin/content');
  return <SiteContentManager {...await loadSiteContentEditor()} />;
}
