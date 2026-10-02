import { compressImage, type CompressOptions } from '@/client/image-compress';
import { readJson } from '@/client/http';

export { readJson };

/** Giới hạn của máy chủ cho một ảnh (thấp hơn 4,5 MB mỗi request của Vercel). */
export const MEDIA_UPLOAD_MAX_BYTES = 4_000_000;

export type UploadedMedia = { id: string; url: string };

/** Nén (nếu cần) rồi tải MỘT ảnh lên thư viện media; mỗi ảnh một request để không vượt giới hạn dung lượng. */
export async function uploadMedia(file: File, options: CompressOptions, altText = ''): Promise<UploadedMedia> {
  // Trình duyệt không đọc được định dạng (ví dụ HEIC trên Chrome máy tính) thì gửi nguyên tệp để máy chủ báo lỗi rõ ràng.
  const prepared = await compressImage(file, options).catch(() => file);
  if (prepared.size > MEDIA_UPLOAD_MAX_BYTES) {
    throw new Error(`${file.name}: ảnh quá lớn (${(prepared.size / 1_000_000).toFixed(1)} MB) và trình duyệt không nén được. Chọn ảnh JPG/PNG nhỏ hơn 4 MB.`);
  }
  const body = new FormData();
  body.set('file', prepared);
  if (altText) body.set('altText', altText);
  const response = await fetch('/api/admin/media', { method: 'POST', body });
  const data = await readJson(response);
  const asset = data.asset as UploadedMedia | undefined;
  if (!response.ok || !asset?.url) throw new Error(`${file.name}: ${String(data.error || 'Tải ảnh thất bại')}`);
  return asset;
}
