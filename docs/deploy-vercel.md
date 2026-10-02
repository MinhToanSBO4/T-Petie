# Triển khai T'Petie lên Vercel

Frontend và backend nằm chung một ứng dụng Next.js: trang và API (`src/app/api/**`) cùng được Vercel build và chạy dưới dạng Vercel Functions. Database là Supabase PostgreSQL (schema `tpetie_app`, vùng Seoul `ap-northeast-2`), ảnh và file xuất Excel trên Cloudinary.

## 1. Cấu hình có sẵn trong repo

| Tệp | Nội dung |
| --- | --- |
| `vercel.json` | Framework Next.js, `npm ci`, `npm run build`, region **`icn1` (Seoul)** cạnh database Supabase, cron bảo trì `/api/cron/maintenance` lúc 20:00 UTC (03:00 giờ Việt Nam) mỗi ngày. |
| `scripts/build.cjs` | Trên Vercel, kiểm tra biến môi trường trước tiên (`scripts/lib/deploy-env.cjs`): production thiếu/sai cấu hình thì dừng build và in rõ biến nào cần sửa, preview chỉ cảnh báo. Sau đó bản **production** tự chạy `prisma migrate deploy` (qua `DIRECT_URL`); lỗi migration thì dừng build. Bản preview không tự migrate. |
| `package.json` → `engines.node` | Node **22.x** trên Vercel (bản LTS Prisma 5.22 hỗ trợ chính thức). |
| `.vercelignore` | Khi deploy bằng Vercel CLI từ máy local, không gửi `.env`, `.next`, `node_modules` lên Vercel. |
| `src/lib/db/connection-url.ts` | Tự chọn số kết nối Prisma theo môi trường: Vercel + transaction pooler 5 kết nối/instance, session pooler 1 kết nối (kèm cảnh báo), máy chủ chạy lâu 5 kết nối; tự thêm `pgbouncer=true` khi dùng cổng 6543. Ghi `connection_limit`/`pool_timeout` trong chuỗi kết nối để ghi đè. |
| `next.config.mjs` | `next/image` dùng Cloudinary làm loader, không tốn hạn mức Image Optimization của Vercel; header bảo mật (CSP, HSTS…). |
| `src/app/api/admin/export/route.ts` | Xuất Excel chạy nền bằng `waitUntil` của `@vercel/functions`, tối đa 120 giây. |

Region đặt trong `vercel.json` vì mỗi truy vấn database phải đi từ function tới Supabase: function mặc định của Vercel chạy ở Washington (`iad1`), cách Seoul hơn 150 ms mỗi lượt; đặt `icn1` thì chỉ còn vài mili giây. Gói Hobby được chọn một region.

## 2. Lấy chuỗi kết nối Supabase

Supabase Dashboard → **Connect** → mục *Connection pooling*:

- **Transaction pooler** (cổng **6543**) → `CONNECTION_STRING`, thêm `?schema=tpetie_app&pgbouncer=true`.
- **Session pooler** (cổng **5432**) → `DIRECT_URL`, thêm `?schema=tpetie_app`. Prisma CLI dùng chuỗi này để migrate (transaction pooler không hỗ trợ khóa và prepared statement mà migration cần).

```env
CONNECTION_STRING="postgresql://postgres.<ref>:<mật-khẩu>@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?schema=tpetie_app&pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<mật-khẩu>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?schema=tpetie_app"
```

SQL viết tay trong ứng dụng luôn ghi rõ schema (`src/server/db/sql.ts`), vì qua transaction pooler mỗi giao dịch có thể chạy trên một kết nối chưa đặt `search_path`.

## 2b. Tạo cấu trúc database production (chỉ cấu trúc, không dữ liệu)

Làm **trước lần deploy production đầu tiên**. Nếu deploy trước với database production trống, bước `prisma migrate deploy` lúc build sẽ chạy toàn bộ migration và chèn dữ liệu mẫu (mã giảm giá `TPETIE20`/`MEMBERVIP`, phí giao hàng, nội dung trang, danh mục).

