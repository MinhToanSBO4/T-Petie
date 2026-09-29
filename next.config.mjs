/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { cpus: 2 },
  webpack(config) {
    // This workspace is on exFAT, where Webpack's disk snapshots are unreliable.
    // This changes module compilation caching, not catalog data caching.
    if (process.platform === 'win32') config.cache = { type: 'memory' };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};

export default nextConfig;
