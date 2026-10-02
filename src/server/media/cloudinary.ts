import 'server-only';

/**
 * Cấu hình Cloudinary đọc từ biến môi trường.
 * Hỗ trợ cả hai cách đặt tên đang tồn tại trong repo (.env cũ dùng CLOUD_*).
 */
export function cloudinaryConfig() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;
  if (!cloud || !key || !secret || !/^[a-zA-Z0-9_-]+$/.test(cloud)) return null;
  return { cloud, key, secret };
}

export const MEDIA_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
export const MEDIA_MAX_BYTES = 5_000_000;

export type UploadedImage = {
  url: string; publicId: string; width: number | null; height: number | null;
  bytes: number | null; format: string | null;
};

type CloudinaryResponse = {
  secure_url?: string; public_id?: string;
  width?: number; height?: number; bytes?: number; format?: string;
};

/** Tải một tệp ảnh lên Cloudinary và trả về metadata để lưu vào database. */
export async function uploadImageToCloudinary(file: File, folder: string): Promise<UploadedImage | null> {
  const config = cloudinaryConfig();
  if (!config) return null;
  const upload = new FormData();
  upload.set('file', file);
  upload.set('folder', folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/image/upload`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${config.key}:${config.secret}`).toString('base64')}` },
    body: upload,
  });
  if (!response.ok) return null;
  const result = await response.json() as CloudinaryResponse;
  if (!result.secure_url?.startsWith(`https://res.cloudinary.com/${config.cloud}/`) || !result.public_id) return null;
  return {
    url: result.secure_url, publicId: result.public_id,
    width: Number.isInteger(result.width) ? result.width! : null,
    height: Number.isInteger(result.height) ? result.height! : null,
    bytes: Number.isInteger(result.bytes) ? result.bytes! : null,
    format: typeof result.format === 'string' ? result.format : null,
  };
}

/** Xóa ảnh trên Cloudinary theo public id. Trả về true khi xóa thành công hoặc ảnh đã không còn. */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  const config = cloudinaryConfig();
  if (!config) return false;
  const body = new URLSearchParams({ public_id: publicId });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/image/destroy`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.key}:${config.secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!response.ok) return false;
  const result = await response.json() as { result?: string };
  return result.result === 'ok' || result.result === 'not found';
}

/**
 * Public id của ảnh do chính tài khoản Cloudinary này phân phối (bỏ phiên bản và phần mở rộng),
 * dùng để xóa ảnh không còn được tham chiếu. URL lạ hoặc có biến đổi trả về null.
 */
export function cloudinaryPublicId(url: string): string | null {
  const config = cloudinaryConfig();
  const match = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:v\d+\/)?([^,]+?)\.[a-z0-9]+$/i.exec(url);
  if (!config || !match || match[1] !== config.cloud) return null;
  return match[2];
}

/** Tải một tệp bất kỳ (ví dụ báo cáo Excel) lên Cloudinary dưới dạng raw. */
export async function uploadRawFileToCloudinary(buffer: Buffer, filename: string, mimeType: string): Promise<{ url: string; publicId: string } | null> {
  const config = cloudinaryConfig();
  if (!config) return null;
  const form = new FormData();
  form.set('file', new File([new Uint8Array(buffer)], filename, { type: mimeType }));
  form.set('folder', 'tpetie/exports');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/raw/upload`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${config.key}:${config.secret}`).toString('base64')}` },
    body: form,
  });
  if (!response.ok) return null;
  const result = await response.json() as { secure_url?: string; public_id?: string };
  if (!result.secure_url?.startsWith(`https://res.cloudinary.com/${config.cloud}/`) || !result.public_id) return null;
  return { url: result.secure_url, publicId: result.public_id };
}

/** Kiểm tra file tải lên có phải ảnh hợp lệ trong giới hạn cho phép. */
export function isValidImageFile(file: unknown): file is File {
  return file instanceof File && MEDIA_IMAGE_TYPES.has(file.type) && file.size >= 1 && file.size <= MEDIA_MAX_BYTES;
}
