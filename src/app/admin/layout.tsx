import { requireStaffPage } from '@/server/auth/staff-session';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar, type AdminNavItem } from '@/components/admin/AdminSidebar';
import { getSiteContent } from '@/server/content/site-content';

export const dynamic = 'force-dynamic';

const ADMIN_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: 'Tổng quan' },
  { href: '/admin/orders', label: 'Đơn hàng' },
  { href: '/admin/products', label: 'Sản phẩm' },
  { href: '/admin/collections', label: 'Bộ sưu tập' },
  { href: '/admin/content', label: 'Nội dung website' },
  { href: '/admin/customers', label: 'Khách hàng' },
  { href: '/admin/reviews', label: 'Đánh giá sản phẩm' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/staff', label: 'Nhân viên' },
  { href: '/admin/settings', label: 'Cấu hình bán hàng' },
  { href: '/admin/exports', label: 'Xuất dữ liệu' },
];

const STAFF_ITEMS: AdminNavItem[] = [
  { href: '/admin/products', label: 'Sản phẩm' },
  { href: '/admin/collections', label: 'Bộ sưu tập' },
  { href: '/admin/content', label: 'Nội dung website' },
  { href: '/admin/feedback', label: 'Feedback' },
];

/**
 * Cửa chặn tập trung cho toàn bộ khu vực quản trị + điều hướng chức năng.
 * Mỗi trang vẫn tự kiểm tra vai trò chi tiết (admin hay staff), nhưng lớp này bảo đảm
 * một trang thêm mới dưới /admin/* không thể vô tình mở cho người chưa đăng nhập.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaffPage('/admin');
  const items = session.user.role === 'admin' ? ADMIN_ITEMS : STAFF_ITEMS;
  const brandAssets = (await getSiteContent()).brand_assets;
  const userName = session.user.name || session.user.email || 'Tài khoản quản trị';

  return <div className="min-h-screen">
    <AdminHeader logoUrl={brandAssets?.logoUrl} logoAlt={brandAssets?.logoAlt}
      userName={userName} userRole={session.user.role} />
    <div className="flex w-full items-start gap-4 px-4 py-6 sm:px-6 lg:gap-8">
      {/* Sidebar luôn nằm bên trái và giữ nguyên vị trí khi cuộn nội dung. */}
      <aside className="sticky top-20 w-36 shrink-0 self-start sm:w-44 lg:w-60 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <AdminSidebar items={items} />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  </div>;
}
