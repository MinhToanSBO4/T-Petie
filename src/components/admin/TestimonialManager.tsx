'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronsUp, GripVertical, ImagePlus, Images, ListOrdered, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { DataTable, tableParams, type Column, type TableFilter, type TableQuery } from '@/components/admin/DataTable';
import { MediaPicker, type MediaAssetRow } from '@/components/admin/MediaPicker';
import { SCREENSHOT_OPTIONS } from '@/client/image-compress';
import { uploadMediaBatch } from '@/client/media-upload';
import { errorText, toast } from '@/client/toast';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { FEEDBACK_BATCH_MAX, FEEDBACK_CAPTION_MAX, HOME_FEEDBACK_LIMIT as HOME_STORY_COUNT } from '@/lib/content/testimonial-input';
import type { AdminTestimonial } from '@/types/admin-content';

export type FeedbackProductOption = { id: string; name: string; thumbnail: string };
type View = { mode: 'list' } | { mode: 'create' } | { mode: 'order' } | { mode: 'edit'; testimonial: AdminTestimonial };
type Draft = { key: string; imageUrl: string; caption: string; productId: string };
const field = 'mt-1 block w-full rounded-xl border p-3';
const normalize = (text: string) => text.toLocaleLowerCase('vi-VN').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

/** Mặc định đúng thứ tự khách thấy trên website. */
const FEEDBACK_SORTS = [{ value: 'display', label: 'Thứ tự trên website' }, { value: 'newest', label: 'Mới thêm nhất' }];
const FEEDBACK_FILTERS: TableFilter[] = [
  { key: 'filter', label: 'Trạng thái', options: [{ value: 'published', label: 'Đang công bố' }, { value: 'draft', label: 'Bản nháp' }] },
  { key: 'product', label: 'Sản phẩm được khen', all: 'Tất cả sản phẩm',
    options: [{ value: 'linked', label: 'Đã gắn sản phẩm' }, { value: 'unlinked', label: 'Chưa gắn sản phẩm' }] },
];

