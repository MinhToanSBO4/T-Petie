# Ổn định kết nối DB, xử lý đơn nhanh, bộ lọc sản phẩm và triển khai Vercel

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hết lỗi khi chuyển tab liên tục và lỗi "Unknown field" sau khi đổi schema; admin xử lý nhiều đơn trong một thao tác; bộ lọc sản phẩm đầy đủ (giá, size, bộ sưu tập, còn hàng, đang giảm giá, đánh giá) và tìm kiếm không dấu; cấu hình chuẩn để deploy cả FE + BE lên Vercel với kết nối Supabase tối ưu; rà soát toàn bộ tính năng admin và nhân viên.

**Architecture:** Giữ phân lớp `src/app → src/server → Prisma`. Quy tắc thuần (tham số kết nối DB, lộ trình trạng thái đơn, bộ lọc/tìm kiếm sản phẩm) nằm ở `src/lib` và có test.

**Spec:** Yêu cầu của chủ dự án ngày 2026-10-02.

## Nguyên nhân đã tái hiện

- Prisma Client trong `node_modules` sinh lúc 01/10 22:41, schema đổi lúc 02/10 00:27 (thêm `OrderStatusEvent.note`) → `Unknown field note`. Database đã đủ 15 migration.
- Runtime đặt `connection_limit=1`, `pool_timeout` mặc định 10 s. Mô phỏng chuyển tab dồn dập: 37/76 yêu cầu lỗi `Timed out fetching a new connection from the connection pool`.
- Mỗi request gọi `getServerSession` → callback `jwt` truy vấn bảng users. Khi truy vấn này timeout: API trả 403 "Không có quyền" cho chính admin, và NextAuth **xóa cookie phiên** (đăng xuất) ở `/api/auth/session`. `SessionProvider` mặc định gọi lại `/api/auth/session` mỗi lần tab trình duyệt được focus.

## Tham khảo

- Supabase/Prisma: runtime dùng transaction pooler cổng 6543 + `pgbouncer=true`; migration dùng `DIRECT_URL` (session pooler 5432 hoặc kết nối trực tiếp).
- Vercel: `regions` (Hobby chọn được một region; `icn1` = Seoul, cùng vùng ap-northeast-2 của Supabase), Fluid compute mặc định từ 23/04/2025, Hobby tối đa 300 s, body 4,5 MB, cron Hobby một lần/ngày, `CRON_SECRET` gửi qua `Authorization: Bearer`, `waitUntil` của `@vercel/functions` cho Next < 15.1.
- Xử lý đơn: Shopee/Sapo xử lý theo tab trạng thái, chọn nhiều đơn rồi xác nhận/chuẩn bị hàng loạt (Sapo giới hạn 50 đơn/lần, có hộp xác nhận); WooCommerce có hành động hàng loạt "Change status to…" và nút nhanh trên từng dòng; Shopify "Mark as fulfilled" hàng loạt, bỏ qua đơn đã ở trạng thái đích.

## Tasks

- [x] 1. Kết nối DB: tham số pool theo môi trường (dev/server lâu dài, build, Vercel), `pgbouncer=true` cho cổng 6543, `transactionOptions`, `directUrl` cho migration; test.
- [x] 2. Phiên đăng nhập: cache bản ghi user ngắn hạn + thu hồi khi sửa user, không đăng xuất/403 khi DB lỗi tạm thời, tắt gọi lại phiên khi focus tab.
- [x] 3. Cảnh báo Prisma Client cũ trong dev; `npm run dev` tự đồng bộ (đã có) + hướng dẫn khi dev server đang chạy.
- [x] 4. API đơn admin: bớt truy vấn (đếm từ groupBy, mốc thay đổi gộp), endpoint xử lý hàng loạt phía máy chủ (≤ 50 đơn), chuyển thẳng tới bước sau có ghi đủ lịch sử, hoàn tác nhiều bước (cả Hoàn tất khi khách chưa đánh giá).
- [x] 5. Giao diện đơn admin: chọn nhiều đơn ở mọi tab, "Chuyển tới…" trong thanh hàng loạt và "Chuyển nhanh tới" trong ngăn kéo chi tiết, nút đơn trước/sau. Sửa lỗi `router.refresh()` dựng lại trang làm mất nút "Hoàn tác" và thông báo đã lưu.
- [x] 6. Feedback admin: một vùng tải ảnh duy nhất (máy + thư viện chọn nhiều ảnh), thay ô số thứ tự bằng màn hình "Sắp xếp hiển thị" kéo-thả; sửa lọc bản nháp + tìm kiếm.
- [x] 7. Bộ lọc sản phẩm: khoảng giá (mốc + tự nhập), size theo dữ liệu thật, màu, bộ sưu tập, loại, còn hàng, đang giảm giá, hàng mới, đánh giá; sắp xếp; trạng thái trên URL; tìm kiếm không dấu + gợi ý ngay trong ô tìm kiếm; sửa lỗi hydrate của danh mục.
- [x] 8. Vercel: `vercel.json`, cron bảo trì có `CRON_SECRET`, `waitUntil` cho xuất Excel, migrate khi build production, ảnh qua Cloudinary loader, tài liệu deploy, `.env.example`.
- [x] 9. Rà soát truy vấn toàn hệ thống và sửa các điểm tốn tài nguyên.
- [x] 10. Rà soát và chạy thử toàn bộ tính năng admin và nhân viên (API + giao diện), sửa lỗi phát hiện.
- [x] 11. Kiểm chứng: `npm test`, `tsc`, build, script e2e, chụp giao diện; cập nhật README và CAN_BAN_BO_SUNG.md.
