const UPLOAD_URL = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const TRANSFORMATION = /^[a-z]{1,4}_[^,/]+(?:,[a-z]{1,4}_[^,/]+)*$/;

type ImageOptions = {
  width?: number; quality?: number | 'auto';
  /** Cắt đúng khung rộng × cao (giống object-cover) thay vì chỉ giới hạn chiều rộng. */
  fill?: { height: number; gravity?: 'north' | 'center' };
};

/**
 * Ảnh Cloudinary đã tối ưu: định dạng và chất lượng tự động, giới hạn chiều rộng theo chỗ hiển thị.
 * Ảnh chụp màn hình gốc thường là PNG vài MB, nên không tải ảnh gốc ra trang công khai.
 * Khung có tỉ lệ cố định cắt ảnh (object-cover) thì dùng `fill`: chỉ giới hạn chiều rộng sẽ làm ảnh ngang
 * bị phóng to theo chiều cao khung và mờ đi.
 * URL đã có biến đổi hoặc không phải ảnh Cloudinary được giữ nguyên.
 */
export function cloudinaryImage(url: string, options: ImageOptions = {}): string {
  const match = UPLOAD_URL.exec(url);
  if (!match) return url;
  const [, base, rest] = match;
  if (TRANSFORMATION.test(rest.split('/')[0])) return url;
  const quality = options.quality === undefined || options.quality === 'auto' ? 'auto' : Math.round(options.quality);
  const parts = ['f_auto', `q_${quality}`];
  if (options.width && options.fill) {
    parts.push('c_fill', `g_${options.fill.gravity ?? 'center'}`, `w_${Math.round(options.width)}`, `h_${Math.round(options.fill.height)}`);
  } else if (options.width) parts.push('c_limit', `w_${Math.round(options.width)}`);
  return `${base}${parts.join(',')}/${rest}`;
}

/** Bộ nạp ảnh cho next/image: để Cloudinary tạo đúng kích thước thay vì máy chủ Next tối ưu lại. */
export function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  return cloudinaryImage(src, { width, quality: quality ?? 'auto' });
}

/**
 * `srcset` cho thẻ <img> thường (dùng được trong server component, nơi không truyền được loader của next/image).
 * Có `ratio` (rộng/cao) thì Cloudinary cắt sẵn đúng khung như object-cover; không có thì giữ nguyên tỉ lệ ảnh.
 */
export function cloudinarySrcSet(url: string, widths: number[], ratio?: number, gravity: 'north' | 'center' = 'center') {
  return widths.map((width) => `${cloudinaryImage(url, ratio
    ? { width, fill: { height: width / ratio, gravity } } : { width })} ${width}w`).join(', ');
}

/** Bộ nạp cho khung dọc 9:16 (story feedback): cắt sẵn phần trên ảnh đúng khung nên ảnh ngang cũng nét. */
export function cloudinaryStoryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  return cloudinaryImage(src, { width, quality: quality ?? 'auto', fill: { height: (width * 16) / 9, gravity: 'north' } });
}
