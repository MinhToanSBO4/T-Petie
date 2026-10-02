import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar, type AdminNavItem } from '@/components/admin/AdminSidebar';
import { AdminFreshness } from '@/components/admin/AdminFreshness';

/**
 * Khung chung của khu quản trị (/admin) và khu nhân viên (/staff). Header cao cố định 4rem; sidebar dính ngay dưới
 * header ngay từ đầu trang (không có khoảng đệm phía trên để trượt), nên khi cuộn nội dung sidebar đứng yên. Danh sách
 * mục dài hơn màn hình thì sidebar tự cuộn bên trong.
 */
export function BackOfficeShell({ home, items, logoUrl, logoAlt, userName, userRole, children }: {
  home: string; items: AdminNavItem[]; logoUrl?: string; logoAlt?: string; userName: string; userRole: string;
  children: React.ReactNode;
}) {
  return <div className="admin-theme min-h-screen bg-cream-50">
    <AdminFreshness />
    <AdminHeader home={home} logoUrl={logoUrl} logoAlt={logoAlt} userName={userName} userRole={userRole} />
    <div className="flex w-full items-start gap-3 px-3 sm:gap-4 sm:px-6 lg:gap-8">
      <aside className="no-scrollbar sticky top-16 h-[calc(100dvh-4rem)] w-[4.5rem] shrink-0 overflow-y-auto py-6 sm:w-48 lg:w-60">
        <AdminSidebar items={items} home={home} />
      </aside>
      <main className="min-w-0 flex-1 py-6">{children}</main>
    </div>
  </div>;
}
