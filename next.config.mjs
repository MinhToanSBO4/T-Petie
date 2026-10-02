/** @type {import('next').NextConfig} */
// Next.js chèn script bootstrap nội tuyến nên CSP cần 'unsafe-inline'; dev cần thêm 'unsafe-eval'
// cho webpack. Danh sách nguồn chỉ mở cho Cloudinary, Google Fonts, GA4 và Clarity. Nguồn GA4 theo hướng dẫn CSP của
// Google (gtag gửi dữ liệu tới *.google-analytics.com và *.analytics.google.com tùy vùng).
const isDev = process.env.NODE_ENV === 'development';
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://*.googletagmanager.com https://*.clarity.ms`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://*.google-analytics.com https://*.googletagmanager.com https://www.clarity.ms https://*.clarity.ms",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig = {
  poweredByHeader: false,
  experimental: {
    cpus: 2,
    // Trình duyệt giữ trang đã dựng trong 5 phút: quay lại trang vừa xem không gọi lại máy chủ/database.
    // Mọi thao tác lưu gọi router.refresh() để xóa bộ nhớ này, nên không thấy dữ liệu cũ sau khi sửa.
    staleTimes: { dynamic: 300, static: 300 },
  },
  webpack(config) {
    // This workspace is on exFAT, where Webpack's disk snapshots are unreliable.
    // This changes module compilation caching, not catalog data caching.
    if (process.platform === 'win32') config.cache = { type: 'memory' };
    return config;
  },
  images: {
    // Ảnh nội dung nằm trên Cloudinary: Cloudinary cắt ảnh theo kích thước hiển thị (f_auto, q_auto), không dùng
    // bộ tối ưu ảnh của Vercel. Avatar đăng nhập Google dùng thẻ <img> thường.
    loader: 'custom',
    loaderFile: './src/lib/media/next-image-loader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // Chỉ có hiệu lực khi phục vụ qua HTTPS; bật sẵn cho môi trường triển khai.
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    ] }];
  },
};

export default nextConfig;
