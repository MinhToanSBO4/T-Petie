/**
 * `npm run admin:create`: tạo tài khoản quản trị bằng cách nhập trực tiếp trong terminal.
 * Tài khoản không đọc từ biến môi trường/.env, mật khẩu không hiện trên màn hình và chỉ lưu dạng bcrypt.
 * Tài khoản nhân viên do quản trị viên tạo trong trang /admin/staff.
 *
 * Database đích lấy từ DIRECT_URL (nếu có) hoặc CONNECTION_STRING trong .env. Muốn tạo trên database production
 * thì trỏ tạm .env tới database đó, hoặc đặt biến ngay trong phiên terminal trước khi chạy lệnh.
 */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { requireInteractiveTerminal, ask, askHidden, askUntilValid } = require('./lib/terminal-prompt.cjs');
const { validateEmail, validateUsername, validateName, validatePassword, normalizeAdminAccount } = require('./lib/admin-account.cjs');

loadEnvConfig(process.cwd());

function databaseTarget() {
  const raw = process.env.DIRECT_URL || process.env.CONNECTION_STRING;
  if (!raw) throw new Error('Thiếu CONNECTION_STRING (hoặc DIRECT_URL) trong .env.');
  const url = new URL(raw);
  return { raw, label: `${url.hostname}:${url.port || 5432} · schema ${url.searchParams.get('schema') || 'public'}` };
}

async function main() {
  requireInteractiveTerminal();
  const target = databaseTarget();
  console.log(`\nTạo tài khoản quản trị trên database: ${target.label}\n`);

  const email = (await askUntilValid('Email: ', (value) => validateEmail(value.toLowerCase()))).toLowerCase();
  const username = (await askUntilValid('Tên đăng nhập: ', (value) => validateUsername(value.toLowerCase()))).toLowerCase();
  const name = await askUntilValid(`Tên hiển thị (Enter để dùng "${username}"): `, validateName);
  let password;
  for (;;) {
    password = await askUntilValid('Mật khẩu (16–128 ký tự, không hiển thị): ',
      (value) => validatePassword(value, { username, email }), { hidden: true });
    if ((await askHidden('Nhập lại mật khẩu: ')) === password) break;
    console.log('  ✖ Hai lần nhập không khớp, nhập lại.');
  }
  const account = normalizeAdminAccount({ email, username, name, password });

  const confirm = await ask(`\nTạo quản trị viên "${account.username}" <${account.email}>? (y/N) `);
  if (!/^(y|yes|c|co|có)$/i.test(confirm.trim())) {
    console.log('Đã hủy, không tạo tài khoản.');
    return;
  }

  const prisma = new PrismaClient({ datasources: { db: { url: target.raw } } });
  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: account.email }, { username: account.username }] }, select: { id: true },
    });
    if (existing) throw new Error('Email hoặc tên đăng nhập đã được dùng. Đổi thông tin khác, hoặc quản lý tài khoản đó trong trang quản trị.');
    await prisma.user.create({ data: {
      email: account.email, username: account.username, name: account.name,
      password: await bcrypt.hash(account.password, 12), role: 'admin', status: 'active', points: 0,
    } });
    console.log(`\n✔ Đã tạo quản trị viên "${account.username}". Đăng nhập tại /login.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : 'Không tạo được tài khoản.'}`);
  process.exitCode = 1;
});
