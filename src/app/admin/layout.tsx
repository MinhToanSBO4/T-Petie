import { redirect } from 'next/navigation';
import { getStaffSession } from '@/server/auth/staff-session';
import { AdminSidebar, type AdminNavItem } from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

const ADMIN_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: 'Tổng quan' },
  { href: '/admin/orders', label: 'Đơn hàng' },
  { href: '/admin/products', label: 'Sản phẩm' },
  { href: '/admin/collections', label: 'Bộ sưu tập' },
  { href: '/admin/content', label: 'Nội dung website' },
  { href: '/admin/customers', label: 'Khách hàng' },
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
  const session = await getStaffSession();
  if (!session) redirect('/login?callbackUrl=/admin');
  const items = session.user.role === 'admin' ? ADMIN_ITEMS : STAFF_ITEMS;
  return <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 lg:flex lg:gap-8">
    <aside className="lg:w-60 lg:shrink-0">
      <p className="mb-3 hidden text-xs font-bold uppercase tracking-widest text-honey-600 lg:block">T&apos;Petie / Quản trị</p>
      <AdminSidebar items={items} />
    </aside>
    <main className="min-w-0 flex-1">{children}</main>
  </div>;
}
