# Feedback dạng ảnh, Đơn mua và Đánh giá đã mua hàng

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Feedback khách hàng chuyển sang ảnh chụp màn hình tin nhắn, trình bày kiểu story (trang chủ) và album (trang riêng). Bổ sung khu vực **Đơn mua** tách biệt với giỏ hàng; chỉ khách đã mua và nhận hàng mới đánh giá được sản phẩm, theo luồng tham khảo Shopee.

**Architecture:** Giữ phân lớp `src/app → src/server → Prisma`. Quy tắc thuần (hạn đánh giá, tab đơn, dòng thời gian, kiểm tra đầu vào, che tên) nằm ở `src/lib` và có test. Trang Đơn mua là Server Component đọc trực tiếp `src/server`, chỉ phần tương tác (đánh giá, mua lại, hủy/nhận hàng) là client. Dữ liệu công khai (feedback, đánh giá đã duyệt) cache theo tag và thu hồi khi ghi.

**Spec:** Yêu cầu của chủ dự án ngày 2026-10-01.

## Tham khảo

- Shopee: chỉ đánh giá khi đơn đã hoàn thành, trong 30 ngày; sửa đánh giá một lần trong 30 ngày; đánh giá gồm sao, nội dung, ảnh; mục Đơn mua chia tab theo trạng thái, có tab chờ đánh giá; người mua bấm "Đã nhận được hàng".
- Lazada: tab "Chưa đánh giá" liệt kê món đã giao chưa đánh giá; chỉ người đã nhận hàng mới đánh giá.
- Baymard: theo dõi đơn đang giao là chức năng tự phục vụ quan trọng nhất; cần thanh tiến trình trạng thái và tóm tắt món trong đơn; phân bố sao phải là bộ lọc bấm được, chọn một mức tại một thời điểm, ẩn khi ≤ 5 đánh giá; cho tải ảnh kèm đánh giá và lọc "có hình ảnh".
- Story UI: thanh tiến trình theo đoạn, chạm trái/phải để lùi/tiến, nhấn giữ để tạm dừng, có nút tạm dừng và tắt tự chạy khi người dùng chọn giảm chuyển động.

## Global Constraints

- Giữ nguyên giao diện hiện có; chỉ thêm lối vào Đơn mua và chú thích phân biệt giỏ hàng/đơn mua.
- Feedback chỉ hiện công khai khi đã xác nhận khách đồng ý và bật công bố. Ảnh phải nằm trong thư viện ảnh.
- Đánh giá luôn chờ quản trị viên duyệt; điểm trung bình sản phẩm chỉ tính đánh giá đã duyệt.
- Không tin dữ liệu trình duyệt: quyền đánh giá, trạng thái đơn và chủ sở hữu đơn đều kiểm tra phía máy chủ.

### Task 1: Database

- [x] Feedback: bỏ trường chữ, thêm ảnh, kích thước ảnh, chú thích và sản phẩm liên quan.
- [x] Đơn hàng: thêm `completedAt`, bảng lịch sử trạng thái `order_status_events`, chỉ mục `order_items.productId`.
- [x] Đánh giá: gắn với `orderItemId` duy nhất, thêm ảnh, kích cỡ đã mua, cảm nhận size, ẩn danh, số lần sửa.

### Task 2: Quy tắc thuần và test

- [x] Kiểm tra đầu vào feedback (một ảnh hoặc lô ảnh) và đánh giá.
- [x] Hạn đánh giá/sửa, tab Đơn mua, dòng thời gian đơn, che tên người đánh giá, URL ảnh Cloudinary.

### Task 3: Feedback dạng ảnh

- [x] API quản trị nhận lô ảnh từ thư viện, chặn xóa ảnh đang dùng cho feedback.
- [x] Trang chủ: dải story + trình xem toàn màn hình; trang `/feedback` dạng album.
- [x] Màn hình quản trị: tải nhiều ảnh, chú thích, gắn sản phẩm, đồng ý công bố, thứ tự.

### Task 4: Đơn mua

- [x] Dịch vụ chuyển trạng thái dùng chung cho admin và khách (ghi lịch sử, mốc hoàn tất, hoàn kho khi hủy).
- [x] Trang `/orders` (tab + đếm), `/orders/[code]` (dòng thời gian, địa chỉ, tiền, đánh giá từng món), hủy đơn chờ xác nhận, xác nhận đã nhận hàng, mua lại.
- [x] Lối vào: menu tài khoản, giỏ hàng, mini cart, trang đặt hàng thành công, trang tài khoản.

### Task 5: Đánh giá đã mua hàng

- [x] API gửi/sửa đánh giá kèm ảnh (nén ở trình duyệt), kiểm tra đơn của chính khách đã hoàn tất và còn hạn.
- [x] Trang sản phẩm: điểm trung bình, phân bố sao bấm lọc, lọc có ảnh/bình luận, cảm nhận size, nút viết đánh giá khi có món chờ đánh giá.
- [x] Quản trị: hiện mã đơn, ảnh, cảm nhận size; duyệt/bỏ duyệt/xóa cập nhật điểm trung bình sản phẩm.

### Task 6: Verification

- [x] `npm test`, `npx tsc --noEmit`, `npm run build`.
- [x] Script kiểm tra luồng mua hàng → đánh giá trên server local, tự dọn dữ liệu thử.
- [x] Cập nhật README và CAN_BAN_BO_SUNG.
