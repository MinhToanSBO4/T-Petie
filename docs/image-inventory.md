# Ảnh trong dự án

Toàn bộ ảnh hiển thị trên website nằm trên Cloudinary và được quản lý trong bảng `media_assets`:
banner bộ sưu tập, ảnh lookbook, ảnh sản phẩm, ảnh chủ đề trang chủ, banner ưu đãi,
ảnh nền trang giới thiệu, ảnh tiêu đề trang danh mục và logo.

- Không còn ảnh tĩnh trong `public/images`; thư mục đã được xóa sau khi chuyển ảnh lên Cloudinary.
- Ảnh mới tải lên qua thư viện media trong `/admin/noi-dung`, `/admin/bo-suu-tap` và `/admin/san-pham`.
- Nếu cần chuyển ảnh sang tài khoản Cloudinary khác, cập nhật `.env` rồi chạy `npm run media:migrate`.
- Nếu cần khôi phục ảnh cũ để đối chiếu, xem lại lịch sử Git của thư mục `public/images`.
