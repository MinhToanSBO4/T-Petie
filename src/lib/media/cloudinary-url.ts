const UPLOAD_URL = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const TRANSFORMATION = /^[a-z]{1,4}_[^,/]+(?:,[a-z]{1,4}_[^,/]+)*$/;

/**
 * Ảnh Cloudinary đã tối ưu: định dạng và chất lượng tự động, giới hạn chiều rộng theo chỗ hiển thị.
 * Ảnh chụp màn hình gốc thường là PNG vài MB, nên không tải ảnh gốc ra trang công khai.
 * URL đã có biến đổi hoặc không phải ảnh Cloudinary được giữ nguyên.
 */
export function cloudinaryImage(url: string, options: { width?: number; quality?: number | 'auto' } = {}): string {
  const match = UPLOAD_URL.exec(url);
  if (!match) return url;
  const [, base, rest] = match;
  if (TRANSFORMATION.test(rest.split('/')[0])) return url;
  const quality = options.quality === undefined || options.quality === 'auto' ? 'auto' : Math.round(options.quality);
  const parts = ['f_auto', `q_${quality}`];
  if (options.width) parts.push('c_limit', `w_${Math.round(options.width)}`);
  return `${base}${parts.join(',')}/${rest}`;
}

/** Bộ nạp ảnh cho next/image: để Cloudinary tạo đúng kích thước thay vì máy chủ Next tối ưu lại. */
export function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  return cloudinaryImage(src, { width, quality: quality ?? 'auto' });
}
