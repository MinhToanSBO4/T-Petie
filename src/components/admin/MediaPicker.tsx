'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { BANNER_PHOTO_OPTIONS } from '@/client/image-compress';
import { uploadMediaBatch } from '@/client/media-upload';
import { errorText, toast } from '@/client/toast';

export type MediaAssetRow = {
  id: string; url: string; publicId: string | null; altText: string | null;
  width: number | null; height: number | null; createdAt: string;
};

type MediaPickerProps = {
  value: string;
  onChange: (url: string) => void;
  label: string;
  altText?: string;
  /** Ảnh hiển thị dạng nền lớn (banner) hay thu nhỏ (avatar). */
  aspect?: 'banner' | 'square';
  /** Báo lỗi tải ảnh cho form cha (lỗi cũng hiện ngay dưới ô ảnh). */
  onError?: (message: string) => void;
};

/**
 * Ô chọn ảnh: kéo-thả hoặc bấm để tải lên, hoặc chọn lại ảnh đã có trong thư viện.
 * Mọi ảnh đều đi qua thư viện media (database + Cloudinary), không nhập URL thủ công.
 * Tiến độ tải ảnh hiện ở thông báo góc màn hình; lỗi hiện thêm ngay dưới ô ảnh để không mất khi thông báo tự ẩn.
 */
export function MediaPicker({ value, onChange, label, altText, aspect = 'banner', onError }: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAssetRow[] | null>(null);
  const [error, setError] = useState('');
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Bên gọi dựng onChange từ form ở lần render hiện tại. Ảnh tải mất vài giây: gọi onChange cũ sẽ ghi đè những gì
  // người dùng gõ trong lúc chờ (tiêu đề, mô tả…). Luôn gọi onChange của lần render mới nhất.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const upload = useCallback(async (file: File) => {
    setBusy(true); setError('');
    try {
      const result = await uploadMediaBatch([file], BANNER_PHOTO_OPTIONS, altText || label, (asset) => onChangeRef.current(asset.url));
      if (result.error) { setError(result.error); onErrorRef.current?.(result.error); }
    } finally { setBusy(false); }
  }, [altText, label]);

  useEffect(() => {
    if (!libraryOpen) return;
    const controller = new AbortController();
    fetch('/api/admin/media', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Không tải được thư viện ảnh')))
      .then((data) => setAssets(data.assets || []))
      .catch((libraryError) => {
        if (controller.signal.aborted) return;
        toast.error(errorText(libraryError, 'Không tải được thư viện ảnh'));
        setLibraryOpen(false);
      });
    return () => controller.abort();
  }, [libraryOpen]);

  return <div className="space-y-2">
    <span className="block text-sm font-semibold">{label}</span>
    <div
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault(); setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void upload(file);
      }}
      className={`rounded-xl border-2 border-dashed p-3 transition-colors ${dragging ? 'border-honey-500 bg-honey-50' : 'border-cream-300 bg-cream-50'}`}
    >
      {value ? (
        <div className={aspect === 'banner' ? 'space-y-2' : 'flex items-center gap-3'}>
          <img src={cloudinaryImage(value, { width: aspect === 'banner' ? 960 : 160 })} alt={altText || label} className={aspect === 'banner'
            ? 'w-full max-h-56 rounded-lg object-cover bg-white' : 'size-16 rounded-lg object-cover bg-white'} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
              className="min-h-11 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold">{busy ? 'Đang tải…' : 'Đổi ảnh'}</button>
            <button type="button" onClick={() => setLibraryOpen((open) => !open)}
              className="min-h-11 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold">Thư viện</button>
            <button type="button" onClick={() => onChange('')} disabled={busy}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-red-700">Gỡ ảnh</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-sm text-charcoal-600">Kéo-thả ảnh vào đây hoặc</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
              className="min-h-11 rounded-xl bg-honey-600 px-4 text-sm font-bold text-white disabled:opacity-50">
              {busy ? 'Đang tải…' : 'Tải ảnh lên'}
            </button>
            <button type="button" onClick={() => setLibraryOpen((open) => !open)}
              className="min-h-11 rounded-xl border border-cream-300 bg-white px-4 text-sm font-semibold">Chọn từ thư viện</button>
          </div>
          <p className="text-xs text-charcoal-500">JPEG, PNG, WebP · ảnh lớn được tự nén</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="hidden"
        onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} />
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {libraryOpen && <div className="max-h-64 overflow-y-auto rounded-xl border border-cream-200 bg-white p-2">
      {!assets && <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({ length: 5 }, (_, index) =>
        <div key={index} className="h-20 rounded-lg shimmer" />)}</div>}
      {assets?.length === 0 && <p className="p-3 text-sm text-charcoal-500">Thư viện chưa có ảnh.</p>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {(assets || []).map((asset) => <button key={asset.id} type="button" title={asset.altText || asset.publicId || ''}
          onClick={() => { onChange(asset.url); setLibraryOpen(false); }}
          className="overflow-hidden rounded-lg border border-cream-200 hover:border-honey-500">
          <img src={cloudinaryImage(asset.url, { width: 200 })} alt={asset.altText || 'Ảnh thư viện'} loading="lazy" className="h-20 w-full object-cover" />
        </button>)}
      </div>
    </div>}
  </div>;
}

type MediaListPickerProps = {
  values: string[];
  onChange: (urls: string[]) => void;
  label: string;
  max?: number;
  onError?: (message: string) => void;
};

/** Danh sách ảnh (ví dụ lookbook): thêm, gỡ và sắp xếp thứ tự. */
export function MediaListPicker({ values, onChange, label, max = 12, onError }: MediaListPickerProps) {
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return <div className="space-y-3">
    <span className="block text-sm font-semibold">{label} ({values.length}/{max})</span>
    {values.map((url, index) => <div key={`${url}-${index}`} className="flex items-start gap-2">
      <div className="flex-1">
        <MediaPicker label={`Ảnh ${index + 1}`} value={url} aspect="square" onError={onError}
          onChange={(next) => onChange(values.map((item, position) => position === index ? next : item).filter(Boolean))} />
      </div>
      <div className="flex flex-col gap-1 pt-6">
        <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Đưa lên"
          className="min-h-9 rounded-lg border border-cream-300 px-2 text-sm disabled:opacity-40">↑</button>
        <button type="button" onClick={() => move(index, 1)} disabled={index === values.length - 1} aria-label="Đưa xuống"
          className="min-h-9 rounded-lg border border-cream-300 px-2 text-sm disabled:opacity-40">↓</button>
      </div>
    </div>)}
    {values.length < max && <MediaPicker label="Thêm ảnh" value="" aspect="square" onError={onError}
      onChange={(url) => { if (url) onChange([...values, url]); }} />}
  </div>;
}
