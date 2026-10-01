'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { DataTable, type Column, type TableQuery } from '@/components/admin/DataTable';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { compressImage, SCREENSHOT_OPTIONS } from '@/client/image-compress';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { FEEDBACK_BATCH_MAX, FEEDBACK_CAPTION_MAX } from '@/lib/content/testimonial-input';
import type { AdminTestimonial } from '@/types/admin-content';

export type FeedbackProductOption = { id: string; name: string; thumbnail: string };
type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; testimonial: AdminTestimonial };
type Draft = { key: string; imageUrl: string; caption: string; productId: string };

const field = 'mt-1 block w-full rounded-xl border p-3';
const normalize = (text: string) => text.toLocaleLowerCase('vi-VN').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

async function fetchTestimonials(query: TableQuery) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: query.filter });
  const response = await fetch(`/api/admin/testimonials?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không tải được feedback');
  return { items: data.items as AdminTestimonial[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

/** Tải một ảnh chụp màn hình lên thư viện media (đã nén nếu ảnh quá nặng), trả về URL. */
async function uploadScreenshot(file: File) {
  const prepared = await compressImage(file, SCREENSHOT_OPTIONS).catch(() => file);
  const body = new FormData();
  body.set('file', prepared);
  body.set('altText', 'Feedback khách hàng');
  const response = await fetch('/api/admin/media', { method: 'POST', body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Tải ảnh thất bại');
  return data.asset.url as string;
}

export function TestimonialManager({ products }: { products: FeedbackProductOption[] }) {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState('');
  const back = (text?: string) => { if (text) setMessage(text); setView({ mode: 'list' }); setReloadKey((key) => key + 1); };

  if (view.mode === 'create') return <FeedbackUploader products={products} onDone={back} />;
  if (view.mode === 'edit') return <FeedbackEditor testimonial={view.testimonial} products={products} onDone={back} />;

  const columns: Column<AdminTestimonial>[] = [
    { key: 'image', header: 'Ảnh', className: 'w-20', render: (row) => <img src={cloudinaryImage(row.imageUrl, { width: 120 })} alt=""
        className="h-20 w-12 rounded-lg border border-cream-200 bg-cream-100 object-cover object-top" /> },
    { key: 'caption', header: 'Chú thích', render: (row) => <div className="max-w-xs">
        <p className="line-clamp-2 text-sm font-semibold text-charcoal-900">{row.caption || '—'}</p>
        {row.productName && <p className="truncate text-xs text-charcoal-500">Sản phẩm: {row.productName}</p>}
      </div> },
    { key: 'order', header: 'Thứ tự', render: (row) => row.sortOrder },
    { key: 'consent', header: 'Đồng ý công bố', render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      row.consentConfirmed ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-charcoal-600'}`}>
      {row.consentConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</span> },
    { key: 'status', header: 'Hiển thị', render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      row.isPublished && row.consentConfirmed ? 'bg-honey-100 text-honey-800' : 'bg-cream-200 text-charcoal-600'}`}>
      {row.isPublished && row.consentConfirmed ? 'Đang công bố' : 'Bản nháp'}</span> },
  ];

  return <div className="space-y-4">
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    <DataTable columns={columns} fetchPage={fetchTestimonials} reloadKey={reloadKey} pageSize={12}
      searchPlaceholder="Tìm theo chú thích hoặc sản phẩm"
      filters={[{ value: 'published', label: 'Đang công bố' }, { value: 'draft', label: 'Bản nháp' }]}
      emptyText="Chưa có feedback nào. Bấm “Thêm feedback” để tải ảnh chụp tin nhắn của khách."
      onRowClick={(row) => setView({ mode: 'edit', testimonial: row })}
      toolbar={<button type="button" onClick={() => setView({ mode: 'create' })}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">
        <ImagePlus className="size-4" aria-hidden />Thêm feedback</button>} />
    <p className="text-xs text-charcoal-500">
      Feedback là ảnh chụp màn hình tin nhắn khách khen shop. Trang chủ hiện 12 ảnh đầu dạng story, trang /feedback hiện toàn bộ
      dạng album. Chỉ ảnh đã xác nhận khách đồng ý và bật công bố mới hiển thị.
    </p>
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
      {selected.thumbnail && <img src={selected.thumbnail} alt="" className="size-9 rounded-lg object-cover" />}
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
          {product.thumbnail && <img src={product.thumbnail} alt="" className="size-9 rounded-lg object-cover" />}
          <span className="truncate text-sm">{product.name}</span>
        </button>
      </li>)}
      {matches.length === 0 && <li className="p-3 text-sm text-charcoal-500">Không có sản phẩm phù hợp</li>}
    </ul>}
  </div>;
}

function PublishSettings({ consent, publish, sortOrder, onChange }: {
  consent: boolean; publish: boolean; sortOrder: string;
  onChange: (next: { consent?: boolean; publish?: boolean; sortOrder?: string }) => void;
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
      <label className="flex items-center gap-2">Thứ tự hiển thị
        <input type="number" min="0" max="999" value={sortOrder} onChange={(event) => onChange({ sortOrder: event.target.value })}
          className="w-24 rounded-xl border p-2" />
      </label>
    </div>
    <p className="text-xs text-charcoal-500">Số nhỏ hiện trước; cùng thứ tự thì ảnh mới thêm hiện trước.</p>
  </div>;
}

/** Thêm nhiều ảnh feedback một lần: kéo-thả cả loạt ảnh chụp màn hình, ghi chú từng ảnh rồi lưu. */
function FeedbackUploader({ products, onDone }: { products: FeedbackProductOption[]; onDone: (message?: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState({ consent: false, publish: false, sortOrder: '0' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const room = FEEDBACK_BATCH_MAX - drafts.length;

  const addUrls = (urls: string[]) => setDrafts((current) => [...current,
    ...urls.filter((url) => !current.some((draft) => draft.imageUrl === url))
      .map((imageUrl) => ({ key: `${imageUrl}-${Math.random().toString(36).slice(2)}`, imageUrl, caption: '', productId: '' }))]
    .slice(0, FEEDBACK_BATCH_MAX));

  const upload = async (list: FileList | File[]) => {
    const files = Array.from(list).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;
    const accepted = files.slice(0, room);
    setError(files.length > room ? `Mỗi lần thêm tối đa ${FEEDBACK_BATCH_MAX} ảnh; ${files.length - room} ảnh đã bỏ qua.` : '');
    setProgress({ done: 0, total: accepted.length });
    const failures: string[] = [];
    // Tải lần lượt từng ảnh: mỗi request nhỏ, có tiến độ, một ảnh lỗi không làm hỏng cả loạt.
    for (const [index, file] of accepted.entries()) {
      try { addUrls([await uploadScreenshot(file)]); }
      catch (uploadError) { failures.push(`${file.name}: ${uploadError instanceof Error ? uploadError.message : 'lỗi'}`); }
      setProgress({ done: index + 1, total: accepted.length });
    }
    setProgress(null);
    if (failures.length) setError(`Không tải được ${failures.length} ảnh — ${failures.join('; ')}`);
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
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/testimonials', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentConfirmed: settings.consent, isPublished: settings.publish, sortOrder: Number(settings.sortOrder) || 0,
          items: drafts.map(({ imageUrl, caption, productId }) => ({ imageUrl, caption, productId })) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không lưu được feedback');
      onDone(`Đã thêm ${data.count} feedback${settings.publish ? ' và công bố trên website' : ' (bản nháp)'}.`);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5 rounded-2xl border border-cream-200 bg-white p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">Thêm feedback</h2>
        <p className="text-xs text-charcoal-500">Tải tối đa {FEEDBACK_BATCH_MAX} ảnh chụp màn hình tin nhắn mỗi lần. Ảnh nặng được nén tự động.</p>
      </div>
      <button type="button" onClick={() => onDone()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    {room > 0 && <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files); }}
      className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
        dragging ? 'border-honey-500 bg-honey-50' : 'border-cream-300 bg-cream-50'}`}>
      <Upload className="size-8 text-honey-600" aria-hidden />
      <p className="text-sm text-charcoal-700">Kéo-thả nhiều ảnh vào đây, hoặc</p>
      <button type="button" disabled={Boolean(progress)} onClick={() => inputRef.current?.click()}
        className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white disabled:opacity-50">
        {progress ? `Đang tải ${progress.done}/${progress.total}…` : 'Chọn ảnh từ máy'}
      </button>
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="hidden"
        onChange={(event) => { if (event.target.files) void upload(event.target.files); event.target.value = ''; }} />
      <div className="w-full max-w-sm text-left">
        <MediaPicker label="Hoặc chọn một ảnh có sẵn trong thư viện" value="" aspect="square" onError={setError}
          onChange={(url) => { if (url) addUrls([url]); }} />
      </div>
    </div>}

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
      <PublishSettings consent={settings.consent} publish={settings.publish} sortOrder={settings.sortOrder}
        onChange={(next) => setSettings((current) => ({ ...current, ...next }))} />
      <button type="button" disabled={busy || Boolean(progress)} onClick={() => void save()}
        className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">
        {busy ? 'Đang lưu…' : `Lưu ${drafts.length} feedback`}
      </button>
    </>}
  </div>;
}

