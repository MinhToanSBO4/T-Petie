/**
 * Template được dựng lại mỗi lần chuyển trang quản trị. Template bọc ngoài loading.tsx nên nếu
 * đặt hiệu ứng lên chính khung này thì chỉ khung chờ được trượt lên, còn trang thật hiện ra đột ngột.
 * Vì vậy hiệu ứng gắn vào phần tử con khi được chèn vào: trang thật trượt nhẹ lên, khung chờ
 * (role="status") giữ nguyên để không có hai lớp chuyển động nối nhau. Tắt khi người dùng chọn giảm chuyển động.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="motion-safe:[&>:not([role=status])]:animate-page-in">{children}</div>;
}
