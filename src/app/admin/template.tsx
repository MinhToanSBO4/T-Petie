/**
 * Template được dựng lại mỗi lần chuyển trang quản trị, nên nội dung mới trượt nhẹ lên
 * cùng nhịp với giao diện khách. Chỉ dùng CSS (không tải thêm thư viện) và tắt khi người dùng
 * chọn giảm chuyển động.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="motion-safe:animate-slide-up">{children}</div>;
}
