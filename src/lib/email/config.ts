export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email) ? email : null;
}

export function readMailConfig(env: Record<string, string | undefined>) {
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value || /[\r\n]/.test(value)) throw new Error(`Thiếu hoặc sai ${key}`);
    return value;
  };
  const host = required('SMTP_HOST');
  const port = Number(required('SMTP_PORT'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Sai SMTP_PORT');
  const secureValue = required('SMTP_SECURE');
  if (!['true', 'false'].includes(secureValue)) throw new Error('Sai SMTP_SECURE');
  const secure = secureValue === 'true';
  if ((port === 465 && !secure) || (port === 587 && secure)) throw new Error('SMTP_PORT không khớp SMTP_SECURE');
  const user = required('SMTP_USER');
  const password = required('SMTP_PASSWORD');
  const fromAddress = normalizeEmail(required('MAIL_FROM_ADDRESS'));
  if (!fromAddress) throw new Error('Sai MAIL_FROM_ADDRESS');
  const brand = env.MAIL_BRAND_NAME?.trim() || "T'Petie";
  const fromName = env.MAIL_FROM_NAME?.trim() || `${brand} · No Reply`;
  if (/[\r\n]/.test(brand + fromName) || brand.length > 100 || fromName.length > 150) throw new Error('Sai tên thương hiệu');
  const site = new URL(required('MAIL_SITE_URL'));
  if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password || site.search || site.hash || site.pathname !== '/') throw new Error('Sai MAIL_SITE_URL');
  if (env.NODE_ENV === 'production' && (site.protocol !== 'https:' || /^(localhost|127\.0\.0\.1)$/.test(site.hostname))) throw new Error('MAIL_SITE_URL production cần HTTPS');
  const replyTo = env.MAIL_REPLY_TO?.trim() ? normalizeEmail(env.MAIL_REPLY_TO) : undefined;
  if (replyTo === null) throw new Error('Sai MAIL_REPLY_TO');
  return { host, port, secure, user, password, fromAddress, fromName, brand, siteUrl: site.origin, replyTo };
}
export type MailConfig = ReturnType<typeof readMailConfig>;
