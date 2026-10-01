# T'Petie

Ứng dụng thương mại điện tử Next.js ở thư mục gốc. `archive/legacy-site/` là bản mã nguồn cũ để đối chiếu, bị Git bỏ qua và không tham gia build. Báo cáo, kế hoạch và thiết kế dữ liệu gốc nằm trong `docs/reference/`; file yêu cầu của chủ dự án và [CAN_BAN_BO_SUNG.md](CAN_BAN_BO_SUNG.md) được giữ ở thư mục gốc.

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `src/app` | Định tuyến Next.js: trang server/client và các HTTP Route Handler trong `api/` |
| `src/server` | Backend: kết nối DB, cấu hình đăng nhập, truy vấn catalog, xử lý đơn hàng và giới hạn lượt thử; chỉ chạy trên máy chủ |
| `src/components` | Thành phần giao diện |
| `src/context` | Trạng thái phiên đăng nhập, giỏ hàng, thông báo trong trình duyệt |
| `src/hooks` | React hooks dùng bởi giao diện |
| `src/client` | Cache catalog, trạng thái giỏ và analytics chỉ dùng trong trình duyệt |
| `src/lib` | Quy tắc tính giá thuần, định dạng, hằng số và tiện ích dùng chung |
| `src/types` | Kiểu dữ liệu giao diện và NextAuth |
| `prisma/schema.prisma` | Schema ứng dụng PostgreSQL |
| `prisma/migrations` | Migration schema và nội dung nền tảng; không chứa catalog kinh doanh mẫu |
| `prisma/seed.ts` | Tạo tài khoản admin và nhân viên từ biến môi trường, bỏ qua tài khoản đã tồn tại |
| `public` | Không còn ảnh tĩnh; mọi ảnh nằm trên Cloudinary và quản lý qua bảng `media_assets`, xem [ghi chú ảnh](docs/image-inventory.md) |
| `tests` | Kiểm tra quy tắc bảo mật và giá/tồn kho |
| `docs/reference` | Tài liệu, báo cáo và bản thiết kế ban đầu |
| `archive/legacy-site` | Mã nguồn cũ để tham khảo; không tham gia sản phẩm mới |

## Backend và đường đi dữ liệu

Ứng dụng này là **Next.js full stack**: backend nằm cùng repo, trong `src/app/api` và `src/server`; không có tiến trình Express/Nest riêng. Component có `'use client'` gọi API nội bộ qua HTTP. Route Handler xác thực/kiểm tra đầu vào rồi gọi dịch vụ trong `src/server`, nơi Prisma kết nối Supabase bằng chuỗi kết nối bí mật ở phía máy chủ. Trang Next.js dạng Server Component có thể gọi trực tiếp `src/server` khi render HTML; dữ liệu được truyền vào component trình duyệt qua props. Trình duyệt không nhận chuỗi kết nối DB và không import Prisma.

```text
Trình duyệt → /api/* (src/app/api) → src/server → Prisma → Supabase PostgreSQL
Server Component (src/app) ─────────→ src/server → Prisma → Supabase PostgreSQL
```

Xem [sơ đồ và quy tắc phụ thuộc](docs/architecture.md) để biết chỗ đặt mã mới.

## Chạy tại máy phát triển