1. Supabase production → **Connect** → copy chuỗi **Session pooler** (cổng 5432), thêm `?schema=tpetie_app`.
2. Trên máy local (`.env` vẫn trỏ database test), chạy trong PowerShell/cmd/terminal VS Code: `npm run db:clone-structure`, dán chuỗi ở bước 1 (không hiện trên màn hình, không lưu), gõ tên schema để xác nhận.
3. Script dừng ngay, không ghi gì nếu: database test chưa áp đủ migration, chuỗi đích là transaction pooler 6543, đích trùng nguồn, hoặc **schema đích đã có bất kỳ bảng nào**. Nếu hợp lệ: tạo 20 bảng + index + khóa ngoại trong một transaction, đánh dấu 16 migration là đã áp dụng (bảng `_prisma_migrations`), rồi kiểm tra cấu trúc khớp database test và mọi bảng đều trống.
   Kiểm tra lại bất cứ lúc nào (chỉ đọc, không ghi gì): `npm run db:verify-structure` — so cấu trúc production với database test, lịch sử migration, số dòng từng bảng, region.
4. Sau đó: tạo quản trị viên bằng `npm run admin:create` (tạm trỏ `DIRECT_URL` trong `.env` tới production), đăng nhập, vào `/admin/settings` nhập **phí giao hàng** (chưa nhập thì khách chưa đặt hàng được), thêm sản phẩm/bộ sưu tập, nội dung trang tại `/admin/content`. Danh mục gốc tự tạo khi thêm sản phẩm đầu tiên.

Các lần deploy sau, `prisma migrate deploy` chỉ chạy migration mới thêm.

## 3. Tạo project trên Vercel

1. **Add New → Project**, chọn repo. Vercel đọc `vercel.json` (không cần sửa Build/Install Command).
2. **Settings → Environment Variables**, khai báo cho *Production* (và *Preview* nếu dùng). Chỉ thêm các biến trong bảng; **không dán nguyên file `.env` local** (có các biến không dùng như `HOST`, `PORT`, `USER`, `DB_PASSWORD`, `CDN_URL`, `FOLDER_MODE`; `PORT`/`USER` còn trùng tên biến hệ thống). **Không** thêm biến tài khoản `ADMIN_*`/`STAFF_*`: build production sẽ dừng nếu thấy chúng.

