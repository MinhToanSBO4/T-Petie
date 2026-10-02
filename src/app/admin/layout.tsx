import { requireStaffPage } from '@/server/auth/staff-session';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar, type AdminNavItem } from '@/components/admin/AdminSidebar';
import { AdminFreshness } from '@/components/admin/AdminFreshness';
import { getSiteContent } from '@/server/content/site-content';

export const dynamic = 'force-dynamic';

const ADMIN_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: 'Tổng quan', icon: 'dashboard' },
  { href: '/admin/orders', label: 'Đơn hàng', icon: 'orders' },
  { href: '/admin/products', label: 'Sản phẩm', icon: 'products' },
  { href: '/admin/collections', label: 'Bộ sưu tập', icon: 'collections' },
  { href: '/admin/content', label: 'Nội dung website', icon: 'content' },
  { href: '/admin/customers', label: 'Khách hàng', icon: 'customers' },
  { href: '/admin/reviews', label: 'Đánh giá sản phẩm', icon: 'reviews' },
  { href: '/admin/feedback', label: 'Feedback', icon: 'feedback' },
  { href: '/admin/staff', label: 'Nhân viên', icon: 'staff' },
  { href: '/admin/settings', label: 'Cấu hình bán hàng', icon: 'settings' },
  { href: '/admin/exports', label: 'Xuất dữ liệu', icon: 'exports' },
];

const STAFF_ITEMS: AdminNavItem[] = [
  { href: '/admin/products', label: 'Sản phẩm', icon: 'products' },
  { href: '/admin/collections', label: 'Bộ sưu tập', icon: 'collections' },
  { href: '/admin/content', label: 'Nội dung website', icon: 'content' },
  { href: '/admin/reviews', label: 'Đánh giá sản phẩm', icon: 'reviews' },
  { href: '/admin/feedback', label: 'Feedback', icon: 'feedback' },
];

/**
 * Cửa chặn tập trung cho toàn bộ khu vực quản trị + điều hướng chức năng.
 * Mỗi trang vẫn tự kiểm tra vai trò chi tiết (admin hay staff), nhưng lớp này bảo đảm
 * một trang thêm mới dưới /admin/* không thể vô tình mở cho người chưa đăng nhập.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Nội dung thương hiệu đã được cache nên đọc song song với kiểm tra phiên; chuyển hướng vẫn xảy ra trước khi dựng trang.
  const [session, siteContent] = await Promise.all([requireStaffPage('/admin'), getSiteContent()]);
  const items = session.user.role === 'admin' ? ADMIN_ITEMS : STAFF_ITEMS;
  const brandAssets = siteContent.brand_assets;
  const userName = session.user.name || session.user.email || 'Tài khoản quản trị';

  return <div className="admin-theme min-h-screen bg-cream-50">
    <AdminFreshness />
    <AdminHeader logoUrl={brandAssets?.logoUrl} logoAlt={brandAssets?.logoAlt}
      userName={userName} userRole={session.user.role} />
    <div className="flex w-full items-start gap-3 px-3 py-6 sm:gap-4 sm:px-6 lg:gap-8">
      {/* Sidebar luôn nằm bên trái và giữ nguyên vị trí khi cuộn nội dung. */}
      <aside className="no-scrollbar sticky top-20 w-[4.5rem] shrink-0 self-start sm:w-48 lg:w-60 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <AdminSidebar items={items} />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  </div>;
}