1. Dùng Node.js 20 trở lên. Điền `CONNECTION_STRING` vào `.env` (Prisma CLI đọc file này); đặt `NEXTAUTH_URL`, `NEXTAUTH_SECRET` trong `.env.local`. Có thể tham khảo `.env.example`. Mật khẩu và khóa phải giữ ngoài Git. Nếu dùng biến môi trường hệ thống cho Prisma CLI, biến đó sẽ thay thế giá trị trong `.env`.
2. Chạy `npm ci`.
3. Trên máy hiện tại, migration và catalog đã được nạp vào schema Supabase `tpetie_app`; không cần chạy lại để thử. Với database mới: chạy `npx prisma migrate deploy`, `npm run accounts:provision`, rồi nhập catalog qua trang quản trị. Migration tạo danh mục gốc, bảng size và slide giới thiệu nhưng không tạo sản phẩm kinh doanh mẫu. Repo không còn chứa catalog JSON hoặc script seed catalog. Migration đầu tiên chỉ dành cho schema trống.
4. Chạy `npm run dev`, mở `http://localhost:3000`. `npm test` và `npm run build` kiểm tra mã nguồn. Khi dev server đang bật, có thể chạy `node scripts/smoke-local.cjs`, `node scripts/verify-data-source.cjs`, `node scripts/check-commerce.cjs`, `node scripts/check-customer-flow.cjs`, `node scripts/check-order-flow.cjs`, `node scripts/check-new-product-flow.cjs` và `node scripts/check-purchase-review-flow.cjs`. Các script tạo dữ liệu thử sẽ tự dọn trong `finally`. Nếu dev báo thiếu file `vendor-chunks` trong `.next`, dừng dev server, chạy `node scripts/clean-next-cache.cjs`, rồi bật lại.

Tài khoản được tạo bằng `npm run accounts:provision` sau khi đặt `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_NAME` và `ADMIN_INITIAL_PASSWORD` (16–128 ký tự). Nhóm `STAFF_*` là tùy chọn. Lệnh này chỉ tạo tài khoản còn thiếu, không đặt lại mật khẩu tài khoản đã tồn tại. Xóa mật khẩu khởi tạo khỏi môi trường triển khai sau khi tạo và đổi mật khẩu trước khi bán thật. Admin quản lý nhân viên tại `/admin/staff`.

Admin và nhân viên quản lý bộ sưu tập tại `/admin/collections`: tạo, sửa, sắp xếp, bật/tắt trên menu và trang chủ, lưu trữ bộ sưu tập có sản phẩm. Menu khách hàng đọc danh sách đang hoạt động từ API. Feedback khách hàng là ảnh chụp màn hình tin nhắn khách khen shop, quản lý tại `/admin/feedback` (tải nhiều ảnh một lần, chú thích, gắn sản phẩm được khen, thứ tự). Chỉ ảnh đã xác nhận khách đồng ý và bật công bố mới hiển thị: 12 ảnh đầu dạng story ở cuối trang chủ, toàn bộ dạng album tại `/feedback`. Không có feedback giả được nạp sẵn. Bảng size và slide giới thiệu đọc từ bảng `site_content`; migration tạo nội dung ban đầu cho database mới. Chạy `npm run content:check` khi server local đang bật để kiểm tra luồng quản trị, menu và công bố feedback; script tự xóa bản ghi thử.

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

Trang sản phẩm, bộ sưu tập, bảng size, slide giới thiệu, feedback công bố và đánh giá đã duyệt đọc PostgreSQL với cache ngắn; giỏ hàng (món chưa đặt) lưu cục bộ trên trình duyệt, còn **Đơn mua** (`/orders`, đơn đã đặt) đọc trực tiếp từ database theo tài khoản: chia tab theo trạng thái, dòng thời gian đơn, hủy khi chờ xác nhận, "Đã nhận được hàng", mua lại. Chỉ món thuộc đơn đã hoàn tất của chính khách mới được đánh giá (trong 30 ngày, sửa 1 lần, kèm tối đa 5 ảnh, chờ duyệt). Báo giá ở giỏ hàng, mua ngay và thanh toán do API đọc giá, tồn kho, phí giao hàng và coupon trong database rồi tính lại; đặt COD cũng xác minh và trừ tồn kho trong transaction. Admin chỉnh phí giao hàng và mã giảm giá tại `/admin/settings`. Đăng nhập email/mật khẩu, phân quyền admin/nhân viên, quản lý catalog, xử lý đơn, thống kê và xuất Excel đã có mã triển khai. Google OAuth được giữ chỗ trong giao diện và chỉ có thể bật sau khi cấu hình credentials. Các luồng thanh toán khác và các bảng mở rộng trong thiết kế `docs/reference/db.sql` chưa được triển khai toàn bộ; xem file công việc còn lại để đánh giá trước khi chạy thật.