| Biến | Giá trị |
| --- | --- |
| `CONNECTION_STRING` | Transaction pooler 6543 như trên |
| `DIRECT_URL` | Session pooler 5432 như trên |
| `NEXTAUTH_URL` | Domain chính thức, ví dụ `https://tpetie.vn` (chỉ khai báo cho *Production*; preview tự dùng URL của bản preview) |
| `NEXTAUTH_SECRET` | Chuỗi mới: `openssl rand -base64 32` (không dùng lại khóa local) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Khóa Cloudinary |
| `CRON_SECRET` | Chuỗi ngẫu nhiên ≥ 16 ký tự (`openssl rand -hex 24`); Vercel gửi kèm khi gọi cron |
| `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Tùy chọn |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Chỉ khi bật đăng nhập Google |
| `MIGRATE_ON_BUILD` | Tùy chọn: `0` tắt tự migrate, `1` bật cả cho preview (chỉ khi preview có database riêng) |

3. **Deploy**. Log build lần lượt có: cảnh báo/lỗi biến môi trường (nếu có), `prisma migrate deploy`, rồi `next build`.
   Kiểm tra trước trên máy: `vercel env pull .env.production.local` rồi `npm run env:check -- --production` (xóa file đó sau khi kiểm tra).
4. Gắn domain, đặt lại `NEXTAUTH_URL` đúng domain rồi redeploy.
5. Tài khoản quản trị: database hiện tại đã có tài khoản thì dùng luôn. Database mới: trên máy local, trỏ `CONNECTION_STRING`/`DIRECT_URL` trong `.env` tới database production rồi chạy `npm run admin:create` trong PowerShell/cmd/terminal VS Code. Lệnh hỏi email, tên đăng nhập, tên hiển thị, mật khẩu (không hiện trên màn hình), in ra database đích và hỏi xác nhận trước khi tạo. Tài khoản **không** nằm trong `.env` hay biến môi trường Vercel. Nhân viên do admin tạo tại `/admin/staff`; mật khẩu đổi tại `/admin/account`.

## 4. Kiểm tra sau khi deploy

- `https://<domain>/api/products?limit=1` trả JSON có `total`.
- Đăng nhập `/login` bằng tài khoản admin, mở `/admin/orders`, `/admin/products`. Tài khoản nhân viên đăng nhập phải vào `/staff` (trang chủ nhắc việc) và mở được `/staff/orders`.
- Đặt một đơn thử ở trang khách, đổi trạng thái ở `/admin/orders` (thử "Chuyển tới…" và "Hoàn tác"), rồi hủy đơn thử.
- Gọi thử cron: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/maintenance` trả `completedOrders`, `failedExports`, `expiredRateLimits`. Không có header thì trả 401.
- Vercel → **Logs**: không có `Timed out fetching a new connection` hay cảnh báo `[database] ... session pooler`.

## 5. Supabase, CDN và độ ổn định

- **Supabase**: ứng dụng truy cập PostgreSQL qua Prisma phía máy chủ (không dùng Supabase Data API/khóa anon). Vào *Database → Network restrictions* nếu đã giới hạn IP thì phải cho phép mọi IP (Vercel không có IP cố định ở gói Hobby/Pro). Nếu đổi mật khẩu database thì cập nhật cả `CONNECTION_STRING` và `DIRECT_URL` trên Vercel rồi redeploy. Project Supabase gói Free tự tạm dừng sau 7 ngày không có truy vấn: cron hằng ngày giữ database hoạt động.
- **Kết nối**: function và database cùng ở Seoul (`icn1` / `ap-northeast-2`). Transaction pooler (6543) cho ứng dụng, mỗi instance tối đa 5 kết nối, chờ tối đa 20 giây; session pooler (5432) chỉ cho migration.
- **CDN ảnh**: ảnh sản phẩm, bộ sưu tập, feedback lưu trên Cloudinary và phục vụ qua CDN `res.cloudinary.com`; `next/image` sinh URL Cloudinary đúng kích thước hiển thị, định dạng `f_auto` và chất lượng nén theo từng ảnh (không dùng Image Optimization của Vercel). Không cần biến `CDN_URL`.
- **CDN Vercel**: JS/CSS/font trong `/_next/static` được Vercel cache lâu dài trên Edge; trang tĩnh được cache và làm mới khi deploy.
- **Đổi `NEXTAUTH_SECRET`** làm mọi phiên đăng nhập hiện tại hết hạn (mọi người phải đăng nhập lại).

## 6. Giới hạn cần biết

- **Cron gói Hobby** chỉ chạy 1 lần/ngày và có thể lệch trong vòng một giờ. Ứng dụng vẫn tự hoàn tất đơn giao quá hạn và đánh dấu tiến trình xuất bị treo khi có người mở trang quản trị, cron chỉ bảo đảm việc này cả khi không ai vào.
- **Body request tối đa 4,5 MB**: ảnh đánh giá và ảnh feedback được nén ở trình duyệt trước khi tải; thư viện media nhận tối đa 5 MB/ảnh nên ảnh gốc rất lớn cần nén trước.
- **Thời gian chạy function**: gói Hobby tối đa 300 giây (Fluid compute). Xuất Excel đặt 120 giây; dữ liệu rất lớn nên chuyển sang hàng đợi (Vercel Queues/Workflow).
- **Bộ nhớ đệm phiên đăng nhập** giữ thông tin tài khoản 15 giây trên mỗi instance: khóa tài khoản có hiệu lực ngay trên instance xử lý thao tác đó, các instance khác chậm tối đa 15 giây.
- `npm audit` còn cảnh báo với `next@14.2.x` mà bản sửa nằm ở Next 16 — nên lên kế hoạch nâng cấp Next.js.

## 7. Tham khảo

- Vercel: [vercel.json](https://vercel.com/docs/project-configuration/vercel-json), [giới hạn Functions](https://vercel.com/docs/functions/limitations), [Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [@vercel/functions](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
- Prisma + Supabase: [Prisma docs](https://www.prisma.io/docs/orm/overview/databases/supabase), [Supabase docs](https://supabase.com/docs/guides/database/prisma), [Supavisor + Prisma](https://supabase.github.io/supavisor/orms/prisma/)
