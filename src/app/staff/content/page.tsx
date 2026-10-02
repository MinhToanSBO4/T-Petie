import { requireStaffAreaPage } from '@/server/auth/staff-session';
import { SiteContentManager } from '@/components/admin/SiteContentManager';
import { loadSiteContentEditor } from '@/server/content/site-content-editor';

export const dynamic = 'force-dynamic';

export default async function StaffSiteContentPage() {
  await requireStaffAreaPage('/staff/content');
  return <SiteContentManager {...await loadSiteContentEditor()} />;
}
