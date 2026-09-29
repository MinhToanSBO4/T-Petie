# T'Petie

Ứng dụng thương mại điện tử Next.js ở thư mục gốc. `T-Petie-example/` là bản mã nguồn cũ để đối chiếu và không tham gia build. Tài liệu yêu cầu, kế hoạch và thiết kế dữ liệu gốc nằm cạnh README này. Các mục chưa thể xác nhận hoặc còn cần triển khai được gom trong [CAN_BAN_BO_SUNG.md](CAN_BAN_BO_SUNG.md).

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `src/app` | Trang và API Next.js |
| `src/components` | Thành phần giao diện |
| `src/context` | Trạng thái phiên đăng nhập, giỏ hàng, thông báo |
| `src/lib` | Đăng nhập, truy vấn catalog, tính giá, tạo đơn, giới hạn lượt thử |
| `src/types` | Kiểu dữ liệu FE và NextAuth |
| `prisma/schema.prisma` | Schema ứng dụng PostgreSQL |
| `prisma/migrations` | Migration khởi tạo cho cơ sở dữ liệu trống |
| `prisma/seed-data` | Dữ liệu catalog lấy từ repo mẫu |
| `prisma/seed-catalog.ts` | Nạp catalog mẫu; không đặt lại tồn kho của biến thể đã tồn tại |
| `prisma/seed.ts` | Tạo tài khoản quản trị từ biến môi trường |
| `tests` | Kiểm tra quy tắc bảo mật và giá/tồn kho |

## Chạy tại máy phát triển

1. Dùng Node.js 20 trở lên. Điền `CONNECTION_STRING` vào `.env` (Prisma CLI đọc file này); đặt `NEXTAUTH_URL`, `NEXTAUTH_SECRET` trong `.env.local`. Có thể tham khảo `.env.example`. Mật khẩu và khóa phải giữ ngoài Git. Nếu dùng biến môi trường hệ thống cho Prisma CLI, biến đó sẽ thay thế giá trị trong `.env`.
2. Chạy `npm ci`.
3. Trên máy hiện tại, migration và catalog đã được nạp vào schema Supabase `tpetie_app`; không cần chạy lại để thử. Với database mới: chạy `npx prisma migrate deploy`, sau đó `npm run prisma:seed-catalog`. Migration đầu tiên chỉ dành cho schema trống.
4. Chạy `npm run dev`, mở `http://localhost:3000`. `npm test` và `npm run build` kiểm tra mã nguồn. Có thể chạy `node scripts/smoke-local.cjs` khi dev server đang bật. Để đối chiếu dữ liệu API với Supabase, chạy `node scripts/verify-data-source.cjs`. Nếu dev báo thiếu file `vendor-chunks` trong `.next`, dừng dev server, chạy `node scripts/clean-next-cache.cjs`, rồi bật lại.

Tài khoản admin local đăng nhập bằng username `superadmin` và mật khẩu mẫu do chủ dự án cung cấp; nhân viên mẫu đăng nhập bằng `nhanvien`, mật khẩu nằm ở biến `STAFF_INITIAL_PASSWORD` trong `.env.local` bị Git bỏ qua. Admin quản lý nhân viên tại `/admin/nhan-vien`. Với môi trường khác, đặt `ADMIN_EMAIL` và `ADMIN_INITIAL_PASSWORD` (tối thiểu 16 ký tự), chạy `npm run prisma:seed` một lần rồi xóa biến mật khẩu khỏi môi trường triển khai. Không dùng tài khoản mẫu cho production.

`npm run build` không tự thay đổi schema hay dữ liệu của database. Tồn kho và tổng tiền đơn hàng được kiểm tra lại phía máy chủ. Khi chạy build trên Windows, hãy dừng `npm run dev` trước để Prisma có thể cập nhật DLL đang được Next.js sử dụng. Sau build có thể bật dev server lại.

## Chuẩn bị bản Preview trên Vercel

Trỏ **Root Directory** về thư mục gốc này và dùng `npm run build`. Tạo riêng các biến môi trường `CONNECTION_STRING`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` và các khóa Cloudinary cần cho tải ảnh. `NEXT_PUBLIC_GA4_ID` và `NEXT_PUBLIC_CLARITY_PROJECT_ID` chỉ điền khi đã có tài khoản đo lường của chính dự án; mã GA4 của repo mẫu không còn được dùng. Không tải `.env` hoặc `.env.local` lên Git/Vercel dưới dạng file.

Trước khi tạo Preview, chọn chuỗi kết nối **Supabase transaction pooler** dành cho serverless, thêm `?schema=tpetie_app&pgbouncer=true&connection_limit=1` (hoặc nối bằng `&` nếu URL đã có query). Giữ một chuỗi kết nối trực tiếp hoặc session pooler riêng cho lệnh migration ngoài Vercel. Migration và seed phải chạy riêng, không gắn vào build. Đặt `NEXTAUTH_URL` khớp URL Preview đang kiểm thử. Chạy thử đăng nhập, catalog, COD, quản trị và tải ảnh trên Preview trước khi xem xét production.

## Xem dữ liệu trên Supabase

Ứng dụng lưu bảng trong schema **`tpetie_app`**, không phải `public`. Ở Supabase **Table Editor**, đổi bộ chọn schema sang `tpetie_app` rồi mở `products`, `collections`, `product_variants`. Nếu dùng **SQL Editor**, chạy:

```sql
select 'products' as table_name, count(*) from tpetie_app.products
union all select 'collections', count(*) from tpetie_app.collections
union all select 'product_variants', count(*) from tpetie_app.product_variants;
```

Kết quả sau lần seed hiện tại là 40 sản phẩm, 4 bộ sưu tập, 271 biến thể. Các bảng `public` có sẵn từ trước được giữ nguyên và chưa có dữ liệu; Supabase Data API chưa được mở cho `tpetie_app` vì ứng dụng truy cập PostgreSQL qua Prisma phía máy chủ.

## Trạng thái tính năng

Trang sản phẩm và bộ sưu tập đọc PostgreSQL với cache ngắn; giỏ hàng lưu cục bộ trên trình duyệt; đặt hàng COD, tra cứu đơn, đăng nhập email/mật khẩu, phân quyền admin/nhân viên, quản lý catalog, xử lý đơn, thống kê và xuất Excel đã có mã triển khai. Google OAuth được giữ chỗ trong giao diện và chỉ có thể bật sau khi cấu hình credentials. Các luồng thanh toán khác và các bảng mở rộng trong thiết kế `db.sql` chưa được triển khai toàn bộ; xem file công việc còn lại để đánh giá trước khi chạy thật.
