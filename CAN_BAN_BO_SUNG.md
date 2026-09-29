# T'Petie — đầu vào cần xác nhận trước khi mở bán

Bản ứng dụng ở thư mục gốc dùng PostgreSQL/Supabase qua Prisma, không dùng catalog hoặc tài khoản giả trong mã chạy. Schema ứng dụng là `tpetie_app`. Dữ liệu lấy từ repo mẫu đã được nạp vào DB: 40 sản phẩm, 4 bộ sưu tập, 271 biến thể và 2 tài khoản mẫu. Đây là **dữ liệu mẫu đã lưu thật trong DB**, chưa phải dữ liệu kinh doanh được chủ cửa hàng duyệt.

## Cần bạn cung cấp hoặc xác nhận

1. **Dữ liệu để bán thật:** rà giá, SKU, số tồn, ảnh, nội dung sản phẩm, các bộ sưu tập và chính sách bán hàng. Số đánh giá từ repo mẫu đã được bỏ vì không có đánh giá thật. Trang chủ lấy banner bộ sưu tập từ DB. Địa chỉ, thông tin liên hệ và nội dung chính sách còn trong các trang tĩnh cần chủ dự án xác nhận.
2. **Thông tin giao hàng và ưu đãi:** phí 30.000đ, miễn phí từ 399.000đ, mã `TPETIE20` và `MEMBERVIP` hiện là bản ghi trong DB, có thể sửa trong `/admin/cau-hinh`. Cần xác nhận các mức này trước khi công khai.
3. **Ảnh sản phẩm:** ảnh mẫu hiện là URL và asset của repo cũ. `.env` đã có Cloudinary nhưng cần tải ảnh thật qua trang quản trị và xác nhận CDN hoạt động; `CDN_URL` là địa chỉ trang quản lý, không phải URL phân phối ảnh.
4. **Triển khai:** khi chuẩn bị Vercel, cung cấp domain chính thức, thông tin liên hệ và chính sách đã duyệt, khóa production mới, chuỗi Supabase transaction pooler và cấu hình môi trường. Đổi mật khẩu tài khoản mẫu trước khi công khai. Một credential Supabase từng có trong tài liệu gốc đã được xóa khỏi file; nên xoay vòng credential đó.
5. **Google OAuth:** theo yêu cầu, để phát triển sau. Cần Google Client ID, Client Secret và callback URI của domain triển khai để bật. Đăng nhập username/email và mật khẩu đang dùng DB.
6. **Thanh toán và vận chuyển ngoài COD:** chưa có nhà cung cấp cổng thanh toán hoặc hãng vận chuyển. Nếu cần chuyển khoản/QR tự đối soát, webhook hay vận đơn tự động, cần tài khoản và thông số tích hợp tương ứng.

## Giới hạn hiện tại

- Giỏ hàng nằm trong bộ nhớ trình duyệt và không đồng bộ giữa thiết bị. Báo giá và đặt hàng đọc lại giá, tồn kho, phí giao hàng và coupon từ DB; dữ liệu cũ ở giỏ không quyết định tổng tiền đơn.
- Các phần trong `docs/reference/db.sql` như nhiều địa chỉ, đánh giá, sổ tồn kho, hoàn tiền, điểm thưởng và nhật ký quản trị chưa có luồng hoàn chỉnh. Tài khoản mới bắt đầu với 0 điểm; giao diện không hiển thị điểm hoặc voucher tự tạo.
- Chỉ có thanh toán COD. Cần kiểm thử staging, tải, giám sát lỗi, sao lưu/khôi phục DB và xử lý tranh chấp tồn kho trước khi nhận đơn thật ở quy mô lớn.
- Catalog có cache máy chủ 60 giây và cache trong tab 60 giây. Vì vậy danh mục có thể hiển thị tồn kho cũ trong khoảng một phút; API báo giá và đặt hàng kiểm tra DB. Dev server biên dịch trang lần đầu nên thời gian tải lần đầu không phản ánh tốc độ bản production.
- Giao diện lấy từ repo mẫu và đã nối các trang chính với API/DB. Cần đối chiếu hình ảnh trên các cỡ màn hình nếu yêu cầu khớp từng điểm ảnh. Schema `public` trên Supabase không được ứng dụng sử dụng; xem bảng trong `tpetie_app`.

## Chạy và kiểm tra local

Trong thư mục gốc: `npm ci` nếu chưa cài, `npm run dev`, mở `http://localhost:3000`. Không cần seed lại DB hiện tại. Admin đăng nhập bằng `superadmin` và mật khẩu mẫu đã thống nhất; nhân viên bằng `nhanvien` với mật khẩu tại `STAFF_INITIAL_PASSWORD` trong `.env.local`. Không đưa mật khẩu vào Git.

Chạy `npm test`, `npx tsc --noEmit`, `npm run build` (dừng dev server trước khi build trên Windows). Khi dev server chạy, dùng `node scripts/verify-data-source.cjs`, `node scripts/check-commerce.cjs`, `node scripts/check-customer-flow.cjs`, `node scripts/check-order-flow.cjs`, `node scripts/check-new-product-flow.cjs` để đối chiếu API và DB, bao gồm đơn COD, hoàn tồn khi hủy, coupon và tài khoản. Các script ghi thử tự dọn dữ liệu thử sau khi hoàn thành.
