/**
 * `npm run db:clone-structure`: chép CẤU TRÚC database test (bảng, cột, khóa, index, khóa ngoại) sang database
 * production. KHÔNG chép dữ liệu và KHÔNG ghi vào database đích nếu schema đích đã có bất kỳ bảng nào.
 *
 * Nguồn: DIRECT_URL hoặc CONNECTION_STRING trong .env (database test).
 * Đích: nhập trong terminal (không lưu), dùng session pooler 5432 hoặc kết nối trực tiếp của Supabase production.
 *   Chạy không tương tác (CI/kiểm thử): đặt TARGET_DATABASE_URL trong phiên terminal và thêm cờ --yes.
 *
 * Các bước:
 * 1. Database nguồn phải đã áp đủ migration trong prisma/migrations.
 * 2. Schema đích phải trống (chưa có bảng nào), nếu không dừng ngay, không ghi gì.
 * 3. Sinh DDL từ cấu trúc thật của database nguồn (`prisma migrate diff --from-empty --to-url`), từ chối nếu có
 *    câu lệnh ghi/xóa dữ liệu.
 * 4. Chạy DDL trong MỘT transaction ở database đích: lỗi giữa chừng thì không còn lại gì.
 * 5. Đánh dấu các migration là đã áp dụng (bảng _prisma_migrations) để bản build production trên Vercel không chạy
 *    lại migration (vốn có câu lệnh chèn dữ liệu mẫu: mã giảm giá, cấu hình, danh mục).
 * 6. Kiểm tra cấu trúc đích trùng khớp nguồn và mọi bảng đều trống.
 */
