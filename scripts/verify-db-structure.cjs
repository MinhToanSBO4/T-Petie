/**
 * `npm run db:verify-structure`: kiểm tra CHỈ ĐỌC database production so với database test (.env).
 * Không ghi, không sửa gì ở cả hai database. Kết quả không in mật khẩu nên có thể gửi lại để rà soát.
 *
 * Kiểm tra: cấu trúc bảng/cột/index/khóa ngoại trùng database test; lịch sử migration đầy đủ (bản build Vercel
 * sẽ không chạy lại migration); số dòng từng bảng; region khớp Vercel (icn1 = ap-northeast-2).
 * Chuỗi production: nhập ẩn khi chạy, hoặc TARGET_DATABASE_URL trong phiên terminal.
 */
const { readdirSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const { runPrisma, describeDatabase, parseTarget, sourceDatabase, targetDatabaseUrl, quoteIdent } = require('./lib/db-target.cjs');

const root = join(__dirname, '..');
loadEnvConfig(root);

let failures = 0;
const ok = (text) => console.log(`✔ ${text}`);
const warn = (text) => console.log(`⚠ ${text}`);
const fail = (text) => { failures += 1; console.log(`✖ ${text}`); };

async function main() {
  const { raw: sourceRaw, url: source } = sourceDatabase();
  const target = parseTarget(await targetDatabaseUrl(), source, { allowSame: process.argv.includes('--allow-same') });
  const targetRaw = target.toString();
  const schema = target.searchParams.get('schema');
  console.log(`\nNguồn (test):      ${describeDatabase(sourceRaw)}`);
  console.log(`Đích (production): ${describeDatabase(targetRaw)}\n`);

  if (target.username === source.username && target.hostname === source.hostname) {
    warn('Production và test nằm cùng một project Supabase: nên tách project để thao tác thử không ảnh hưởng dữ liệu thật.');
  }
  if (/ap-northeast-2/.test(target.hostname)) ok('Region Seoul (ap-northeast-2), khớp region function Vercel icn1.');
  else warn(`Host ${target.hostname} không phải ap-northeast-2: đổi "regions" trong vercel.json cho cùng region database.`);

  const db = new PrismaClient({ datasources: { db: { url: targetRaw } } });
  try {
    // Chỉ đọc: mọi truy vấn chạy trong transaction READ ONLY.
    const { tables, counts, migrations, version } = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const [{ version }] = await tx.$queryRawUnsafe("SELECT current_setting('server_version') AS version");
      const tables = (await tx.$queryRawUnsafe(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`, schema))
        .map((row) => row.table_name);
      // Đếm mọi bảng trong một truy vấn (mỗi lượt qua pooler mất vài chục ms).
      const counts = {};
      if (tables.length) {
        const rows = await tx.$queryRawUnsafe(tables.map((table, index) => `SELECT ${index} AS i, count(*)::int AS count FROM `
          + `${quoteIdent(schema)}.${quoteIdent(table)}`).join(' UNION ALL '));
        for (const row of rows) counts[tables[row.i]] = row.count;
      }
      const migrations = tables.includes('_prisma_migrations') ? await tx.$queryRawUnsafe(
        `SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back
         FROM ${quoteIdent(schema)}."_prisma_migrations" ORDER BY migration_name`) : [];
      return { tables, counts, migrations, version };
    }, { maxWait: 20_000, timeout: 60_000 });
    console.log(`  PostgreSQL ${version}`);

    if (!tables.length) {
      fail(`Schema "${schema}" chưa có bảng nào: chạy \`npm run db:clone-structure\` trước khi deploy.`);
      return;
    }
    const appTables = tables.filter((table) => table !== '_prisma_migrations');
    ok(`Schema "${schema}" có ${appTables.length} bảng ứng dụng.`);

    // Cấu trúc so với database test.
    const diff = runPrisma(['migrate', 'diff', '--from-url', targetRaw, '--to-url', sourceRaw, '--exit-code'], { capture: true });
    if (diff.status === 0) ok('Cấu trúc (bảng, cột, kiểu, mặc định, index, khóa ngoại) trùng khớp database test.');
    else if (diff.status === 2) fail(`Cấu trúc khác database test. Những gì cần đổi ở production để giống test:\n${diff.stdout.trim().replace(/^/gm, '    ')}`);
    else fail(`Không so sánh được cấu trúc: ${(diff.stderr || diff.stdout).trim().split('\n').slice(-3).join(' ')}`);

    // Lịch sử migration: bản build production chạy `prisma migrate deploy`.
    const local = readdirSync(join(root, 'prisma', 'migrations'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(root, 'prisma', 'migrations', entry.name, 'migration.sql')))
      .map((entry) => entry.name);
    const applied = new Set(migrations.filter((row) => row.finished && !row.rolled_back).map((row) => row.migration_name));
    const missing = local.filter((name) => !applied.has(name));
    const broken = migrations.filter((row) => !row.finished || row.rolled_back).map((row) => row.migration_name);
    if (broken.length) fail(`Migration lỗi/chưa xong trong _prisma_migrations: ${broken.join(', ')}.`);
    if (missing.length) {
      fail(`${missing.length}/${local.length} migration chưa ghi nhận ở production (${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ', …' : ''}): `
        + 'bản build Vercel sẽ chạy lại chúng (lỗi vì bảng đã có, hoặc chèn dữ liệu mẫu).');
    } else if (!broken.length) {
      ok(`Đủ ${local.length}/${local.length} migration đã ghi nhận: bản build Vercel sẽ báo "No pending migrations".`);
    }

    // Dữ liệu.
    const withData = appTables.filter((table) => counts[table] > 0);
    console.log('\n  Số dòng từng bảng:');
    for (const table of appTables) console.log(`    ${table.padEnd(26)} ${counts[table]}`);
    if (!withData.length) ok('Mọi bảng ứng dụng đều trống: không có dữ liệu test bị chép sang.');
    else {
      const demoCoupons = counts.coupons > 0 ? ' (bảng coupons có dữ liệu: kiểm tra mã mẫu TPETIE20/MEMBERVIP trong /admin/settings)' : '';
      warn(`${withData.length} bảng đã có dữ liệu: ${withData.join(', ')}${demoCoupons}.`);
    }
    if (!counts.users || counts.users === 0) warn('Chưa có tài khoản nào: tạo quản trị viên bằng `npm run admin:create`.');
    if (!counts.commerce_settings) warn('Chưa có phí giao hàng: sau khi đăng nhập admin, nhập tại /admin/settings (chưa có thì khách chưa đặt hàng được).');
  } finally {
    await db.$disconnect();
  }
}

main()
  .then(() => {
    console.log(failures ? `\n✖ ${failures} mục cần sửa trước khi deploy.` : '\n✔ Database production sẵn sàng cho deploy.');
    if (failures) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(`\n✖ ${error instanceof Error ? error.message : 'Không kiểm tra được database.'}`);
    process.exitCode = 1;
  });
