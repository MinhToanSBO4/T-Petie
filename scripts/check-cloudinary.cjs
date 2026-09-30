/**
 * Kiểm tra nhanh thông tin đăng nhập Cloudinary trong .env mà không in secret ra màn hình.
 * Chạy: node --env-file=.env scripts/check-cloudinary.cjs
 */
const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || '';
const key = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY || '';
const secret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET || '';

const mask = (value) => (value.length > 6 ? `${value.slice(0, 3)}…${value.slice(-2)}` : '(thiếu)');
console.log(`cloud: ${cloud || '(thiếu)'} | api key: ${mask(key)} | secret: ${mask(secret)} (${secret.length} ký tự)`);
if (/\s|["']/.test(key + secret)) console.log('Cảnh báo: key/secret có khoảng trắng hoặc dấu nháy thừa.');

fetch(`https://api.cloudinary.com/v1_1/${cloud}/ping`, {
  headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
}).then(async (response) => {
  if (response.ok) return console.log('OK: Cloudinary chấp nhận cặp key/secret này.');
  console.log(`Lỗi ${response.status}: ${(await response.text()).slice(0, 200)}`);
  process.exitCode = 1;
});