const { mkdtempSync, readdirSync, rmSync, writeFileSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const { ask } = require('./lib/terminal-prompt.cjs');
const { runPrisma: prisma, describeDatabase: describe, parseTarget, sourceDatabase, targetDatabaseUrl, quoteIdent } = require('./lib/db-target.cjs');

const root = join(__dirname, '..');
loadEnvConfig(root);
const autoConfirm = process.argv.includes('--yes');

async function main() {
  const { raw: sourceRaw, url: source } = sourceDatabase();
  const target = parseTarget(await targetDatabaseUrl(), source);
  const schema = target.searchParams.get('schema');
  console.log(`\nNguồn (test):      ${describe(sourceRaw)}`);
  console.log(`Đích (production): ${describe(target.toString())}\n`);

  // 1. Nguồn đã áp đủ migration.
  const status = prisma(['migrate', 'status'], { url: sourceRaw, capture: true });
  if (status.status !== 0 || !/Database schema is up to date/.test(status.stdout)) {
    throw new Error(`Database test chưa áp đủ migration, chạy \`npm run dev\` hoặc \`npx prisma migrate deploy\` trước.\n${status.stdout}${status.stderr}`);
  }
  const migrations = readdirSync(join(root, 'prisma', 'migrations'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, 'prisma', 'migrations', entry.name, 'migration.sql')))
    .map((entry) => entry.name).sort();

  // 2. Schema đích phải trống. Chỉ đọc, chưa ghi gì.
  const targetDb = new PrismaClient({ datasources: { db: { url: target.toString() } } });
  try {
    const tables = await targetDb.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`, schema);
    if (tables.length) {
      throw new Error(`Schema "${schema}" ở database đích đã có ${tables.length} bảng (${tables.slice(0, 8).map((row) => row.table_name).join(', ')}${tables.length > 8 ? ', …' : ''}). `
        + 'Script chỉ chạy trên schema trống và không ghi đè dữ liệu có sẵn. Không có gì bị thay đổi.');
    }
  } finally {
    await targetDb.$disconnect();
  }

  // 3. DDL từ cấu trúc thật của database test.
  const diff = prisma(['migrate', 'diff', '--from-empty', '--to-url', sourceRaw, '--script'], { capture: true });
  if (diff.status !== 0 || !/CREATE TABLE/.test(diff.stdout)) throw new Error(`Không sinh được DDL từ database test.\n${diff.stderr}`);
  const ddl = diff.stdout;
  const statements = ddl.split(';').map((part) => part.replace(/--[^\n]*\n/g, '').trim()).filter(Boolean);
  const unsafe = statements.filter((statement) => !/^(CREATE (TABLE|UNIQUE INDEX|INDEX|TYPE)|ALTER TABLE "[^"]+" ADD CONSTRAINT)\b/i.test(statement));
  if (unsafe.length) throw new Error(`DDL có câu lệnh ngoài tạo cấu trúc, dừng lại:\n${unsafe.slice(0, 3).join(';\n')}`);
  const tableCount = statements.filter((statement) => /^CREATE TABLE/i.test(statement)).length;
  console.log(`Sẽ tạo ${tableCount} bảng, ${statements.length - tableCount} index/khóa trong schema "${schema}". Không chép dữ liệu.`);
  console.log(`Sau đó đánh dấu ${migrations.length} migration là đã áp dụng (không chạy nội dung migration).\n`);

  if (!autoConfirm) {
    const answer = await ask(`Gõ tên schema "${schema}" để xác nhận tạo cấu trúc trên database PRODUCTION: `);
    if (answer.trim() !== schema) { console.log('Đã hủy, không thay đổi gì.'); return; }
  }

  // 4. Chạy DDL trong một transaction.
  const dir = mkdtempSync(join(tmpdir(), 'tpetie-schema-'));
  try {
    const file = join(dir, 'structure.sql');
    writeFileSync(file, `BEGIN;\nCREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)};\nSET LOCAL search_path TO ${quoteIdent(schema)};\n${ddl}\nCOMMIT;\n`);
    const applied = prisma(['db', 'execute', '--url', target.toString(), '--file', file], { capture: true });
    if (applied.status !== 0) throw new Error(`Tạo cấu trúc thất bại, transaction đã hủy.\n${applied.stderr || applied.stdout}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log('✔ Đã tạo cấu trúc bảng.');

  // 5. Ghi lịch sử migration (chỉ bảng _prisma_migrations).
  for (const name of migrations) {
    const resolved = prisma(['migrate', 'resolve', '--applied', name], { url: target.toString(), capture: true });
    if (resolved.status !== 0) throw new Error(`Không đánh dấu được migration ${name}.\n${resolved.stderr || resolved.stdout}`);
  }
  console.log(`✔ Đã đánh dấu ${migrations.length} migration là đã áp dụng.`);

  // 6. Kiểm tra lại.
  const compare = prisma(['migrate', 'diff', '--from-url', target.toString(), '--to-url', sourceRaw, '--exit-code'], { capture: true });
  if (compare.status !== 0) throw new Error(`Cấu trúc đích khác nguồn:\n${compare.stdout}${compare.stderr}`);
  const targetStatus = prisma(['migrate', 'status'], { url: target.toString(), capture: true });
  if (!/Database schema is up to date/.test(targetStatus.stdout)) throw new Error(`Trạng thái migration đích chưa đúng:\n${targetStatus.stdout}`);
  const verifyDb = new PrismaClient({ datasources: { db: { url: target.toString() } } });
  try {
    const tables = await verifyDb.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name <> '_prisma_migrations'`, schema);
    let rows = 0;
    for (const { table_name: table } of tables) {
      const [{ count }] = await verifyDb.$queryRawUnsafe(`SELECT count(*)::int AS count FROM ${quoteIdent(schema)}.${quoteIdent(table)}`);
      rows += count;
    }
    if (rows !== 0) throw new Error(`Database đích có ${rows} dòng dữ liệu, không như mong đợi.`);
    console.log(`✔ Cấu trúc trùng khớp database test, ${tables.length} bảng đều trống, migration status: up to date.`);
  } finally {
    await verifyDb.$disconnect();
  }
  console.log('\nTiếp theo: `npm run admin:create` (trỏ tới database production) để tạo quản trị viên, rồi vào /admin/settings nhập phí giao hàng.');
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : 'Không chép được cấu trúc database.'}`);
  process.exitCode = 1;
});
