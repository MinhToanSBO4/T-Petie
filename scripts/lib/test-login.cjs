/**
 * Tài khoản dùng cho các script kiểm thử (check-*, smoke-local, measure-admin): nhập trong terminal khi chạy,
 * không đọc từ .env. Mỗi vai trò chỉ hỏi một lần trong một lần chạy.
 */
const { isInteractive, requireInteractiveTerminal, ask, askHidden } = require('./terminal-prompt.cjs');

const LABELS = { admin: 'quản trị', staff: 'nhân viên' };
const cache = new Map();

/**
 * Trả về { username, password } của vai trò. Với `optional`, bỏ trống tên đăng nhập (hoặc không có terminal
 * tương tác) thì trả về null để script bỏ qua phần kiểm tra cần đăng nhập.
 */
async function loginCredentials(role, { optional = false } = {}) {
  if (cache.has(role)) return cache.get(role);
  if (optional && !isInteractive()) return null;
  requireInteractiveTerminal();
  const hint = optional ? ' (Enter để bỏ qua)' : '';
  const username = (await ask(`Tên đăng nhập tài khoản ${LABELS[role]}${hint}: `)).trim();
  const credentials = username ? { username, password: await askHidden(`Mật khẩu tài khoản ${LABELS[role]}: `) } : null;
  if (!credentials && !optional) throw new Error(`Cần tài khoản ${LABELS[role]} để chạy kiểm tra này.`);
  cache.set(role, credentials);
  return credentials;
}

module.exports = { loginCredentials };
