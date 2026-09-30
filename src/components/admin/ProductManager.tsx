'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react';
import { DataTable, type Column, type TableQuery } from '@/components/admin/DataTable';

type VariantRow = { id: string; size: string; stock: number; price: number; weightRange: string; ageRange: string };
type ProductRow = { id: string; slug: string; sku: string; name: string; active: boolean; price: number;
  description: string; originalPrice: number | null; discountPercent: number; collectionId: string | null;
  isBestSeller: boolean; isNewArrival: boolean; isSale: boolean;
  images: { id: string; url: string }[]; variants: VariantRow[] };
type CollectionOption = { id: string; title: string };
type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; product: ProductRow };

const field = 'mt-2 block w-full rounded-xl border-2 border-cream-300 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-honey-500 focus:ring-4 focus:ring-honey-100';
const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

/** Tổng tồn kho của sản phẩm trên mọi size đang bán. */
const totalStock = (product: ProductRow) => product.variants.reduce((sum, variant) => sum + variant.stock, 0);

/** Danh sách bộ sưu tập đi kèm mỗi lần tải bảng sản phẩm; form sửa dùng lại, không gọi API thêm. */
let collectionOptions: CollectionOption[] | null = null;

async function fetchProducts(query: TableQuery) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: query.filter });
  const response = await fetch(`/api/admin/products?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không tải được sản phẩm');
  if (Array.isArray(data.collections)) collectionOptions = data.collections;
  return { items: data.items as ProductRow[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function ProductManager({ canCreateProduct }: { canCreateProduct: boolean }) {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState('');
  const back = useCallback((text?: string) => { if (text) setMessage(text); setView({ mode: 'list' }); setReloadKey((key) => key + 1); }, []);

  if (view.mode === 'create') return <ProductCreateForm onDone={back} />;
  if (view.mode === 'edit') return <ProductEditForm product={view.product} onBack={back} />;

  const columns: Column<ProductRow>[] = [
    { key: 'image', header: 'Ảnh', className: 'w-20', render: (row) => row.images[0]
      ? <img src={row.images[0].url} alt={row.name} className="h-12 w-12 rounded-lg object-cover" />
      : <span className="text-xs text-charcoal-400">—</span> },
    { key: 'name', header: 'Sản phẩm', render: (row) => <div>
        <p className="font-semibold text-charcoal-900">{row.name}</p>
        <p className="text-xs text-charcoal-500">Mã sản phẩm: {row.sku}</p>
      </div> },
    { key: 'price', header: 'Giá', render: (row) => formatPrice(row.price) },
    { key: 'stock', header: 'Tồn kho', render: (row) => <span className={totalStock(row) === 0 ? 'font-bold text-red-700' : ''}>{totalStock(row)}</span> },
    { key: 'sizes', header: 'Size', render: (row) => <span className="text-xs text-charcoal-600">{row.variants.map((variant) => variant.size).join(', ') || '—'}</span> },
    { key: 'status', header: 'Trạng thái', render: (row) => <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
      row.active ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-charcoal-600'}`}>{row.active ? 'Đang bán' : 'Đang ẩn'}</span> },
    { key: 'action', header: '', render: (row) => <button type="button" onClick={(event) => { event.stopPropagation(); setView({ mode: 'edit', product: row }); }} className="min-h-9 whitespace-nowrap rounded-lg border border-cream-300 px-3 text-xs font-bold">Chỉnh sửa</button> },
  ];

  return <div className="space-y-4">
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    <DataTable columns={columns} fetchPage={fetchProducts} reloadKey={reloadKey}
      searchPlaceholder="Tìm theo tên, SKU hoặc slug"
      filters={[{ value: 'active', label: 'Đang bán' }, { value: 'hidden', label: 'Đang ẩn' }]}
      emptyText="Chưa có sản phẩm nào."
      onRowClick={(row) => setView({ mode: 'edit', product: row })}
      toolbar={canCreateProduct
        ? <button type="button" onClick={() => setView({ mode: 'create' })}
            className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">Thêm sản phẩm</button>
        : undefined} />
    <p className="text-xs text-charcoal-500">Bấm vào một dòng để xem chi tiết và chỉnh sửa sản phẩm.</p>
  </div>;
}