/** Sửa một feedback: đổi ảnh, chú thích, sản phẩm liên quan, thứ tự, trạng thái công bố hoặc xóa. */
function FeedbackEditor({ testimonial, products, onDone }: {
  testimonial: AdminTestimonial; products: FeedbackProductOption[]; onDone: (message?: string) => void;
}) {
  const [draft, setDraft] = useState({ imageUrl: testimonial.imageUrl, caption: testimonial.caption || '',
    productId: testimonial.productId || '', consent: testimonial.consentConfirmed, publish: testimonial.isPublished,
    sortOrder: String(testimonial.sortOrder) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.imageUrl) { setError('Cần chọn ảnh feedback'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/testimonials/${testimonial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: draft.imageUrl, caption: draft.caption, productId: draft.productId,
          consentConfirmed: draft.consent, isPublished: draft.publish, sortOrder: Number(draft.sortOrder) || 0 }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không lưu được feedback');
      onDone('Đã lưu feedback.');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm('Xóa feedback này khỏi website? Ảnh vẫn còn trong thư viện ảnh.')) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/testimonials/${testimonial.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Không xóa được feedback');
      onDone('Đã xóa feedback.');
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : 'Có lỗi xảy ra'); setBusy(false); }
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
        <MediaPicker label="Đổi ảnh" value="" aspect="square" onError={setError}
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
        <PublishSettings consent={draft.consent} publish={draft.publish} sortOrder={draft.sortOrder}
          onChange={(next) => setDraft((current) => ({ ...current, ...next }))} />
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
