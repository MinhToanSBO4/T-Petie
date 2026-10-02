import { compressImage, type CompressOptions } from '@/client/image-compress';
import { readJson, sendWithProgress } from '@/client/http';
import { errorText, toast } from '@/client/toast';

export { readJson };

/** Giới hạn của máy chủ cho một ảnh (thấp hơn 4,5 MB mỗi request của Vercel). */
export const MEDIA_UPLOAD_MAX_BYTES = 4_000_000;

export type UploadedMedia = { id: string; url: string };

/**
 * Nén (nếu cần) rồi tải MỘT ảnh lên thư viện media; mỗi ảnh một request để không vượt giới hạn dung lượng.
 * `onProgress` nhận phần đã gửi lên máy chủ (0–1).
 */
export async function uploadMedia(file: File, options: CompressOptions, altText = '',
  { onProgress }: { onProgress?: (fraction: number) => void } = {}): Promise<UploadedMedia> {
  // Trình duyệt không đọc được định dạng (ví dụ HEIC trên Chrome máy tính) thì gửi nguyên tệp để máy chủ báo lỗi rõ ràng.
  const prepared = await compressImage(file, options).catch(() => file);
  if (prepared.size > MEDIA_UPLOAD_MAX_BYTES) {
    throw new Error(`${file.name}: ảnh quá lớn (${(prepared.size / 1_000_000).toFixed(1)} MB) và trình duyệt không nén được. Chọn ảnh JPG/PNG nhỏ hơn 4 MB.`);
  }
  const body = new FormData();
  body.set('file', prepared);
  if (altText) body.set('altText', altText);
  const { ok, data } = await sendWithProgress('/api/admin/media', { body, onProgress });
  const asset = data.asset as UploadedMedia | undefined;
  if (!ok || !asset?.url) throw new Error(`${file.name}: ${String(data.error || 'Tải ảnh thất bại')}`);
  return asset;
}

let batchSequence = 0;

/**
 * Tải lần lượt từng ảnh (một ảnh lỗi không làm hỏng cả loạt) với MỘT thông báo cho cả loạt: "Đang tải ảnh 2/5…" kèm
 * phần trăm chung, xong thì đổi thành kết quả. `onUploaded` chạy ngay sau mỗi ảnh để ảnh hiện dần trên form.
 * `description`: dòng phụ của thông báo thành công (ví dụ nhắc bấm lưu). Trả về số ảnh đã tải và câu báo lỗi (rỗng nếu
 * không lỗi) để nơi gọi hiện lỗi ngay trên form, vì thông báo góc màn hình tự ẩn sau vài giây.
 */
export async function uploadMediaBatch(files: File[], options: CompressOptions, altText: string,
  onUploaded: (asset: UploadedMedia) => void,
  { description: successDescription }: { description?: string } = {}): Promise<{ uploaded: number; error: string }> {
  const total = files.length;
  const step = (index: number) => total > 1 ? `Đang tải ảnh ${index + 1}/${total}…` : 'Đang tải ảnh…';
  // Id riêng: hai ô ảnh tải cùng lúc có cùng câu "Đang tải ảnh…" không bị gộp thành một thông báo.
  const id = toast.loading(step(0), { id: `media-upload-${++batchSequence}`, progress: 0 });
  let shown = 0;
  const report = (percent: number, message?: string) => {
    if (percent === shown && !message) return;
    shown = percent;
    toast.update(id, message ? { message, progress: percent } : { progress: percent });
  };
  const failures: string[] = [];
  let uploaded = 0;
  for (const [index, file] of files.entries()) {
    if (index > 0) report(Math.round((index / total) * 100), step(index));
    // Gửi xong một ảnh chỉ tính 95% phần của ảnh đó: máy chủ còn đưa ảnh lên Cloudinary, 100% là đã xong hẳn.
    const onProgress = (fraction: number) => report(Math.round(((index + Math.min(1, fraction) * 0.95) / total) * 100));
    try {
      onUploaded(await uploadMedia(file, options, altText, { onProgress }));
      uploaded += 1;
    } catch (error) { failures.push(errorText(error, `${file.name}: Tải ảnh thất bại`)); }
  }

  if (failures.length === 0) {
    toast.success(total > 1 ? `Đã tải lên ${uploaded} ảnh` : 'Đã tải ảnh lên', { id, description: successDescription });
    return { uploaded, error: '' };
  }
  // Nhiều ảnh cùng một lỗi (mất mạng…) chỉ ghi một lần; quá dài thì rút gọn.
  const reasons = [...new Set(failures)];
  const description = (reasons.length > 3 ? [...reasons.slice(0, 3), `và ${reasons.length - 3} lỗi khác`] : reasons).join('; ');
  const title = total === 1 ? failures[0]
    : uploaded === 0 ? `Không tải được ${total} ảnh` : `Đã tải lên ${uploaded}/${total} ảnh, ${failures.length} ảnh bị lỗi`;
  if (total === 1) toast.error(title, { id });
  else toast.error(title, { id, description });
  return { uploaded, error: total === 1 ? title : `${title} — ${description}` };
}
