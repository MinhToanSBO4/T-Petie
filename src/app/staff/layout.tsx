import { requireStaffAreaPage } from '@/server/auth/staff-session';
import { BackOfficeShell } from '@/components/admin/BackOfficeShell';
import type { AdminNavItem } from '@/components/admin/AdminSidebar';
import { getSiteContent } from '@/server/content/site-content';
import { getOrdersToHandleCount } from '@/server/admin/staff-home';

export const dynamic = 'force-dynamic';

const STAFF_ITEMS: AdminNavItem[] = [
  { href: '/staff', label: 'Trang chủ', icon: 'home' },
  { href: '/staff/orders', label: 'Đơn hàng', icon: 'orders' },
  { href: '/staff/products', label: 'Sản phẩm', icon: 'products' },
  { href: '/staff/collections', label: 'Bộ sưu tập', icon: 'collections' },
  { href: '/staff/content', label: 'Nội dung website', icon: 'content' },
  { href: '/staff/reviews', label: 'Đánh giá sản phẩm', icon: 'reviews' },
  { href: '/staff/feedback', label: 'Feedback', icon: 'feedback' },
];

/**
 * Khu làm việc của nhân viên: xử lý đơn hàng, cập nhật sản phẩm và nội dung. Không có doanh thu, khách hàng, nhân sự,
 * cấu hình bán hàng hay xuất dữ liệu. Quản trị viên mở nhầm /staff được đưa sang trang tương ứng ở /admin.
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const [session, siteContent, ordersToHandle] = await Promise.all([requireStaffAreaPage('/staff'), getSiteContent(), getOrdersToHandleCount()]);
  const brandAssets = siteContent.brand_assets;
  const items = STAFF_ITEMS.map((item) => item.icon === 'orders' ? { ...item, badge: ordersToHandle } : item);

  return <BackOfficeShell home="/staff" items={items} logoUrl={brandAssets?.logoUrl} logoAlt={brandAssets?.logoAlt}
    userName={session.user.name || session.user.email || 'Nhân viên'} userRole={session.user.role}>
    {children}
  </BackOfficeShell>;
}