/** Tạo sản phẩm mới: tách riêng khỏi màn hình chỉnh sửa sản phẩm đã có. */
function ProductCreateForm({ onDone }: { onDone: (message?: string) => void }) {
  const [draft, setDraft] = useState({ name: '', slug: '', sku: '', price: '', size: 'Size 90', stock: '0' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, price: Number(draft.price), stock: Number(draft.stock) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tạo được sản phẩm');
      onDone(`Đã tạo sản phẩm ${draft.name}. Bấm vào dòng trong danh sách để thêm ảnh và size khác.`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="space-y-6 rounded-2xl border border-cream-200 bg-white p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold text-charcoal-900">Thêm sản phẩm mới</h2>
      <button type="button" onClick={() => onDone()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Tên sản phẩm
        <input className={field} required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="text-sm font-semibold">Slug
        <input className={field} required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug}
          onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} /></label>
      <label className="text-sm font-semibold">SKU
        <input className={field} required value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value.toUpperCase() })} /></label>
      <label className="text-sm font-semibold">Giá bán (đ)
        <input className={field} type="number" min="0" required value={draft.price}
          onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label>
      <label className="text-sm font-semibold">Size đầu tiên
        <input className={field} required value={draft.size} onChange={(event) => setDraft({ ...draft, size: event.target.value })} /></label>
      <label className="text-sm font-semibold">Tồn kho
        <input className={field} type="number" min="0" required value={draft.stock}
          onChange={(event) => setDraft({ ...draft, stock: event.target.value })} /></label>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="min-h-12 rounded-xl bg-honey-600 px-8 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang tạo…' : 'Tạo sản phẩm'}
    </button>
  </form>;
}

/**
 * Chi tiết và chỉnh sửa một sản phẩm đã có.
 * Mọi thay đổi — kể cả thêm, xóa hay sắp xếp ảnh — chỉ được ghi vào database
 * khi bấm "Lưu thay đổi"; nút "Hủy thay đổi" khôi phục lại trạng thái ban đầu.
 */
