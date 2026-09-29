# T'Petie — phần cần bổ sung và kiểm chứng trước khi chạy thật

Tài liệu này gom toàn bộ đầu vào còn thiếu, giới hạn đã biết và việc chưa hoàn tất. Bản mã nguồn mới ở **thư mục gốc**; `T-Petie-example/` là repo mẫu đã đổi tên. Supabase hiện dùng schema riêng `tpetie_app`; migration đã áp dụng và đã nạp 40 sản phẩm, 4 bộ sưu tập, 271 biến thể, 43 ảnh mẫu. Các bảng `public` có sẵn được giữ nguyên. Smoke test local cho trang chính, API catalog và đăng nhập admin đã đạt.

## Việc cần bạn cung cấp

1. **Cloudinary CDN:** bạn đã đặt cloud name và API secret trong `.env`; API tải ảnh còn thiếu **`CLOUDINARY_API_KEY`**. Đặt key trong `.env` để thử tải ảnh từ trang quản trị. `CDN_URL` hiện có là địa chỉ trang quản lý, không phải URL phân phối ảnh. Ảnh mẫu hiện là URL/local asset của repo cũ; cần chuyển lên CDN nếu muốn toàn bộ ảnh do Cloudinary phục vụ.
2. **Dữ liệu kinh doanh:** đã nạp dữ liệu mặc định của repo mẫu theo yêu cầu. Trước khi bán thật, cần kiểm tra lại giá, SKU và số tồn; nạp các sản phẩm sale khác nếu muốn giữ đầy đủ danh mục cũ. Luật hiện tại: phí vận chuyển 30.000đ, miễn phí từ 399.000đ; mã `TPETIE20`, `MEMBERVIP` được kiểm tra trên máy chủ nhưng chưa có trang quản trị coupon.
3. **Triển khai:** domain chính thức, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` riêng cho production, thông tin liên hệ/chính sách bán hàng chính thức. Secret local đã được tạo riêng và không được commit. Thay mật khẩu Supabase từng xuất hiện dạng văn bản trong tài liệu gốc; dòng đó đã được xóa khỏi `yêu cầu.txt`, nhưng nên xoay vòng credential.
4. **Google đăng nhập:** theo chỉ đạo hiện tại, chỉ để chỗ trong UI, chưa bật. `.env` hiện có `OAUTH_CLIENT_SECRET` nhưng chưa có Google Client ID; khi phát triển, cần cả `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và callback URI đúng domain. Không cần cho đăng nhập thường.

## Phần hệ thống còn cần làm hoặc đối chiếu

- Schema Prisma hiện có catalog, tài khoản, đơn hàng, biến thể và giới hạn lượt thử. Bản thiết kế `db.sql` còn các phần chưa chuyển thành model và luồng nghiệp vụ: hồ sơ bé tách riêng, nhiều địa chỉ, giỏ hàng đồng bộ, đánh giá, coupon/redemption, lịch sử trạng thái, đặt giữ hàng và sổ biến động tồn kho, thanh toán/webhook/hoàn tiền, vận chuyển, điểm thưởng và nhật ký quản trị. Hiện các mục này **không nên được xem là đã hoàn thiện**.
- Chưa có tích hợp cổng thanh toán, QR/chuyển khoản tự đối soát, hãng vận chuyển hoặc webhook. Chỉ dùng COD. Cần thông tin nhà cung cấp và tài khoản thử nghiệm khi triển khai các luồng này.
- Đã kiểm tra đọc catalog và đăng nhập admin với Supabase thật. Chưa kiểm thử đầy đủ các luồng ghi như đăng ký khách, đặt hàng, đổi trạng thái, xuất Excel và tải ảnh CDN. Cần thử toàn bộ trên môi trường staging trước khi mở bán.
- Giao diện lấy từ source repo mẫu và đã chuyển các trang chính sang dữ liệu API. Trang sale được xây lại theo sản phẩm trong database nên có thể khác nội dung mẫu khi chưa có đủ dữ liệu sale. Chưa thể chứng minh khớp từng điểm ảnh trên mọi kích thước màn hình; cần rà bằng ảnh đối chiếu hoặc website mẫu khi truy cập được.
- Migration khởi tạo đã áp dụng trong schema `tpetie_app`. Các bảng cũ trong `public` chưa được chuyển đổi và hiện không được ứng dụng sử dụng. Nếu sau này cần lấy dữ liệu thật từ `public`, phải viết migration chuyển dữ liệu riêng; không chạy ép `db push --accept-data-loss`.
- Giỏ hàng hiện lưu tại trình duyệt và không đồng bộ giữa thiết bị. Giá và tồn kho được kiểm tra lại khi đặt hàng; cần phát triển bảng cart theo thiết kế nếu muốn giữ giỏ hàng theo tài khoản.
- Cần kiểm thử tải, khả năng chịu lỗi kết nối DB/CDN, giám sát lỗi, sao lưu/khôi phục và các ca tranh chấp tồn kho trước khi nhận đơn thật. Rate limit hiện lưu trong PostgreSQL; cần chiến lược dọn bản ghi hết hạn và đánh giá thêm khi lưu lượng lớn.

## Chạy thử và xác minh local

Trong thư mục gốc: `npm ci` (nếu chưa cài), sau đó `npm run dev`; mở `http://localhost:3000`. `CONNECTION_STRING` trong `.env` đã chọn `tpetie_app`. Tài khoản admin local có email `admin@tpetie.local`; mật khẩu ngẫu nhiên lưu trong `.env.local` (biến `ADMIN_INITIAL_PASSWORD`, file bị Git bỏ qua). Không đưa mật khẩu này lên Git hoặc dùng cho production.

Không cần chạy lại migration/seed để thử local. Trước khi mở bán, tạo tài khoản người mua, thử đặt COD, tra cứu mã đơn, thay đổi trạng thái đơn và kiểm tra tồn kho hoàn lại khi hủy; đăng nhập admin/nhân viên để kiểm tra giới hạn quyền; tải ảnh qua CDN và mở file Excel đã xuất.
