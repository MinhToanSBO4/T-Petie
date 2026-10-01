/**
 * Chạy trước `npm run dev`: đưa database và Prisma Client khớp với prisma/schema.prisma, để không gặp lỗi
 * "Unknown field ... for select statement" khi schema vừa đổi mà database/client chưa cập nhật.
 * 1. Áp dụng các migration chưa chạy (`prisma migrate deploy`, không bao giờ xóa dữ liệu hay reset).
 * 2. Chỉ generate lại client khi schema khác bản client đang dùng. Trên Windows, client không ghi đè được
 *    khi một dev server khác đang chạy (file engine bị khóa), nên bỏ qua bước này khi client đã khớp.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
// Lệnh cố định trong script này (không nhận tham số từ ngoài) nên chạy qua shell để tìm được npx trên Windows.
const run = (args) => spawnSync(`npx prisma ${args.join(' ')}`, { cwd: root, stdio: 'inherit', shell: true }).status === 0;
const normalize = (file) => fs.readFileSync(file, 'utf8').replace(/\s+/g, '');

function clientMatchesSchema() {
  const generated = path.join(root, 'node_modules', '.prisma', 'client', 'schema.prisma');
  if (!fs.existsSync(generated)) return false;
  // Prisma lưu bản schema đã định dạng lại kèm client: so sánh bỏ qua khoảng trắng.
  return normalize(path.join(root, 'prisma', 'schema.prisma')) === normalize(generated);
}

if (!run(['migrate', 'deploy'])) {
  console.error('\n✖ Không áp dụng được migration. Kiểm tra kết nối database (CONNECTION_STRING trong .env) rồi chạy lại.\n');
  process.exit(1);
}

if (clientMatchesSchema()) {
  console.log('✔ Prisma Client đã khớp với schema.');
} else if (!run(['generate'])) {
  console.error('\n✖ Không cập nhật được Prisma Client. Thường do một dev server khác đang chạy và khóa file engine:'
    + '\n  dừng mọi dev server đang chạy (Ctrl+C ở cửa sổ đó) rồi chạy lại `npm run dev`.\n');
  process.exit(1);
}