function ProductEditForm({ product, onBack }: { product: ProductRow; onBack: (message?: string) => void }) {
  const initial = {
    name: product.name, description: product.description, basePrice: String(product.price),
    originalPrice: product.originalPrice === null ? '' : String(product.originalPrice),
    discountPercent: String(product.discountPercent), collectionId: product.collectionId || '',
    isActive: product.active, isBestSeller: product.isBestSeller, isNewArrival: product.isNewArrival, isSale: product.isSale,
  };
  const [draft, setDraft] = useState(initial);
  const [variants, setVariants] = useState(product.variants.map((variant) => ({
    id: variant.id, size: variant.size, stock: String(variant.stock), price: String(variant.price) })));
  const [images, setImages] = useState(product.images.map((image) => image.url));
  const [newVariants, setNewVariants] = useState<{ size: string; price: string; stock: string }[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>(collectionOptions || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Nạp danh sách bộ sưu tập một lần để chọn cho sản phẩm.
  useEffect(() => {
    if (collectionOptions) return;
    const controller = new AbortController();
    fetch('/api/admin/collections?limit=50', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('unavailable')))
      .then((data) => setCollections(data.items || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const dirty = JSON.stringify({ draft, variants, images, newVariants }) !== JSON.stringify({
    draft: initial,
    variants: product.variants.map((variant) => ({ id: variant.id, size: variant.size, stock: String(variant.stock), price: String(variant.price) })),
    images: product.images.map((image) => image.url),
    newVariants: [] as { size: string; price: string; stock: string }[],
  });

  const cancel = () => {
    setDraft(initial);
    setVariants(product.variants.map((variant) => ({ id: variant.id, size: variant.size, stock: String(variant.stock), price: String(variant.price) })));
    setImages(product.images.map((image) => image.url));
    setNewVariants([]);
    setMessage('Đã hủy các thay đổi chưa lưu.');
    setError('');
  };

  const leave = () => {
    if (dirty && !window.confirm('Có thay đổi chưa lưu. Rời trang và bỏ các thay đổi đó?')) return;
    onBack();
  };

  /** Tải nhiều ảnh trong một lần gửi; giữ đúng thứ tự tệp được chọn. */
  const uploadImages = async (files: FileList) => {
    setBusy(true); setMessage('Đang tải ảnh lên…'); setError('');
    try {
      const body = new FormData();
      for (const file of Array.from(files)) body.append('file', file);
      const response = await fetch('/api/admin/media', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Tải ảnh thất bại');
      setImages((current) => [...current, ...(data.assets || []).map((asset: { url: string }) => asset.url)]);
      setMessage(`Đã tải ${data.assets?.length || 0} ảnh. Bấm "Lưu thay đổi" để ghi vào sản phẩm.`);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Tải ảnh thất bại'); }
    finally { setBusy(false); }
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    setImages((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: draft.name, description: draft.description, basePrice: Number(draft.basePrice),
            originalPrice: draft.originalPrice === '' ? null : Number(draft.originalPrice),
            discountPercent: Number(draft.discountPercent), collectionId: draft.collectionId || null,
            isActive: draft.isActive, isBestSeller: draft.isBestSeller, isNewArrival: draft.isNewArrival, isSale: draft.isSale,
          },
          variants: variants.map((variant) => ({ id: variant.id, stock: Number(variant.stock), price: Number(variant.price) })),
          newVariants: newVariants.map((variant) => ({ size: variant.size, price: Number(variant.price), stock: Number(variant.stock || 0) })),
          images,
        }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không lưu được sản phẩm');
      onBack(`Đã lưu sản phẩm ${draft.name}.`);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6 pb-2">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-charcoal-900">{product.name}</h2>
        <p className="mt-1 text-sm text-charcoal-500">{product.sku} · /{product.slug}</p>
      </div>
      <button type="button" onClick={leave} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-4 text-sm">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

    <section className="space-y-6 rounded-2xl border border-cream-200 bg-white p-6">
      <h3 className="border-b border-cream-100 pb-3 text-xl font-bold text-charcoal-900">Thông tin sản phẩm</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">Tên sản phẩm
          <input className={field} maxLength={150} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="text-sm font-semibold">Bộ sưu tập
          <select className={field} value={draft.collectionId} onChange={(event) => setDraft({ ...draft, collectionId: event.target.value })}>
            <option value="">Không thuộc bộ sưu tập</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}
          </select></label>
        <label className="text-sm font-semibold">Giá bán (đ)
          <input className={field} type="number" min="0" value={draft.basePrice} onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })} /></label>
        <label className="text-sm font-semibold">Giá gốc (đ, bỏ trống nếu không có)
          <input className={field} type="number" min="0" value={draft.originalPrice} onChange={(event) => setDraft({ ...draft, originalPrice: event.target.value })} /></label>
        <label className="text-sm font-semibold">Giảm giá (%)
          <input className={field} type="number" min="0" max="100" value={draft.discountPercent} onChange={(event) => setDraft({ ...draft, discountPercent: event.target.value })} /></label>
        <div className="flex flex-wrap items-end gap-6 text-sm font-semibold">
          {([['isActive', 'Đang bán'], ['isBestSeller', 'Bán chạy'], ['isNewArrival', 'Hàng mới'], ['isSale', 'Đang giảm giá']] as const)
            .map(([key, label]) => <label key={key} className="flex items-center gap-2">
              <input type="checkbox" className="size-5" checked={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })} /> {label}
            </label>)}
        </div>
        <label className="text-sm font-semibold sm:col-span-2">Mô tả
          <textarea className={field} rows={4} maxLength={5000} value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      </div>
    </section>

    <section className="space-y-6 rounded-2xl border border-cream-200 bg-white p-6">
      <h3 className="border-b border-cream-100 pb-3 text-xl font-bold text-charcoal-900">Size, giá và tồn kho</h3>
      <div className="space-y-4">
        {variants.map((variant, index) => <div key={variant.id} className="grid gap-4 rounded-xl bg-cream-50 p-4 sm:grid-cols-3">
          <p className="self-center text-base font-bold text-charcoal-900">{variant.size}</p>
          <label className="text-sm font-semibold">Tồn kho
            <input className={field} type="number" min="0" max="100000" value={variant.stock}
              onChange={(event) => setVariants((current) => current.map((row, position) =>
                position === index ? { ...row, stock: event.target.value } : row))} /></label>
          <label className="text-sm font-semibold">Giá bán (đ)
            <input className={field} type="number" min="0" value={variant.price}
              onChange={(event) => setVariants((current) => current.map((row, position) =>
                position === index ? { ...row, price: event.target.value } : row))} /></label>
        </div>)}
      </div>
      <div className="space-y-4 border-t border-cream-100 pt-5">
        <p className="text-sm font-semibold text-charcoal-700">Thêm size mới</p>
        {newVariants.map((variant, index) => <div key={index} className="grid gap-4 rounded-xl border border-dashed border-cream-300 p-4 sm:grid-cols-4">
          <label className="text-sm font-semibold">Size
            <input className={field} placeholder="Size 110" value={variant.size}
              onChange={(event) => setNewVariants((current) => current.map((row, position) =>
                position === index ? { ...row, size: event.target.value } : row))} /></label>
          <label className="text-sm font-semibold">Giá bán (đ)
            <input className={field} type="number" min="0" value={variant.price}
              onChange={(event) => setNewVariants((current) => current.map((row, position) =>
                position === index ? { ...row, price: event.target.value } : row))} /></label>
          <label className="text-sm font-semibold">Tồn kho
            <input className={field} type="number" min="0" value={variant.stock}
              onChange={(event) => setNewVariants((current) => current.map((row, position) =>
                position === index ? { ...row, stock: event.target.value } : row))} /></label>
          <button type="button" onClick={() => setNewVariants((current) => current.filter((_, position) => position !== index))}
            className="min-h-12 self-end rounded-xl px-4 text-sm font-semibold text-red-700">Bỏ size này</button>
        </div>)}
        <button type="button" onClick={() => setNewVariants((current) => [...current, { size: '', price: '', stock: '0' }])}
          className="min-h-12 rounded-xl border border-cream-300 px-5 text-sm font-semibold">+ Thêm size</button>
      </div>
    </section>

    <section className="space-y-6 rounded-2xl border border-cream-200 bg-white p-6">
      <h3 className="border-b border-cream-100 pb-3 text-xl font-bold text-charcoal-900">Ảnh sản phẩm</h3>
      <p className="text-sm text-charcoal-600">
        Thứ tự ảnh bên dưới là thứ tự hiển thị; ảnh đầu tiên là ảnh chính. Thay đổi chỉ được lưu khi bấm “Lưu thay đổi”.
      </p>
      {images.length > 0 && <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {images.map((url, index) => <div key={`${url}-${index}`} className="space-y-2 rounded-xl border border-cream-200 p-3">
          <img src={url} alt={`Ảnh ${index + 1}`} className="h-28 w-full rounded-lg object-cover" />
          <p className="text-xs font-semibold text-charcoal-700">{index === 0 ? 'Ảnh chính' : `Ảnh ${index + 1}`}</p>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Đưa lên" disabled={index === 0} onClick={() => moveImage(index, -1)}
              className="rounded-lg border border-cream-300 p-2 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="Đưa xuống" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)}
              className="rounded-lg border border-cream-300 p-2 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" aria-label="Xóa ảnh" onClick={() => setImages((current) => current.filter((_, position) => position !== index))}
              className="rounded-lg p-2 text-red-700"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>)}
      </div>}

      <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
        busy ? 'border-cream-300 bg-cream-50 opacity-60' : 'border-honey-300 bg-honey-50 hover:border-honey-500'}`}>
        <Upload className="h-6 w-6 text-honey-600" />
        <span className="text-sm font-bold text-charcoal-900">Tải ảnh lên (chọn được nhiều ảnh)</span>
        <span className="text-xs text-charcoal-500">JPEG, PNG, WebP, AVIF · tối đa 5 MB mỗi ảnh · thứ tự chọn được giữ nguyên</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} className="hidden"
          onChange={(event) => { const files = event.target.files; if (files && files.length > 0) void uploadImages(files); event.target.value = ''; }} />
      </label>
    </section>

    {/* Thanh hành động: một nút lưu duy nhất và một nút hủy thay đổi, luôn nằm trong tầm nhìn. */}
    <div className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-t border-cream-200 bg-white/95 px-4 py-3 backdrop-blur">
      <p className="text-sm text-charcoal-600">{dirty ? 'Có thay đổi chưa lưu.' : 'Chưa có thay đổi nào.'}</p>
      <div className="flex gap-2">
        <button type="button" disabled={!dirty || busy} onClick={cancel}
          className="min-h-12 rounded-xl border border-cream-300 px-6 text-sm font-semibold disabled:opacity-50">Hủy thay đổi</button>
        <button type="button" disabled={!dirty || busy} onClick={() => void save()}
          className="min-h-12 rounded-xl bg-sage-700 px-8 text-sm font-bold text-white disabled:opacity-50">
          {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  </div>;
}
