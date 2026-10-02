import { requireAdminPage } from '@/server/auth/staff-session';
import { BackOfficeShell } from '@/components/admin/BackOfficeShell';
import type { AdminNavItem } from '@/components/admin/AdminSidebar';
import { getSiteContent } from '@/server/content/site-content';
import { getOrdersToHandleCount } from '@/server/admin/staff-home';

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

/**
 * Cửa chặn tập trung cho khu quản trị (chỉ quản trị viên; nhân viên được đưa sang /staff) + điều hướng chức năng.
 * Mỗi trang vẫn tự kiểm tra vai trò, nhưng lớp này bảo đảm một trang thêm mới dưới /admin/* không thể vô tình
 * mở cho người khác.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Nội dung thương hiệu và số đơn đã được cache nên đọc song song với kiểm tra phiên; chuyển hướng vẫn xảy ra trước khi dựng trang.
  const [session, siteContent, ordersToHandle] = await Promise.all([requireAdminPage('/admin'), getSiteContent(), getOrdersToHandleCount()]);
  const brandAssets = siteContent.brand_assets;
  const items = ADMIN_ITEMS.map((item) => item.icon === 'orders' ? { ...item, badge: ordersToHandle } : item);

  return <BackOfficeShell home="/admin" items={items} logoUrl={brandAssets?.logoUrl} logoAlt={brandAssets?.logoAlt}
    userName={session.user.name || session.user.email || 'Tài khoản quản trị'} userRole={session.user.role}>
    {children}
  </BackOfficeShell>;
}
