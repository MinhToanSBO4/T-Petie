/**
 * Kiểm tra luồng xuất Excel bất đồng bộ: kích hoạt trả về ngay, chạy nền,
 * file có đúng thứ tự cột đã chốt và tải được qua API kiểm tra quyền.
 */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const ExcelJS = require('exceljs');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const base = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000');
const cookies = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
const EXPECTED_HEADERS = ['Thời gian', 'Mã đơn', 'Tên khách hàng', 'Số điện thoại', 'Địa chỉ',
  'Sản phẩm (tên + size + số lượng)', 'Tổng tiền (VND)', 'Mã giảm giá', 'Ghi chú', 'Kênh tiếp cận',
  'Trạng thái đơn', 'Số lần mua'];
const EXPECTED_SHEETS = ['Đơn hàng', 'Chi tiết sản phẩm', 'Thanh toán & giao hàng', 'Khách hàng', 'Nhân sự',
  'Sản phẩm & tồn kho', 'Mã giảm giá', 'Đánh giá'];

async function login(username, password) {
  const csrf = await fetch(new URL('/api/auth/csrf', base));
  const response = await fetch(new URL('/api/auth/callback/credentials', base), {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookies(csrf) },
    body: new URLSearchParams({ csrfToken: (await csrf.json()).csrfToken, email: username,
      password, callbackUrl: new URL('/admin', base).toString(), json: 'true' }),
  });
  return [cookies(csrf), cookies(response)].filter(Boolean).join('; ');
}

function assert(condition, message) { if (!condition) throw new Error(message); }

async function main() {
  const suffix = Date.now().toString(36);
  const username = `exportcheck${suffix}`;
  const password = randomBytes(32).toString('base64url');
  let cookie; let accountId; let jobId;
  try {
    const account = await prisma.user.create({ data: { username, email: `${username}@example.invalid`,
      name: 'Export check', password: await bcrypt.hash(password, 12), role: 'admin', status: 'active' } });
    accountId = account.id;
    cookie = await login(username, password);
    const session = await fetch(new URL('/api/auth/session', base), { headers: { cookie } });
    assert((await session.json()).user, 'Could not authenticate export check account.');

    const started = Date.now();
    const trigger = await fetch(new URL('/api/admin/export', base), { method: 'POST',
      headers: { cookie, origin: base.origin } });
    const triggered = await trigger.json();
    assert(trigger.status === 202 && triggered.job?.id, `Export trigger failed: ${trigger.status} ${triggered.error || ''}`);
    jobId = triggered.job.id;
    assert(Date.now() - started < 3000, 'Export trigger did not return immediately.');

    const duplicate = await fetch(new URL('/api/admin/export', base), { method: 'POST', headers: { cookie, origin: base.origin } });
    assert(duplicate.status === 409, 'A second export was allowed while one is running.');

    let job;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const status = await fetch(new URL(`/api/admin/export/${jobId}`, base), { headers: { cookie } });
      job = (await status.json()).job;
      if (job.status === 'completed' || job.status === 'failed') break;
    }
    assert(job?.status === 'completed', `Export job did not complete: ${job?.status} ${job?.error || ''}`);
    // API không được trả đường dẫn file (chứa dữ liệu khách); đường dẫn chỉ nằm trong database.
    assert(!('fileUrl' in job), 'Export API exposes the storage URL.');
    const stored = await prisma.exportJob.findUnique({ where: { id: jobId }, select: { fileUrl: true } });
    assert(stored?.fileUrl?.startsWith('https://res.cloudinary.com/'), 'Export file was not stored on Cloudinary.');

    const download = await fetch(new URL(`/api/admin/export/${jobId}/download`, base), { headers: { cookie } });
    assert(download.status === 200, `Download failed: ${download.status}`);
    const buffer = Buffer.from(await download.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const headers = workbook.worksheets[0].getRow(1).values.slice(1);
    assert(JSON.stringify(headers) === JSON.stringify(EXPECTED_HEADERS),
      `Unexpected headers: ${JSON.stringify(headers)}`);
    const sheets = workbook.worksheets.map((sheet) => sheet.name);
    assert(JSON.stringify(sheets) === JSON.stringify(EXPECTED_SHEETS), `Unexpected tabs: ${JSON.stringify(sheets)}`);

    const anonymous = await fetch(new URL(`/api/admin/export/${jobId}/download`, base));
    assert(anonymous.status === 403, 'Anonymous download was allowed.');

    console.log(`Async export verified: immediate trigger, background processing, ${sheets.length} tabs, ${headers.length} order columns, protected download.`);
  } finally {
    if (jobId) await prisma.exportJob.deleteMany({ where: { id: jobId } });
    if (accountId) await prisma.user.deleteMany({ where: { id: accountId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
