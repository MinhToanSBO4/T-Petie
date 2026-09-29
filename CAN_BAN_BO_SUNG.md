# T'Petie — phần cần bổ sung và kiểm chứng trước khi chạy thật

Tài liệu này gom toàn bộ đầu vào còn thiếu, giới hạn đã biết và việc chưa hoàn tất. Bản mã nguồn mới ở **thư mục gốc**; `T-Petie-example/` là repo mẫu đã đổi tên. Supabase hiện dùng schema riêng `tpetie_app`; migration đã áp dụng và đã nạp 40 sản phẩm, 4 bộ sưu tập, 271 biến thể, 43 ảnh mẫu. Các bảng `public` có sẵn được giữ nguyên. Admin mẫu `superadmin` và nhân viên mẫu `nhanvien` đã được lưu trong DB, đăng nhập local và kiểm tra phân quyền thành công. Đặt lại mật khẩu nhân viên hiện tạo mật khẩu tạm một lần và vô hiệu hóa phiên cũ.

## Việc cần bạn cung cấp

1. **Cloudinary CDN:** `.env` hiện đã có cloud name, API key và API secret; cần thử tải ảnh thật từ trang quản trị. `CDN_URL` hiện có là địa chỉ trang quản lý, không phải URL phân phối ảnh. Ảnh mẫu hiện là URL/local asset của repo cũ; cần chuyển lên CDN nếu muốn toàn bộ ảnh do Cloudinary phục vụ.
2. **Dữ liệu kinh doanh:** đã nạp dữ liệu mặc định của repo mẫu theo yêu cầu. Trước khi bán thật, cần kiểm tra lại giá, SKU và số tồn; nạp các sản phẩm sale khác nếu muốn giữ đầy đủ danh mục cũ. Luật hiện tại: phí vận chuyển 30.000đ, miễn phí từ 399.000đ; mã `TPETIE20`, `MEMBERVIP` được kiểm tra trên máy chủ nhưng chưa có trang quản trị coupon.
3. **Triển khai:** domain chính thức, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` riêng cho production, thông tin liên hệ/chính sách bán hàng chính thức. Với Vercel Preview, cần URL Preview tương ứng, biến môi trường đặt trong Vercel và chuỗi Supabase transaction pooler cho serverless; hướng dẫn ngắn ở README. Secret local đã được tạo riêng và không được commit. Thay mật khẩu Supabase từng xuất hiện dạng văn bản trong tài liệu gốc; dòng đó đã được xóa khỏi `yêu cầu.txt`, nhưng nên xoay vòng credential. Đổi mật khẩu admin/nhân viên mẫu trước khi mở site công khai.
4. **Google đăng nhập:** theo chỉ đạo trước đó, chỉ để chỗ trong UI, chưa bật. `.env` hiện có `OAUTH_CLIENT_SECRET` nhưng **chưa có Google Client ID**; ứng dụng cần cặp `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và callback URI đúng domain để bật Google. Đăng nhập username/email và mật khẩu đã hoạt động.

## Phần hệ thống còn cần làm hoặc đối chiếu

- Schema Prisma hiện có catalog, tài khoản, đơn hàng, biến thể và giới hạn lượt thử. Bản thiết kế `db.sql` còn các phần chưa chuyển thành model và luồng nghiệp vụ: hồ sơ bé tách riêng, nhiều địa chỉ, giỏ hàng đồng bộ, đánh giá, coupon/redemption, lịch sử trạng thái, đặt giữ hàng và sổ biến động tồn kho, thanh toán/webhook/hoàn tiền, vận chuyển, điểm thưởng và nhật ký quản trị. Hiện các mục này **không nên được xem là đã hoàn thiện**.
- Chưa có tích hợp cổng thanh toán, QR/chuyển khoản tự đối soát, hãng vận chuyển hoặc webhook. Chỉ dùng COD. Cần thông tin nhà cung cấp và tài khoản thử nghiệm khi triển khai các luồng này.
- Đã kiểm tra đọc catalog và đăng nhập admin với Supabase thật. Chưa kiểm thử đầy đủ các luồng ghi như đăng ký khách, đặt hàng, đổi trạng thái, xuất Excel và tải ảnh CDN. Cần thử toàn bộ trên môi trường staging trước khi mở bán.
- Giao diện lấy từ source repo mẫu và đã chuyển các trang chính sang dữ liệu API. Trang sale được xây lại theo sản phẩm trong database nên có thể khác nội dung mẫu khi chưa có đủ dữ liệu sale. Chưa thể chứng minh khớp từng điểm ảnh trên mọi kích thước màn hình; cần rà bằng ảnh đối chiếu hoặc website mẫu khi truy cập được.
- Migration khởi tạo đã áp dụng trong schema `tpetie_app`. Các bảng cũ trong `public` chưa được chuyển đổi và hiện không được ứng dụng sử dụng. Nếu sau này cần lấy dữ liệu thật từ `public`, phải viết migration chuyển dữ liệu riêng; không chạy ép `db push --accept-data-loss`.
- Giỏ hàng hiện lưu tại trình duyệt và không đồng bộ giữa thiết bị. Giá và tồn kho được kiểm tra lại khi đặt hàng; cần phát triển bảng cart theo thiết kế nếu muốn giữ giỏ hàng theo tài khoản.
- Cần kiểm thử tải, khả năng chịu lỗi kết nối DB/CDN, giám sát lỗi, sao lưu/khôi phục và các ca tranh chấp tồn kho trước khi nhận đơn thật. Rate limit hiện lưu trong PostgreSQL; cần chiến lược dọn bản ghi hết hạn và đánh giá thêm khi lưu lượng lớn.
- Cache catalog hiện có ở máy chủ (60 giây) và bộ nhớ trình duyệt (60 giây, chia sẻ request đang chạy). Điều này giúp chuyển giữa các trang danh mục trong cùng tab nhanh hơn; dữ liệu tồn kho trong danh mục có thể trễ tối đa khoảng một phút, nhưng checkout kiểm tra lại trực tiếp từ database. Cần đo và tối ưu thêm trên môi trường Preview; dev server có thời gian biên dịch lần đầu nên không đại diện cho production.

## Chạy thử và xác minh local

Trong thư mục gốc: `npm ci` (nếu chưa cài), sau đó `npm run dev`; mở `http://localhost:3000`. `CONNECTION_STRING` trong `.env` đã chọn `tpetie_app`. Đăng nhập admin bằng username `superadmin` và mật khẩu mẫu đã thống nhất; đăng nhập nhân viên bằng `nhanvien` với mật khẩu ở biến `STAFF_INITIAL_PASSWORD` trong `.env.local` (file bị Git bỏ qua). Không đưa mật khẩu mẫu lên Git hoặc dùng cho production.

Không cần chạy lại migration/seed để thử local. Trước khi mở bán, tạo tài khoản người mua, thử đặt COD, tra cứu mã đơn, thay đổi trạng thái đơn và kiểm tra tồn kho hoàn lại khi hủy; đăng nhập admin/nhân viên để kiểm tra giới hạn quyền; tải ảnh qua CDN và mở file Excel đã xuất.
