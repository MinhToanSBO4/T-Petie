/**
 * Kiểm tra biến môi trường trước khi triển khai. Hàm thuần (nhận env, không tự đọc process.env) để test được.
 * - `production`: bản chạy thật trên Vercel. Mọi biến ứng dụng cần đều bắt buộc.
 * - Không phải production (preview, máy local): chỉ bắt buộc database và khóa phiên đăng nhập.
 * Trả về { errors, warnings }; lỗi làm dừng build production trên Vercel (scripts/build.cjs).
 */
const ACCOUNT_VARIABLES = /^(ADMIN|STAFF)_(EMAIL|USERNAME|NAME|PASSWORD|INITIAL_PASSWORD)$/;
const PLACEHOLDER_SECRET = 'generate-a-random-secret-with-openssl-rand-base64-32';

function parseDatabaseUrl(name, raw, errors) {
  try {
    const url = new URL(raw);
    if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error('protocol');
    return url;
  } catch {
    errors.push(`${name} không phải chuỗi kết nối PostgreSQL hợp lệ (postgresql://...). Nếu mật khẩu có ký tự đặc biệt như @ # / ?, hãy mã hóa URL.`);
    return null;
  }
}

function checkDeployEnvironment(env, { production = false, vercel = false } = {}) {
  const errors = [];
  const warnings = [];
  const has = (name) => typeof env[name] === 'string' && env[name].trim() !== '';

  // Tài khoản quản trị/nhân viên không được nằm trong biến môi trường.
  const accountVariables = Object.keys(env).filter((name) => ACCOUNT_VARIABLES.test(name) && has(name));
  if (accountVariables.length) {
    errors.push(`Không đặt tài khoản trong biến môi trường: xóa ${accountVariables.join(', ')}. `
      + 'Tạo quản trị viên bằng `npm run admin:create`, nhân viên trong trang /admin/staff.');
  }
  const publicSecrets = Object.keys(env).filter((name) => name.startsWith('NEXT_PUBLIC_')
    && /SECRET|PASSWORD|PRIVATE|API_KEY|TOKEN/.test(name) && has(name));
  if (publicSecrets.length) {
    errors.push(`${publicSecrets.join(', ')}: biến NEXT_PUBLIC_ được gửi xuống trình duyệt, không dùng cho khóa bí mật.`);
  }

  // Database (Supabase).
  let app = null;
  if (!has('CONNECTION_STRING')) errors.push('Thiếu CONNECTION_STRING (chuỗi kết nối Supabase).');
  else app = parseDatabaseUrl('CONNECTION_STRING', env.CONNECTION_STRING, errors);
  if (app) {
    if (!app.searchParams.get('schema')) {
      warnings.push('CONNECTION_STRING chưa có ?schema=tpetie_app: ứng dụng sẽ dùng schema public.');
    }
    const transaction = app.port === '6543' || app.searchParams.get('pgbouncer') === 'true';
    if (vercel && !transaction) {
      warnings.push('CONNECTION_STRING trên Vercel nên dùng transaction pooler (cổng 6543, pgbouncer=true); '
        + 'session pooler (5432) dễ hết kết nối khi nhiều function chạy cùng lúc.');
    }
    if (/\.pooler\.supabase\.com$/i.test(app.hostname) && !app.username.includes('.')) {
      errors.push('CONNECTION_STRING qua pooler Supabase cần user dạng postgres.<project-ref>.');
    }
  }

  if (has('DIRECT_URL')) {
    const direct = parseDatabaseUrl('DIRECT_URL', env.DIRECT_URL, errors);
    if (direct && direct.port === '6543') {
      errors.push('DIRECT_URL không được dùng transaction pooler (cổng 6543): migration cần session pooler (5432) hoặc kết nối trực tiếp.');
    }
    if (direct && app && (direct.searchParams.get('schema') || 'public') !== (app.searchParams.get('schema') || 'public')) {
      errors.push('DIRECT_URL và CONNECTION_STRING phải cùng tham số schema, nếu không migration sẽ chạy vào schema khác.');
    }
  } else if (production) {
    errors.push('Thiếu DIRECT_URL (session pooler cổng 5432): bản production tự chạy migration trước khi build.');
  }

  // Đăng nhập (NextAuth).
  if (!has('NEXTAUTH_SECRET')) errors.push('Thiếu NEXTAUTH_SECRET.');
  else if (env.NEXTAUTH_SECRET === PLACEHOLDER_SECRET || (production && env.NEXTAUTH_SECRET.length < 32)) {
    errors.push('NEXTAUTH_SECRET phải là chuỗi ngẫu nhiên ≥ 32 ký tự, tạo bằng `openssl rand -base64 32`.');
  }
  if (has('NEXTAUTH_URL')) {
    let url = null;
    try { url = new URL(env.NEXTAUTH_URL); } catch { errors.push('NEXTAUTH_URL không phải URL hợp lệ.'); }
    if (url && production && (url.protocol !== 'https:' || /localhost|127\.0\.0\.1/.test(url.hostname))) {
      errors.push('NEXTAUTH_URL của production phải là domain thật dùng https://.');
    }
    if (url && url.pathname !== '/') warnings.push('NEXTAUTH_URL chỉ nên là domain (không kèm đường dẫn).');
  } else if (production) {
    errors.push('Thiếu NEXTAUTH_URL (domain chính thức, ví dụ https://tpetie.vn).');
  }

  // Cloudinary (ảnh, file xuất Excel). Chấp nhận cả tên CLOUD_*.
  const cloudinary = [['CLOUDINARY_CLOUD_NAME', 'CLOUD_NAME'], ['CLOUDINARY_API_KEY', 'CLOUD_API_KEY'],
    ['CLOUDINARY_API_SECRET', 'CLOUD_API_SECRET']].filter(([name, alias]) => !has(name) && !has(alias)).map(([name]) => name);
  if (cloudinary.length) {
    (production ? errors : warnings).push(`Thiếu ${cloudinary.join(', ')}: không tải được ảnh và file xuất Excel.`);
  }

  // Cron bảo trì (vercel.json).
  if (!has('CRON_SECRET') || env.CRON_SECRET.length < 16) {
    (production ? errors : warnings).push('CRON_SECRET cần chuỗi ngẫu nhiên ≥ 16 ký tự, nếu không cron /api/cron/maintenance luôn bị từ chối.');
  }

  // Analytics: mã sai định dạng bị layout bỏ qua, website chạy bình thường nhưng không đo được gì.
  if (has('NEXT_PUBLIC_GA4_ID') && !/^G-[A-Z0-9]+$/.test(env.NEXT_PUBLIC_GA4_ID)) {
    warnings.push('NEXT_PUBLIC_GA4_ID phải là Measurement ID dạng G-XXXXXXXXXX (GA4 → Quản trị → Luồng dữ liệu), nếu không GA4 không được tải.');
  }

  if (has('GOOGLE_CLIENT_ID') !== has('GOOGLE_CLIENT_SECRET')) {
    warnings.push('Đăng nhập Google cần đủ cả GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET.');
  } else if (production && !has('GOOGLE_CLIENT_ID')) {
    warnings.push('Chưa có GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET: nút "Đăng nhập với Google" bị ẩn. Thêm trong Vercel → Settings → Environment Variables rồi deploy lại.');
  }
  if (has('GOOGLE_CLIENT_ID') && !/\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID)) {
    warnings.push('GOOGLE_CLIENT_ID phải có dạng ….apps.googleusercontent.com (Google Cloud → Clients → Client ID).');
  }
  // Email (xác thực tài khoản, quên mật khẩu, thông báo đơn hàng). Cổng, địa chỉ gửi, tên người gửi có mặc định.
  const smtpKeys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
  if (production || smtpKeys.some(has)) {
    for (const key of smtpKeys) if (!has(key)) (production ? errors : warnings).push(`Thiếu ${key}: khách không nhận được email xác thực nên không đặt hàng được.`);
    if (has('SMTP_SECURE') && !['true', 'false'].includes(env.SMTP_SECURE)) errors.push('SMTP_SECURE phải là true hoặc false.');
    if (has('SMTP_PORT') && (!/^\d+$/.test(env.SMTP_PORT) || Number(env.SMTP_PORT) < 1 || Number(env.SMTP_PORT) > 65535)) errors.push('SMTP_PORT không hợp lệ.');
    const port = has('SMTP_PORT') ? env.SMTP_PORT : '465';
    const secure = has('SMTP_SECURE') ? env.SMTP_SECURE : String(port === '465');
    if ((port === '465' && secure !== 'true') || (port === '587' && secure !== 'false')) errors.push('SMTP_PORT không khớp SMTP_SECURE (465 dùng true, 587 dùng false).');
    for (const key of ['MAIL_FROM_ADDRESS', 'MAIL_REPLY_TO']) if (has(key) && !/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(env[key])) errors.push(`${key} không hợp lệ.`);
    if (has('MAIL_SITE_URL')) {
      try {
        const url = new URL(env.MAIL_SITE_URL);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (production && (url.protocol !== 'https:' || /^(localhost|127\.0\.0\.1)$/.test(url.hostname)))) throw new Error();
      } catch { errors.push('MAIL_SITE_URL phải là origin hợp lệ; production dùng domain HTTPS.'); }
    }
  }
  return { errors, warnings };
}

module.exports = { checkDeployEnvironment };
