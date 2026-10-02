/**
 * Kiểm tra thông tin tài khoản quản trị nhập ở `npm run admin:create`. Hàm thuần để test được.
 * Mỗi hàm validate trả về thông báo lỗi, hoặc null khi hợp lệ.
 */
const PASSWORD_MIN = 16;
const PASSWORD_MAX = 128;

const validateEmail = (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
  ? null : 'Email không hợp lệ.');

const validateUsername = (value) => (/^[a-z][a-z0-9_]{2,31}$/.test(value)
  ? null : 'Tên đăng nhập gồm 3–32 ký tự a-z, 0-9, dấu gạch dưới và bắt đầu bằng chữ cái thường.');

const validateName = (value) => (value.length <= 100 ? null : 'Tên hiển thị tối đa 100 ký tự.');

function validatePassword(value, { username = '', email = '' } = {}) {
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    return `Mật khẩu cần ${PASSWORD_MIN}–${PASSWORD_MAX} ký tự.`;
  }
  const lower = value.toLowerCase();
  if ((username && lower.includes(username)) || (email && lower.includes(email.split('@')[0]))) {
    return 'Mật khẩu không được chứa tên đăng nhập hoặc email.';
  }
  return null;
}

/** Chuẩn hóa và kiểm tra toàn bộ tài khoản; ném lỗi nếu có trường không hợp lệ. */
function normalizeAdminAccount(input) {
  const email = String(input.email ?? '').trim().toLowerCase();
  const username = String(input.username ?? '').trim().toLowerCase();
  const name = String(input.name ?? '').trim() || username;
  const password = String(input.password ?? '');
  const errors = [validateEmail(email), validateUsername(username), validateName(name),
    validatePassword(password, { username, email })].filter(Boolean);
  if (errors.length) throw new Error(errors.join(' '));
  return { email, username, name, password };
}

module.exports = { validateEmail, validateUsername, validateName, validatePassword, normalizeAdminAccount };