async function fetchTestimonials(query: TableQuery) {
  const response = await fetch(`/api/admin/testimonials?${tableParams(query)}`, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Không tải được feedback');
  return { items: data.items as AdminTestimonial[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function TestimonialManager({ products }: { products: FeedbackProductOption[] }) {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const back = () => { setView({ mode: 'list' }); setReloadKey((key) => key + 1); };

  if (view.mode === 'create') return <FeedbackUploader products={products} onDone={back} />;
  if (view.mode === 'order') return <FeedbackOrderEditor onDone={back} />;
  if (view.mode === 'edit') return <FeedbackEditor testimonial={view.testimonial} products={products} onDone={back} />;

  const columns: Column<AdminTestimonial>[] = [
    { key: 'image', header: 'Ảnh', className: 'w-20', render: (row) => <img src={cloudinaryImage(row.imageUrl, { width: 120 })} alt=""
        className="h-20 w-12 rounded-lg border border-cream-200 bg-cream-100 object-cover object-top" /> },
    { key: 'caption', header: 'Chú thích', render: (row) => <div className="max-w-xs">
        <p className="line-clamp-2 text-sm font-semibold text-charcoal-900">{row.caption || '—'}</p>
        {row.productName && <p className="truncate text-xs text-charcoal-500">Sản phẩm: {row.productName}</p>}
      </div> },
    { key: 'consent', header: 'Đồng ý công bố', render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      row.consentConfirmed ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-charcoal-600'}`}>
      {row.consentConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</span> },
    { key: 'status', header: 'Hiển thị', render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      row.isPublished && row.consentConfirmed ? 'bg-honey-100 text-honey-800' : 'bg-cream-200 text-charcoal-600'}`}>
      {row.isPublished && row.consentConfirmed ? 'Đang công bố' : 'Bản nháp'}</span> },
  ];

  return <div className="space-y-4">
    <DataTable columns={columns} fetchPage={fetchTestimonials} reloadKey={reloadKey} pageSize={12}
      searchPlaceholder="Tìm chú thích hoặc sản phẩm"
      sorts={FEEDBACK_SORTS} filters={FEEDBACK_FILTERS}
      emptyText="Chưa có feedback nào. Bấm “Thêm feedback” để tải ảnh feedback của khách."
      onRowClick={(row) => setView({ mode: 'edit', testimonial: row })}
      toolbar={<>
        <button type="button" onClick={() => setView({ mode: 'order' })}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-honey-300 bg-white px-4 text-sm font-semibold text-honey-800 hover:bg-honey-50">
          <ListOrdered className="size-4" aria-hidden />Sắp xếp hiển thị</button>
        <button type="button" onClick={() => setView({ mode: 'create' })}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">
          <ImagePlus className="size-4" aria-hidden />Thêm feedback</button>
      </>} />
  </div>;
}

/** Ô chọn sản phẩm được khen (không bắt buộc), tìm theo tên không cần gõ dấu. */
function ProductPicker({ products, value, onChange }: {
  products: FeedbackProductOption[]; value: string; onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = products.find((product) => product.id === value);
  if (selected && !open) {
    return <div className="mt-1 flex items-center gap-2 rounded-xl border border-cream-300 p-2">
      {selected.thumbnail && <img src={cloudinaryImage(selected.thumbnail, { width: 72 })} alt="" className="size-9 rounded-lg object-cover" />}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{selected.name}</span>
      <button type="button" onClick={() => setOpen(true)} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-honey-700">Đổi</button>
      <button type="button" onClick={() => onChange('')} aria-label="Bỏ sản phẩm liên quan" className="grid size-9 place-items-center rounded-lg text-charcoal-500 hover:text-red-700">
        <X className="size-4" /></button>
    </div>;
  }
  const matches = products.filter((product) => normalize(product.name).includes(normalize(query))).slice(0, 8);
  return <div className="relative">
    <input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
      onBlur={() => window.setTimeout(() => setOpen(false), 150)} placeholder="Tìm sản phẩm được khen (không bắt buộc)"
      className={field} aria-label="Sản phẩm liên quan" />
    {open && <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-cream-200 bg-white p-1 shadow-lg">
      {matches.map((product) => <li key={product.id}>
        <button type="button" onMouseDown={(event) => event.preventDefault()}
          onClick={() => { onChange(product.id); setOpen(false); setQuery(''); }}
          className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-cream-50">
          {product.thumbnail && <img src={cloudinaryImage(product.thumbnail, { width: 72 })} alt="" className="size-9 rounded-lg object-cover" />}
          <span className="truncate text-sm">{product.name}</span>
        </button>
      </li>)}
      {matches.length === 0 && <li className="p-3 text-sm text-charcoal-500">Không có sản phẩm phù hợp</li>}
    </ul>}
  </div>;
}

function PublishSettings({ consent, publish, onChange }: {
  consent: boolean; publish: boolean;
  onChange: (next: { consent?: boolean; publish?: boolean }) => void;
}) {
  return <div className="space-y-3 rounded-2xl border border-cream-200 bg-cream-50 p-4">
    <p className="flex items-start gap-2 text-xs text-charcoal-700">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sage-700" aria-hidden />
      Trước khi đăng: che số điện thoại, ảnh đại diện và tên tài khoản của khách nếu khách không muốn công khai.
      Chỉ bật công bố khi khách đã đồng ý cho shop đăng ảnh.
    </p>
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" className="size-5" checked={consent}
          onChange={(event) => onChange({ consent: event.target.checked, ...(event.target.checked ? {} : { publish: false }) })} />
        Khách đã đồng ý công bố
      </label>
      <label className={`flex min-h-11 items-center gap-2 ${consent ? '' : 'opacity-50'}`}>
        <input type="checkbox" className="size-5" checked={publish} disabled={!consent}
          onChange={(event) => onChange({ publish: event.target.checked })} />
        Công bố trên website
      </label>
    </div>
  </div>;
}

/** Chọn nhiều ảnh có sẵn trong thư viện media cùng lúc. */
function LibraryPicker({ room, exclude, onPick, onClose }: {
  room: number; exclude: string[]; onPick: (urls: string[]) => void; onClose: () => void;
}) {
  const [assets, setAssets] = useState<MediaAssetRow[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/media', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Không tải được thư viện ảnh')))
      .then((data) => setAssets(data.assets || []))
      .catch((libraryError) => {
        if (controller.signal.aborted) return;
        const text = errorText(libraryError, 'Không tải được thư viện ảnh');
        setError(text); toast.error(text);
      });
    return () => controller.abort();
  }, []);
  const available = (assets || []).filter((asset) => !exclude.includes(asset.url));
  const toggle = (url: string) => setPicked((current) => current.includes(url)
    ? current.filter((item) => item !== url) : current.length < room ? [...current, url] : current);

  return <div className="w-full space-y-3 rounded-2xl border border-cream-200 bg-white p-3 text-left">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-charcoal-800">Chọn ảnh trong thư viện <span className="font-normal text-charcoal-500">· tối đa {room} ảnh</span></p>
      <button type="button" onClick={onClose} aria-label="Đóng thư viện" className="grid size-9 place-items-center rounded-lg text-charcoal-500 hover:bg-cream-100">
        <X className="size-4" /></button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!assets && !error && <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: 6 }, (_, index) =>
      <div key={index} className="aspect-[3/4] rounded-lg shimmer" />)}</div>}
    {assets && available.length === 0 && <p className="p-3 text-sm text-charcoal-500">Thư viện chưa có ảnh nào khác để chọn.</p>}
    <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
      {available.map((asset) => {
        const order = picked.indexOf(asset.url);
        return <button key={asset.id} type="button" onClick={() => toggle(asset.url)} aria-pressed={order >= 0}
          title={asset.altText || asset.publicId || ''}
          className={`relative overflow-hidden rounded-lg border-2 ${order >= 0 ? 'border-honey-500' : 'border-transparent hover:border-honey-200'}`}>
          <img src={cloudinaryImage(asset.url, { width: 200 })} alt={asset.altText || 'Ảnh thư viện'} className="aspect-[3/4] w-full bg-cream-100 object-cover object-top" />
          {order >= 0 && <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-honey-600 text-xs font-bold text-white">{order + 1}</span>}
        </button>;
      })}
    </div>
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-charcoal-600 hover:bg-cream-100">Hủy</button>
      <button type="button" disabled={!picked.length} onClick={() => onPick(picked)}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-honey-600 px-4 text-sm font-bold text-white disabled:opacity-50">
        <Check className="size-4" aria-hidden />Thêm {picked.length || ''} ảnh
      </button>
    </div>
  </div>;
}

/** Thêm nhiều ảnh feedback một lần: kéo-thả cả loạt ảnh chụp màn hình (hoặc chọn trong thư viện), ghi chú từng ảnh rồi lưu. */
function FeedbackUploader({ products, onDone }: { products: FeedbackProductOption[]; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settings, setSettings] = useState({ consent: false, publish: false });
  const [busy, setBusy] = useState(false);
  // Lỗi tải ảnh / lưu hiện ngay trên form (thông báo góc màn hình tự ẩn sau vài giây).
  const [uploadError, setUploadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const room = FEEDBACK_BATCH_MAX - drafts.length;

  const addUrls = (urls: string[]) => setDrafts((current) => [...current,
    ...urls.filter((url) => !current.some((draft) => draft.imageUrl === url))
      .map((imageUrl) => ({ key: `${imageUrl}-${Math.random().toString(36).slice(2)}`, imageUrl, caption: '', productId: '' }))]
    .slice(0, FEEDBACK_BATCH_MAX));

  const upload = async (list: FileList | File[]) => {
    const files = Array.from(list).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;
    const accepted = files.slice(0, Math.max(0, room));
    if (files.length > accepted.length) toast.warning(`Mỗi lần thêm tối đa ${FEEDBACK_BATCH_MAX} ảnh; ${files.length - accepted.length} ảnh đã bỏ qua`);
    if (accepted.length === 0) return;
    setUploading(true); setUploadError('');
    // Tải lần lượt từng ảnh: mỗi request nhỏ, có tiến độ, một ảnh lỗi không làm hỏng cả loạt.
    try { setUploadError((await uploadMediaBatch(accepted, SCREENSHOT_OPTIONS, 'Feedback khách hàng', (asset) => addUrls([asset.url]))).error); }
    finally { setUploading(false); }
  };

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, ...patch } : draft));
  const move = (index: number, direction: -1 | 1) => setDrafts((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const save = async () => {
    setBusy(true); setSaveError('');
    const id = toast.loading(`Đang lưu ${drafts.length} feedback…`);
    try {
      const response = await fetch('/api/admin/testimonials', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentConfirmed: settings.consent, isPublished: settings.publish,
          items: drafts.map(({ imageUrl, caption, productId }) => ({ imageUrl, caption, productId })) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không lưu được feedback');
      toast.success(settings.publish ? `Đã thêm và công bố ${data.count} feedback` : `Đã thêm ${data.count} feedback (bản nháp)`, { id });
      onDone();
    } catch (failure) {
      const text = errorText(failure, 'Không lưu được feedback');
      setSaveError(text); toast.error(text, { id });
    }
    finally { setBusy(false); }
  };

  return <div className="space-y-5 rounded-2xl border border-cream-200 bg-white p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">Thêm feedback</h2>
        <p className="text-xs text-charcoal-500">Tải tối đa {FEEDBACK_BATCH_MAX} ảnh feedback mỗi lần. Ảnh nặng được nén tự động.</p>
      </div>
      <button type="button" onClick={() => onDone()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>

    {room > 0 && <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files); }}
      className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
        dragging ? 'border-honey-500 bg-honey-50' : 'border-cream-300 bg-cream-50'}`}>
      <Upload className="size-8 text-honey-600" aria-hidden />
      <p className="text-sm text-charcoal-700">Kéo-thả nhiều ảnh vào đây, hoặc</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white disabled:opacity-50">
          <Upload className="size-4" aria-hidden />{uploading ? 'Đang tải…' : 'Chọn ảnh từ máy'}
        </button>
        <button type="button" disabled={uploading} onClick={() => setLibraryOpen((open) => !open)} aria-expanded={libraryOpen}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cream-300 bg-white px-5 text-sm font-semibold text-charcoal-800 disabled:opacity-50">
          <Images className="size-4" aria-hidden />Chọn từ thư viện
        </button>
      </div>
      <p className="text-xs text-charcoal-500">JPEG, PNG, WebP, AVIF · ảnh lớn được nén trước khi tải lên</p>
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="hidden"
        onChange={(event) => { if (event.target.files) void upload(event.target.files); event.target.value = ''; }} />
      {libraryOpen && <LibraryPicker room={room} exclude={drafts.map((draft) => draft.imageUrl)}
        onClose={() => setLibraryOpen(false)} onPick={(urls) => { addUrls(urls); setLibraryOpen(false); }} />}
    </div>}
    {uploadError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{uploadError}</p>}

    {drafts.length > 0 && <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {drafts.map((draft, index) => <li key={draft.key} className="space-y-2 rounded-2xl border border-cream-200 p-3">
        <div className="flex gap-3">
          <img src={cloudinaryImage(draft.imageUrl, { width: 240 })} alt={`Ảnh ${index + 1}`}
            className="aspect-[9/16] w-24 shrink-0 rounded-xl border border-cream-200 bg-cream-100 object-cover object-top" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-600">Ảnh {index + 1}</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Đưa lên trước"
                  className="grid size-9 place-items-center rounded-lg border border-cream-300 disabled:opacity-40"><ArrowLeft className="size-4" /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === drafts.length - 1} aria-label="Đưa ra sau"
                  className="grid size-9 place-items-center rounded-lg border border-cream-300 disabled:opacity-40"><ArrowRight className="size-4" /></button>
                <button type="button" onClick={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}
                  aria-label="Bỏ ảnh này" className="grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50"><Trash2 className="size-4" /></button>
              </span>
            </div>
            <label className="block text-xs font-semibold">Chú thích (không bắt buộc)
              <input value={draft.caption} maxLength={FEEDBACK_CAPTION_MAX} placeholder="VD: Mẹ bé Na · Hà Nội"
                onChange={(event) => update(draft.key, { caption: event.target.value })} className={`${field} p-2 text-sm`} />
            </label>
          </div>
        </div>
        <ProductPicker products={products} value={draft.productId} onChange={(productId) => update(draft.key, { productId })} />
      </li>)}
    </ol>}

    {drafts.length > 0 && <>
      <PublishSettings consent={settings.consent} publish={settings.publish}
        onChange={(next) => setSettings((current) => ({ ...current, ...next }))} />
      <p className="text-xs text-charcoal-500">Các ảnh được thêm vào đầu danh sách theo đúng thứ tự trên (ảnh 1 hiện trước).</p>
      <button type="button" disabled={busy || uploading} onClick={() => void save()}
        className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">
        {busy ? 'Đang lưu…' : `Lưu ${drafts.length} feedback`}
      </button>
      {saveError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
    </>}
  </div>;
}

type OrderItem = { id: string; imageUrl: string; caption: string | null };

/**
 * Sắp xếp feedback đang công bố bằng kéo-thả (máy tính) hoặc nút mũi tên (điện thoại): thấy đúng thứ tự khách nhìn thấy,
 * 12 ảnh đầu được đánh dấu "Trang chủ". Lưu một lần cho cả danh sách.
 */
function FeedbackOrderEditor({ onDone }: { onDone: () => void }) {
  const [items, setItems] = useState<OrderItem[] | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/testimonials/order', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Không tải được danh sách feedback')))
      .then((data) => setItems(data.items || []))
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        const text = errorText(loadError, 'Không tải được danh sách feedback');
        setError(text); toast.error(text);
      });
    return () => controller.abort();
  }, []);

  const moveTo = (from: number, to: number) => {
    if (!items || from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setItems(next);
    setChanged(true);
  };

  const save = async () => {
    if (!items) return;
    setBusy(true); setError('');
    const id = toast.loading('Đang lưu thứ tự hiển thị…');
    try {
      const response = await fetch('/api/admin/testimonials/order', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: items.map((item) => item.id) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không lưu được thứ tự');
      toast.success('Đã lưu thứ tự hiển thị feedback', { id });
      onDone();
    } catch (saveError) {
      const text = errorText(saveError, 'Không lưu được thứ tự');
      setError(text); toast.error(text, { id }); setBusy(false);
    }
  };

  return <div className="space-y-5 rounded-2xl border border-cream-200 bg-white p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">Sắp xếp hiển thị</h2>
        <p className="text-xs text-charcoal-500">Kéo-thả ảnh (hoặc bấm mũi tên) để đổi vị trí. Ảnh 1 hiện đầu tiên; {HOME_STORY_COUNT} ảnh đầu hiện ở trang chủ.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onDone()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
        <button type="button" disabled={!changed || busy} onClick={() => void save()}
          className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu thứ tự'}</button>
      </div>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!items && !error && <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, index) =>
      <div key={index} className="aspect-[9/16] rounded-xl shimmer" />)}</div>}
    {items && items.length === 0 && <p className="text-sm text-charcoal-500">Chưa có feedback nào đang công bố.</p>}
    {items && items.length > 0 && <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((item, index) => <li key={item.id} draggable
        onDragStart={(event) => { setDragged(index); event.dataTransfer.effectAllowed = 'move'; }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
        onDrop={(event) => { event.preventDefault(); if (dragged !== null) moveTo(dragged, index); setDragged(null); }}
        onDragEnd={() => setDragged(null)}
        className={`space-y-2 rounded-2xl border p-2 transition-opacity ${dragged === index ? 'opacity-40' : ''} ${
          index < HOME_STORY_COUNT ? 'border-honey-300 bg-honey-50/40' : 'border-cream-200 bg-white'}`}>
        <div className="relative cursor-grab active:cursor-grabbing">
          <img src={cloudinaryImage(item.imageUrl, { width: 240 })} alt={item.caption || `Feedback ${index + 1}`} draggable={false}
            className="aspect-[9/16] w-full rounded-xl border border-cream-200 bg-cream-100 object-cover object-top" />
          <span className="absolute left-1.5 top-1.5 grid min-w-7 place-items-center rounded-full bg-charcoal-900/80 px-1.5 py-0.5 text-xs font-bold text-white">{index + 1}</span>
          {index < HOME_STORY_COUNT && <span className="absolute right-1.5 top-1.5 rounded-full bg-honey-600 px-2 py-0.5 text-[10px] font-bold text-white">Trang chủ</span>}
          <GripVertical className="absolute bottom-1.5 right-1.5 size-5 rounded bg-white/80 text-charcoal-600" aria-hidden />
        </div>
        <p className="line-clamp-1 text-xs text-charcoal-600">{item.caption || '—'}</p>
        <div className="flex justify-between gap-1">
          <button type="button" onClick={() => moveTo(index, 0)} disabled={index === 0} aria-label={`Đưa ảnh ${index + 1} lên đầu`}
            className="grid size-9 place-items-center rounded-lg border border-cream-300 disabled:opacity-40"><ChevronsUp className="size-4" /></button>
          <button type="button" onClick={() => moveTo(index, index - 1)} disabled={index === 0} aria-label={`Đưa ảnh ${index + 1} lên trước`}
            className="grid size-9 place-items-center rounded-lg border border-cream-300 disabled:opacity-40"><ArrowLeft className="size-4" /></button>
          <button type="button" onClick={() => moveTo(index, index + 1)} disabled={index === items.length - 1} aria-label={`Đưa ảnh ${index + 1} ra sau`}
            className="grid size-9 place-items-center rounded-lg border border-cream-300 disabled:opacity-40"><ArrowRight className="size-4" /></button>
        </div>
      </li>)}
    </ol>}
  </div>;
}

