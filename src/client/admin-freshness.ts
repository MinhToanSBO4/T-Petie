/**
 * Trình duyệt giữ các trang đã dựng trong 5 phút (`staleTimes` trong next.config), nên sau khi sửa dữ liệu, trang dựng
 * từ máy chủ như Tổng quan có thể còn số liệu cũ khi mở lại. Không gọi `router.refresh()` ngay trên trang đang thao tác:
 * lệnh đó dựng lại cả trang hiện tại, làm mất thông báo "Hoàn tác", thông báo đã lưu và phần đang nhập.
 * Thay vào đó đánh dấu dữ liệu đã đổi; khi chuyển sang trang quản trị khác, trang đích được làm mới một lần.
 */
let stale = false;

export function markAdminPagesStale() {
  stale = true;
}

/** Trả về true (và xóa đánh dấu) nếu dữ liệu đã đổi kể từ lần làm mới trước. */
export function takeAdminPagesStale() {
  const was = stale;
  stale = false;
  return was;
}
