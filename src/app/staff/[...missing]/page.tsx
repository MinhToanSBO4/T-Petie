import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Đường dẫn không khớp trang nào trong /staff: chuyển sang staff/not-found để báo 404 ngay trong khung khu nhân viên.
 * Catch-all có độ ưu tiên thấp nhất nên không che trang thật; middleware và layout vẫn chặn người chưa đăng nhập trước.
 */
export default function StaffMissingPage() {
  notFound();
}
