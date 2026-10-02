/**
 * `npm run build` (chạy sau `prisma generate`).
 * - Trên Vercel, bản production áp migration còn thiếu trước khi build (`prisma migrate deploy` qua DIRECT_URL, không
 *   bao giờ xóa dữ liệu). Bản preview không tự migrate để nhánh đang thử không đổi database dùng chung; đặt
 *   MIGRATE_ON_BUILD=1 nếu preview có database riêng, hoặc MIGRATE_ON_BUILD=0 để tắt hẳn.
 * - Trên Windows nạp thêm bản vá readlink cho ổ exFAT của máy phát triển.
 */
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const root = join(__dirname, '..');

// Trên Vercel: kiểm tra biến môi trường trước tiên, để thiếu/sai cấu hình báo ngay ở log build thay vì lỗi lúc chạy.
// Bản production dừng build khi có lỗi; bản preview chỉ cảnh báo.
if (process.env.VERCEL === '1') {
  const { checkDeployEnvironment } = require('./lib/deploy-env.cjs');
  const production = process.env.VERCEL_ENV === 'production';
  const { errors, warnings } = checkDeployEnvironment(process.env, { production, vercel: true });
  for (const warning of warnings) console.warn(`⚠ ${warning}`);
  for (const error of errors) console[production ? 'error' : 'warn'](`${production ? '✖' : '⚠'} ${error}`);
  if (production && errors.length) {
    console.error('\n✖ Cấu hình biến môi trường chưa đủ cho production (Vercel → Settings → Environment Variables).\n');
    process.exit(1);
  }
}

const flag = process.env.MIGRATE_ON_BUILD;
const migrate = flag === '1' || (flag !== '0' && process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production');

if (migrate) {
  if (!process.env.DIRECT_URL) {
    console.error('\n✖ Thiếu DIRECT_URL: migration cần kết nối session pooler (cổng 5432) hoặc kết nối trực tiếp tới database.\n');
    process.exit(1);
  }
  const prismaCli = join(root, 'node_modules', 'prisma', 'build', 'index.js');
  const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('\n✖ Không áp dụng được migration, dừng build để không triển khai mã mới trên database cũ.\n');
    process.exit(result.status ?? 1);
  }
}

const env = { ...process.env };
if (process.platform === 'win32') {
  const shim = join(__dirname, 'windows-readlink-workaround.cjs');
  env.NODE_OPTIONS = [env.NODE_OPTIONS, `--require=${shim}`].filter(Boolean).join(' ');
}
const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
  stdio: 'inherit', env,
});
process.exit(result.status ?? 1);
