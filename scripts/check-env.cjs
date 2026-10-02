/**
 * `npm run env:check` kiểm tra .env local; `npm run env:check -- --production` kiểm tra theo yêu cầu production
 * (đọc thêm .env.production / .env.production.local, ví dụ file tạo bởi `vercel env pull .env.production.local`).
 * Trên Vercel, scripts/build.cjs gọi cùng bộ kiểm tra này trước khi build.
 */
const { loadEnvConfig } = require('@next/env');
const { checkDeployEnvironment } = require('./lib/deploy-env.cjs');

const production = process.argv.includes('--production');
loadEnvConfig(process.cwd(), !production);

const { errors, warnings } = checkDeployEnvironment(process.env, { production, vercel: production });
for (const warning of warnings) console.warn(`⚠ ${warning}`);
for (const error of errors) console.error(`✖ ${error}`);
if (errors.length) process.exitCode = 1;
else console.log(`✔ Biến môi trường hợp lệ${production ? ' cho production' : ''}.`);