/** Sửa một feedback: đổi ảnh, chú thích, sản phẩm liên quan, trạng thái công bố hoặc xóa (vị trí hiển thị giữ nguyên). */
function FeedbackEditor({ testimonial, products, onDone }: {
  testimonial: AdminTestimonial; products: FeedbackProductOption[]; onDone: () => void;
}) {
  const [draft, setDraft] = useState({ imageUrl: testimonial.imageUrl, caption: testimonial.caption || '',
    productId: testimonial.productId || '', consent: testimonial.consentConfirmed, publish: testimonial.isPublished });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.imageUrl) { setError('Cần chọn ảnh feedback'); toast.error('Cần chọn ảnh feedback'); return; }
    setBusy(true); setError('');
    const id = toast.loading('Đang lưu feedback…');
    try {
      const response = await fetch(`/api/admin/testimonials/${testimonial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: draft.imageUrl, caption: draft.caption, productId: draft.productId,
          consentConfirmed: draft.consent, isPublished: draft.publish }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không lưu được feedback');
      toast.success('Đã lưu feedback', { id });
      onDone();
    } catch (saveError) {
      const text = errorText(saveError, 'Không lưu được feedback');
      setError(text); toast.error(text, { id });
    }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm('Xóa feedback này khỏi website? Ảnh vẫn còn trong thư viện ảnh.')) return;
    setBusy(true); setError('');
    const id = toast.loading('Đang xóa feedback…');
    try {
      const response = await fetch(`/api/admin/testimonials/${testimonial.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không xóa được feedback');
      toast.success('Đã xóa feedback', { id });
      onDone();
    } catch (removeError) {
      const text = errorText(removeError, 'Không xóa được feedback');
      setError(text); toast.error(text, { id }); setBusy(false);
    }
  };

  return <form onSubmit={save} className="space-y-5 rounded-2xl border border-cream-200 bg-white p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold">Sửa feedback</h2>
      <button type="button" onClick={() => onDone()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_1fr]">
      <div className="space-y-2">
        {draft.imageUrl && <img src={cloudinaryImage(draft.imageUrl, { width: 520 })} alt="Ảnh feedback"
          className="max-h-[32rem] w-full rounded-2xl border border-cream-200 bg-cream-100 object-contain" />}
        <MediaPicker label="Đổi ảnh" value="" aspect="square"
          onChange={(imageUrl) => { if (imageUrl) setDraft((current) => ({ ...current, imageUrl })); }} />
      </div>
      <div className="space-y-4">
        <label className="block text-sm font-semibold">Chú thích (không bắt buộc)
          <input value={draft.caption} maxLength={FEEDBACK_CAPTION_MAX} placeholder="VD: Mẹ bé Na · Hà Nội"
            onChange={(event) => setDraft({ ...draft, caption: event.target.value })} className={field} />
        </label>
        <div className="text-sm font-semibold">Sản phẩm được khen
          <ProductPicker products={products} value={draft.productId} onChange={(productId) => setDraft({ ...draft, productId })} />
        </div>
        <PublishSettings consent={draft.consent} publish={draft.publish}
          onChange={(next) => setDraft((current) => ({ ...current, ...next }))} />
        <p className="text-xs text-charcoal-500">Muốn đổi vị trí hiển thị, dùng “Sắp xếp hiển thị” ở danh sách feedback.</p>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Đang lưu…' : 'Lưu feedback'}
          </button>
          <button type="button" disabled={busy} onClick={() => void remove()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            <Trash2 className="size-4" aria-hidden />Xóa feedback
          </button>
        </div>
      </div>
    </div>
  </form>;
}
