import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

/** Chỉ cho máy tìm kiếm vào trang công khai; khu quản trị, API, giỏ hàng và trang tài khoản không lập chỉ mục. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/staff', '/api/', '/cart', '/checkout', '/buy-now', '/account', '/orders', '/dashboard', '/login', '/register', '/order-lookup'],
    }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
