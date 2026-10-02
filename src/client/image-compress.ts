/**
 * Nén ảnh ngay trên trình duyệt trước khi tải lên: giảm kích thước để vừa giới hạn request của máy chủ,
 * tải nhanh trên 4G và xóa siêu dữ liệu EXIF (vị trí GPS, thiết bị) khỏi ảnh khách chụp.
 */
export type CompressOptions = {
  maxWidth: number; maxHeight: number; quality: number;
  /** Ảnh đã nhỏ hơn ngưỡng này và vừa kích thước thì giữ nguyên tệp gốc (giữ chữ sắc nét của ảnh chụp màn hình). */
  keepBelowBytes?: number;
  type?: 'image/jpeg' | 'image/webp';
};

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File, options: CompressOptions): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Tệp đã chọn không phải ảnh');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Không đọc được ảnh này. Mẹ chọn ảnh JPG hoặc PNG giúp shop nhé.');
  }
  const scale = Math.min(1, options.maxWidth / bitmap.width, options.maxHeight / bitmap.height);
  if (scale === 1 && options.keepBelowBytes && file.size <= options.keepBelowBytes &&
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('Trình duyệt không xử lý được ảnh'); }
  // Nền trắng để ảnh PNG trong suốt không bị đen khi chuyển sang JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let type: string = options.type || 'image/jpeg';
  let blob = await toBlob(canvas, type, options.quality);
  // Một số trình duyệt không mã hóa được WebP và trả về PNG: chuyển sang JPEG cho nhẹ.
  if (!blob || blob.type !== type) {
    type = 'image/jpeg';
    blob = await toBlob(canvas, type, options.quality);
  }
  if (!blob) throw new Error('Không nén được ảnh');
  const name = `${file.name.replace(/\.[^.]+$/, '') || 'anh'}.${type === 'image/webp' ? 'webp' : 'jpg'}`;
  return new File([blob], name, { type, lastModified: Date.now() });
}

/** Ảnh khách chụp kèm đánh giá: cạnh dài tối đa 1600px, JPEG ~200–500 KB. */
export const REVIEW_PHOTO_OPTIONS: CompressOptions = { maxWidth: 1600, maxHeight: 1600, quality: 0.82 };

/**
 * Ảnh chụp màn hình tin nhắn: giữ chiều rộng đủ đọc chữ, không giới hạn chặt chiều cao
 * vì ảnh chụp cuộn dài; ảnh đã nhẹ thì tải nguyên bản.
 */
export const SCREENSHOT_OPTIONS: CompressOptions = {
  maxWidth: 1440, maxHeight: 8000, quality: 0.9, type: 'image/webp', keepBelowBytes: 900_000,
};

/**
 * Ảnh sản phẩm: cạnh dài tối đa 2000px (đủ phóng to xem chất vải), JPEG ~0.4–1 MB. Ảnh chụp điện thoại 3–8 MB
 * vượt giới hạn 4,5 MB mỗi request của Vercel nên phải nén trước khi gửi; ảnh đã nhẹ và vừa cỡ thì giữ nguyên.
 */
export const PRODUCT_PHOTO_OPTIONS: CompressOptions = { maxWidth: 2000, maxHeight: 2000, quality: 0.86, keepBelowBytes: 1_500_000 };

/** Ảnh banner, ảnh bìa bộ sưu tập, logo: rộng tối đa 2560px cho màn hình lớn. */
export const BANNER_PHOTO_OPTIONS: CompressOptions = { maxWidth: 2560, maxHeight: 2560, quality: 0.86, keepBelowBytes: 1_500_000 };
