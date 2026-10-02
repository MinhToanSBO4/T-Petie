'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Info, Star, X } from 'lucide-react';
import { compressImage, REVIEW_PHOTO_OPTIONS } from '@/client/image-compress';
import { readJson, sendWithProgress, type JsonBody } from '@/client/http';
import { errorText, toast } from '@/client/toast';
import { useDialog } from '@/hooks/useDialog';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { RATING_LABELS, REVIEW_CONTENT_MAX, REVIEW_MAX_IMAGES, REVIEW_QUICK_TAGS, SIZE_FIT_OPTIONS } from '@/lib/content/review-input';
import { maskName, REVIEW_EDIT_WINDOW_DAYS } from '@/lib/reviews/rules';
import type { CustomerItemReview } from '@/types/order';

/** Tổng dung lượng ảnh gửi một lần, dưới giới hạn request của máy chủ. */
const MAX_UPLOAD_BYTES = 4_000_000;

export type ReviewTargetInfo = {
  orderItemId: string; orderCode: string; productName: string; size: string; thumbnail: string;
};

type NewPhoto = { key: string; file: File; preview: string };

/**
 * Hộp thoại viết hoặc sửa đánh giá một món đã mua (kiểu Shopee): chấm sao, cảm nhận size, gợi ý chạm nhanh,
 * nội dung, tối đa 5 ảnh (nén ngay trên máy trước khi gửi) và tùy chọn ẩn tên.
 * Trên điện thoại hiện dạng bảng trượt từ dưới lên để thao tác một tay.
 */
