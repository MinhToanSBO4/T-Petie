/**
 * Địa chỉ gốc công khai của website (không có "/" cuối), dùng cho thẻ canonical, Open Graph, sitemap và robots.
 * Thứ tự: NEXT_PUBLIC_SITE_URL, NEXTAUTH_URL (đã bắt buộc ở bản production), tên miền production Vercel, localhost.
 */
export function siteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ];
  for (const candidate of candidates) {
    try {
      if (candidate) return new URL(candidate).origin;
    } catch { /* giá trị sai định dạng: thử giá trị tiếp theo */ }
  }
  return 'http://localhost:3000';
}
