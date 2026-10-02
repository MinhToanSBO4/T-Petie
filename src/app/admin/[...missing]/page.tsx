import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Đường dẫn không khớp trang nào trong /admin (Next chỉ dùng not-found gốc cho URL lạ): chuyển sang admin/not-found để
 * báo 404 ngay trong khung quản trị. Catch-all có độ ưu tiên thấp nhất nên không che trang thật; middleware và layout
 * vẫn chặn người chưa đăng nhập trước khi tới đây.
 */
export default function AdminMissingPage() {
  notFound();
}