export function ReviewDialog({ target, customerName, review, onClose, onSaved }: {
  target: ReviewTargetInfo; customerName: string; review?: CustomerItemReview | null;
  onClose: () => void; onSaved: (message: string) => void;
}) {
  const editing = Boolean(review);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState(review?.content ?? '');
  const [sizeFit, setSizeFit] = useState<string>(review?.sizeFit ?? '');
  const [isAnonymous, setIsAnonymous] = useState(review?.isAnonymous ?? false);
  const [keptImages, setKeptImages] = useState<string[]>(review?.imageUrls ?? []);
  const [photos, setPhotos] = useState<NewPhoto[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = rating !== (review?.rating ?? 5) || content !== (review?.content ?? '') || photos.length > 0 ||
    sizeFit !== (review?.sizeFit ?? '') || keptImages.length !== (review?.imageUrls.length ?? 0);

  const requestClose = () => {
    if (busy) return;
    if (dirty && !window.confirm('Bỏ đánh giá mẹ đang viết?')) return;
    onClose();
  };
  useDialog(dialogRef, requestClose);
  // Ảnh xem trước tạo bằng object URL: thu hồi khi gỡ ảnh và khi đóng hộp thoại để không giữ bộ nhớ.
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const removePhoto = (photo: NewPhoto) => {
    URL.revokeObjectURL(photo.preview);
    setPhotos((current) => current.filter((item) => item.key !== photo.key));
  };

  const room = REVIEW_MAX_IMAGES - keptImages.length - photos.length;

  const addPhotos = async (files: FileList) => {
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    if (chosen.length === 0) return;
    setPreparing(true); setError('');
    const prepared: NewPhoto[] = [];
    for (const file of chosen) {
      try {
        const compressed = await compressImage(file, REVIEW_PHOTO_OPTIONS);
        const preview = URL.createObjectURL(compressed);
        previews.current.push(preview);
        prepared.push({ key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`, file: compressed, preview });
      } catch (compressError) { setError(errorText(compressError, 'Không đọc được ảnh')); }
    }
    setPhotos((current) => [...current, ...prepared]);
    if (files.length > chosen.length) setError(`Mỗi đánh giá tối đa ${REVIEW_MAX_IMAGES} ảnh.`);
    setPreparing(false);
  };

  const toggleTag = (tag: string) => {
    const next = content.includes(tag) ? content.replace(new RegExp(`\\s*${tag}\\.?`), '').trim()
      : `${content.trim()}${content.trim() ? ' ' : ''}${tag}.`;
    setContent(next.slice(0, REVIEW_CONTENT_MAX));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (photos.reduce((sum, photo) => sum + photo.file.size, 0) > MAX_UPLOAD_BYTES) {
      setError('Ảnh quá nặng, mẹ bớt 1–2 ảnh rồi gửi lại giúp shop nhé.');
      return;
    }
    setBusy(true); setError('');
    const fields: Record<string, string> = { rating: String(rating), content, sizeFit, isAnonymous: String(isAnonymous) };
    if (!editing) fields.orderItemId = target.orderItemId;
    const url = editing ? `/api/reviews/${review!.id}` : '/api/reviews';
    const method = editing ? 'PATCH' : 'POST';
    // Có ảnh: báo tiến độ tải lên ở góc màn hình (mạng điện thoại chậm có thể mất vài giây); lỗi vẫn hiện trong hộp thoại.
    // Id riêng mỗi lần gửi: khách tự đóng thông báo lần trước thì lần gửi sau vẫn hiện tiến độ.
    const upload = photos.length > 0
      ? toast.loading(`Đang tải ${photos.length} ảnh đánh giá…`, { id: `review-upload-${Date.now()}`, progress: 0 }) : null;
    try {
      let result: { ok: boolean; data: JsonBody };
      if (upload) {
        const form = new FormData();
        for (const [key, value] of Object.entries(fields)) form.set(key, value);
        for (const kept of keptImages) form.append('keepImages', kept);
        for (const photo of photos) form.append('images', photo.file);
        result = await sendWithProgress(url, { method, body: form, onProgress: (fraction) => toast.update(upload, fraction < 1
          ? { progress: fraction * 100 } : { message: 'Đang lưu đánh giá…', progress: null }) });
      } else {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fields, rating, isAnonymous, keepImages: keptImages }) });
        result = { ok: response.ok, data: await readJson(response) };
      }
      if (!result.ok) throw new Error(result.data.error || 'Không gửi được đánh giá');
      if (upload) toast.dismiss(upload);
      onSaved(editing ? 'Đã lưu đánh giá.'
        : 'Cảm ơn mẹ đã đánh giá! 🌸');
    } catch (submitError) {
      if (upload) toast.dismiss(upload);
      setError(errorText(submitError, 'Có lỗi xảy ra'));
      setBusy(false);
    }
  };

  const shown = hover || rating;
  return createPortal(<div className="fixed inset-0 z-[80] flex items-end justify-center bg-charcoal-900/50 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
    onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="review-dialog-title"
      className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-slide-up sm:rounded-3xl">
      <header className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
        <h2 id="review-dialog-title" className="font-heading text-lg font-bold text-charcoal-900">
          {editing ? 'Sửa đánh giá' : 'Đánh giá sản phẩm'}
        </h2>
        <button type="button" onClick={requestClose} aria-label="Đóng" className="grid size-10 place-items-center rounded-full text-charcoal-600 hover:bg-cream-100">
          <X className="size-5" />
        </button>
      </header>

      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-cream-50 p-3">
            {target.thumbnail && <img src={cloudinaryImage(target.thumbnail, { width: 160 })} alt="" className="size-14 rounded-xl object-cover" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-charcoal-900">{target.productName}</p>
              <p className="text-xs text-charcoal-600">Phân loại: {target.size} · Đơn {target.orderCode}</p>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-bold text-charcoal-900">Chất lượng sản phẩm</legend>
            <div className="mt-1 flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((value) => <label key={value} onMouseEnter={() => setHover(value)}
                className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-honey-400">
                <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} className="sr-only" />
                <Star aria-hidden className={`size-9 transition-transform motion-safe:hover:scale-110 ${value <= shown ? 'text-honey-500' : 'text-cream-300'}`}
                  fill="currentColor" strokeWidth={1} />
                <span className="sr-only">{value} sao, {RATING_LABELS[value]}</span>
              </label>)}
              <span className="ml-2 text-sm font-bold text-honey-700" aria-hidden>{RATING_LABELS[shown]}</span>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-bold text-charcoal-900">Bé mặc size này thế nào? <span className="font-normal text-charcoal-500">(không bắt buộc)</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SIZE_FIT_OPTIONS.map((option) => <label key={option.value}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-honey-400 ${
                  sizeFit === option.value ? 'border-honey-500 bg-honey-50 text-honey-800' : 'border-cream-300 text-charcoal-700 hover:bg-cream-50'}`}>
                <input type="radio" name="sizeFit" value={option.value} checked={sizeFit === option.value}
                  onChange={() => setSizeFit(option.value)} onClick={() => { if (sizeFit === option.value) setSizeFit(''); }} className="sr-only" />
                {option.label}
              </label>)}
            </div>
          </fieldset>

          <div>
            <label htmlFor="review-content" className="text-sm font-bold text-charcoal-900">Cảm nhận của mẹ</label>
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Gợi ý nhanh">
              {REVIEW_QUICK_TAGS.map((tag) => <button key={tag} type="button" onClick={() => toggleTag(tag)} aria-pressed={content.includes(tag)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${content.includes(tag)
                  ? 'border-sage-500 bg-sage-50 text-sage-800' : 'border-cream-300 text-charcoal-600 hover:bg-cream-50'}`}>{tag}</button>)}
            </div>
            <textarea id="review-content" value={content} onChange={(event) => setContent(event.target.value)} rows={4}
              maxLength={REVIEW_CONTENT_MAX} placeholder="Chất vải, đường may, form dáng, bé mặc có thích không… (không bắt buộc)"
              className="mt-2 w-full rounded-2xl border border-cream-300 p-3 text-sm focus:border-honey-500 focus:outline-none focus:ring-2 focus:ring-honey-100" />
            <p className="text-right text-[11px] text-charcoal-500">{content.length}/{REVIEW_CONTENT_MAX}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-charcoal-900">Ảnh thực tế <span className="font-normal text-charcoal-500">(tối đa {REVIEW_MAX_IMAGES} ảnh)</span></p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {keptImages.map((url) => <li key={url} className="relative">
                <img src={cloudinaryImage(url, { width: 200 })} alt="Ảnh đã gửi" className="size-20 rounded-xl border border-cream-200 object-cover" />
                <button type="button" onClick={() => setKeptImages((current) => current.filter((item) => item !== url))} aria-label="Gỡ ảnh"
                  className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-charcoal-900 text-white"><X className="size-3.5" /></button>
              </li>)}
              {photos.map((photo) => <li key={photo.key} className="relative">
                <img src={photo.preview} alt="Ảnh mới chọn" className="size-20 rounded-xl border border-cream-200 object-cover" />
                <button type="button" onClick={() => removePhoto(photo)} aria-label="Gỡ ảnh"
                  className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-charcoal-900 text-white"><X className="size-3.5" /></button>
              </li>)}
              {room > 0 && <li>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={preparing}
                  className="grid size-20 place-content-center justify-items-center gap-1 rounded-xl border-2 border-dashed border-honey-300 bg-honey-50 text-[11px] font-bold text-honey-800 disabled:opacity-60">
                  <Camera className="size-5" aria-hidden />{preparing ? 'Đang xử lý…' : 'Thêm ảnh'}
                </button>
              </li>}
            </ul>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(event) => { if (event.target.files) void addPhotos(event.target.files); event.target.value = ''; }} />
            <p className="mt-1 text-[11px] text-charcoal-500">Ảnh bé mặc đồ giúp các mẹ khác chọn size dễ hơn. Ảnh được nén và xóa thông tin vị trí trước khi gửi.</p>
          </div>

          <label className="flex items-start gap-2 text-sm text-charcoal-700">
            <input type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)} className="mt-0.5 size-5" />
            <span>Ẩn tên của mẹ <span className="text-charcoal-500">(hiển thị là {maskName(customerName || 'Khách hàng')})</span></span>
          </label>

          <p className="flex items-start gap-2 rounded-xl bg-cream-50 p-3 text-xs text-charcoal-600">
            <Info className="mt-0.5 size-4 shrink-0 text-honey-600" aria-hidden />
            Đánh giá hiển thị ngay trên trang sản phẩm. {editing ? 'Đây là lần sửa duy nhất của đánh giá này.'
              : `Mẹ có thể sửa đánh giá 1 lần trong ${REVIEW_EDIT_WINDOW_DAYS} ngày.`}
          </p>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>

        <footer className="flex gap-3 border-t border-cream-200 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={requestClose} disabled={busy}
            className="min-h-11 flex-1 rounded-full border border-cream-300 text-sm font-bold text-charcoal-700 disabled:opacity-50">Để sau</button>
          <button disabled={busy || preparing}
            className="min-h-11 flex-[2] rounded-full bg-honey-500 text-sm font-bold text-white shadow-md transition-colors hover:bg-honey-600 disabled:opacity-60">
            {busy ? 'Đang gửi…' : editing ? 'Lưu đánh giá' : 'Gửi đánh giá'}
          </button>
        </footer>
      </form>
    </div>
  </div>, document.body);
}
