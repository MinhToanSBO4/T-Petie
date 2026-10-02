/** Đọc và mô tả chuỗi kết nối database đích (production) dùng chung cho các script chép/kiểm tra cấu trúc. */
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { isInteractive, askHidden } = require('./terminal-prompt.cjs');

const root = join(__dirname, '..', '..');
const prismaCli = join(root, 'node_modules', 'prisma', 'build', 'index.js');

/** Chạy Prisma CLI với datasource trỏ tới `url` (nếu có). */
function runPrisma(args, { url, capture = false } = {}) {
  const env = { ...process.env, ...(url ? { CONNECTION_STRING: url, DIRECT_URL: url } : {}) };
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root, env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', maxBuffer: 64 * 1024 * 1024,
  });
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

/** Mô tả database mà không lộ mật khẩu. */
function describeDatabase(raw) {
  const url = new URL(raw);
  const project = url.username.includes('.') ? url.username.split('.').slice(1).join('.') : url.username;
  return `${url.hostname}:${url.port || 5432}${url.pathname} · project ${project} · schema ${url.searchParams.get('schema')}`;
}

function parseTarget(raw, source, { allowSame = false } = {}) {
  let url;
  try { url = new URL(raw.trim()); } catch { throw new Error('Chuỗi kết nối đích không hợp lệ.'); }
  if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error('Chuỗi kết nối đích phải bắt đầu bằng postgresql://');
  if (url.port === '6543' || url.searchParams.get('pgbouncer') === 'true') {
    throw new Error('Dùng session pooler (cổng 5432) hoặc kết nối trực tiếp cho database đích, không dùng transaction pooler 6543.');
  }
  // Giữ cùng tên schema với database test nếu chuỗi đích không ghi.
  if (!url.searchParams.get('schema')) url.searchParams.set('schema', source.searchParams.get('schema') || 'public');
  const sameDatabase = url.hostname === source.hostname && url.pathname === source.pathname
    && url.username === source.username && url.searchParams.get('schema') === source.searchParams.get('schema');
  if (sameDatabase && !allowSame) throw new Error('Database đích trùng database nguồn.');
  return url;
}

/** Chuỗi kết nối database test từ .env (DIRECT_URL hoặc CONNECTION_STRING). */
function sourceDatabase() {
  const raw = process.env.DIRECT_URL || process.env.CONNECTION_STRING;
  if (!raw) throw new Error('Thiếu CONNECTION_STRING của database test trong .env.');
  const url = new URL(raw);
  if (!url.searchParams.get('schema')) throw new Error('CONNECTION_STRING của database test cần tham số ?schema=.');
  return { raw, url };
}

/** Chuỗi kết nối production: TARGET_DATABASE_URL trong phiên terminal, hoặc nhập ẩn. */
async function targetDatabaseUrl() {
  if (process.env.TARGET_DATABASE_URL) return process.env.TARGET_DATABASE_URL;
  if (!isInteractive()) throw new Error('Cần terminal tương tác để nhập chuỗi kết nối database production (hoặc đặt TARGET_DATABASE_URL).');
  return askHidden('Chuỗi kết nối database PRODUCTION (session pooler 5432, không hiển thị): ');
}

const quoteIdent = (name) => `"${name.replaceAll('"', '""')}"`;

module.exports = { runPrisma, describeDatabase, parseTarget, sourceDatabase, targetDatabaseUrl, quoteIdent };
