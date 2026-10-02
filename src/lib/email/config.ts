export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email) ? email : null;
}

/** Địa chỉ gốc của website trong liên kết email: MAIL_SITE_URL, NEXTAUTH_URL, rồi domain production của Vercel. */
function mailSiteUrl(env: Record<string, string | undefined>) {
  const candidates = [env.MAIL_SITE_URL, env.NEXTAUTH_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`];
  const raw = candidates.map((value) => value?.trim()).find(Boolean);
  if (!raw) throw new Error('Thiếu MAIL_SITE_URL hoặc NEXTAUTH_URL');
  const site = new URL(raw);
  if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password || site.search || site.hash || site.pathname !== '/') throw new Error('Sai MAIL_SITE_URL');
  if (env.NODE_ENV === 'production' && env.VERCEL && (site.protocol !== 'https:' || /^(localhost|127\.0\.0\.1)$/.test(site.hostname))) throw new Error('MAIL_SITE_URL production cần HTTPS');
  return site.origin;
}

/**
 * Cấu hình SMTP. Bắt buộc: SMTP_HOST, SMTP_USER, SMTP_PASSWORD. Mặc định: cổng 465 (SSL), địa chỉ gửi = SMTP_USER,
 * tên người gửi "<thương hiệu> · No-Reply", liên kết theo NEXTAUTH_URL.
 */
export function readMailConfig(env: Record<string, string | undefined>) {
  const value = (key: string) => {
    const raw = env[key]?.trim();
    if (raw && /[\r\n]/.test(raw)) throw new Error(`Sai ${key}`);
    return raw || undefined;
  };
  const required = (key: string) => {
    const raw = value(key);
    if (!raw) throw new Error(`Thiếu ${key}`);
    return raw;
  };
  const host = required('SMTP_HOST');
  const port = Number(value('SMTP_PORT') ?? 465);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Sai SMTP_PORT');
  const secureValue = value('SMTP_SECURE') ?? String(port === 465);
  if (!['true', 'false'].includes(secureValue)) throw new Error('Sai SMTP_SECURE');
  const secure = secureValue === 'true';
  if ((port === 465 && !secure) || (port === 587 && secure)) throw new Error('SMTP_PORT không khớp SMTP_SECURE');
  const user = required('SMTP_USER');
  // Gmail App Password hiển thị thành 4 nhóm cách nhau bởi dấu cách; bỏ khoảng trắng để dán thẳng vẫn dùng được.
  const password = required('SMTP_PASSWORD').replace(/\s+/g, '');
  const fromAddress = normalizeEmail(value('MAIL_FROM_ADDRESS') ?? user);
  if (!fromAddress) throw new Error('Sai MAIL_FROM_ADDRESS');
  const brand = value('MAIL_BRAND_NAME') || "T'Petie";
  const fromName = value('MAIL_FROM_NAME') || `${brand} · No-Reply`;
  if (brand.length > 100 || fromName.length > 150) throw new Error('Sai tên thương hiệu');
  const replyTo = value('MAIL_REPLY_TO') ? normalizeEmail(value('MAIL_REPLY_TO')) : undefined;
  if (replyTo === null) throw new Error('Sai MAIL_REPLY_TO');
  return { host, port, secure, user, password, fromAddress, fromName, brand, siteUrl: mailSiteUrl(env), replyTo };
}
export type MailConfig = ReturnType<typeof readMailConfig>;
