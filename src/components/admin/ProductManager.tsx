'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataTable, type Column, type TableQuery } from '@/components/admin/DataTable';
import { MediaPicker } from '@/components/admin/MediaPicker';

type VariantRow = { id: string; size: string; stock: number; price: number; weightRange: string; ageRange: string };
type ProductRow = { id: string; slug: string; sku: string; name: string; active: boolean; price: number;
  description: string; originalPrice: number | null; discountPercent: number; collectionId: string | null;
  isBestSeller: boolean; isNewArrival: boolean; isSale: boolean;
  images: { id: string; url: string }[]; variants: VariantRow[] };
type CollectionOption = { id: string; title: string };
type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; product: ProductRow };

const field = 'w-full rounded-xl border p-2 text-sm';
const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

/** Tổng tồn kho của sản phẩm trên mọi size đang bán. */
const totalStock = (product: ProductRow) => product.variants.reduce((sum, variant) => sum + variant.stock, 0);

/** Gọi API danh sách sản phẩm có phân trang. */
async function fetchProducts(query: TableQuery) {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit), q: query.q, filter: query.filter });
  const response = await fetch(`/api/admin/products?${params}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không tải được sản phẩm');
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
        <p className="text-xs text-charcoal-500">{row.sku} · /{row.slug}</p>
      </div> },
    { key: 'price', header: 'Giá', render: (row) => formatPrice(row.price) },
    { key: 'stock', header: 'Tồn kho', render: (row) => <span className={totalStock(row) === 0 ? 'font-bold text-red-700' : ''}>{totalStock(row)}</span> },
    { key: 'sizes', header: 'Size', render: (row) => <span className="text-xs text-charcoal-600">{row.variants.map((variant) => variant.size).join(', ') || '—'}</span> },
    { key: 'status', header: 'Trạng thái', render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      row.active ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-charcoal-600'}`}>{row.active ? 'Đang bán' : 'Đang ẩn'}</span> },
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

  return <form onSubmit={submit} className="space-y-4 rounded-2xl border border-cream-200 bg-white p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold">Thêm sản phẩm mới</h2>
      <button type="button" onClick={() => onDone()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Tên sản phẩm
        <input className={`${field} mt-1`} required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="text-sm font-semibold">Slug
        <input className={`${field} mt-1`} required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug}
          onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} /></label>
      <label className="text-sm font-semibold">SKU
        <input className={`${field} mt-1`} required value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value.toUpperCase() })} /></label>
      <label className="text-sm font-semibold">Giá bán (đ)
        <input className={`${field} mt-1`} type="number" min="0" required value={draft.price}
          onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label>
      <label className="text-sm font-semibold">Size đầu tiên
        <input className={`${field} mt-1`} required value={draft.size} onChange={(event) => setDraft({ ...draft, size: event.target.value })} /></label>
      <label className="text-sm font-semibold">Tồn kho
        <input className={`${field} mt-1`} type="number" min="0" required value={draft.stock}
          onChange={(event) => setDraft({ ...draft, stock: event.target.value })} /></label>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="min-h-11 rounded-xl bg-honey-600 px-6 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang tạo…' : 'Tạo sản phẩm'}
    </button>
  </form>;
}

/** Chi tiết và chỉnh sửa một sản phẩm đã có. */
function ProductEditForm({ product, onBack }: { product: ProductRow; onBack: (message?: string) => void }) {
  const [draft, setDraft] = useState({
    name: product.name, description: product.description, basePrice: String(product.price),
    originalPrice: product.originalPrice === null ? '' : String(product.originalPrice),
    discountPercent: String(product.discountPercent), collectionId: product.collectionId || '',
    isActive: product.active, isBestSeller: product.isBestSeller, isNewArrival: product.isNewArrival, isSale: product.isSale,
  });
  const [variantDraft, setVariantDraft] = useState<Record<string, { stock: string; price: string }>>({});
  const [images, setImages] = useState(product.images);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVariant, setNewVariant] = useState({ size: '', price: '', stock: '0' });
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Nạp danh sách bộ sưu tập một lần để chọn cho sản phẩm.
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/collections?limit=50', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('unavailable')))
      .then((data) => setCollections(data.items || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const write = async (body: object, okMessage: string) => {
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Thao tác thất bại');
      setMessage(okMessage);
      return true;
    } catch (writeError) { setError(writeError instanceof Error ? writeError.message : 'Có lỗi xảy ra'); return false; }
    finally { setBusy(false); }
  };

  const uploadImage = async (file: File) => {
    setBusy(true); setMessage('Đang tải ảnh lên…'); setError('');
    const body = new FormData();
    body.set('file', file);
    try {
      const response = await fetch(`/api/admin/products/${product.id}/upload`, { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Tải ảnh thất bại');
      setImages((current) => [...current, { id: data.id, url: data.url }]);
      setMessage('Đã thêm ảnh.');
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Tải ảnh thất bại'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">{product.name}</h2>
        <p className="text-xs text-charcoal-500">{product.sku} · /{product.slug}</p>
      </div>
      <button type="button" onClick={() => onBack()} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <section className="space-y-3 rounded-2xl border border-cream-200 bg-white p-5">
      <h3 className="font-bold">Thông tin sản phẩm</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Tên sản phẩm
          <input className={`${field} mt-1`} maxLength={150} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="text-sm font-semibold">Bộ sưu tập
          <select className={`${field} mt-1`} value={draft.collectionId} onChange={(event) => setDraft({ ...draft, collectionId: event.target.value })}>
            <option value="">Không thuộc bộ sưu tập</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}
          </select></label>
        <label className="text-sm font-semibold">Giá bán (đ)
          <input className={`${field} mt-1`} type="number" min="0" value={draft.basePrice} onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })} /></label>
        <label className="text-sm font-semibold">Giá gốc (đ, bỏ trống nếu không có)
          <input className={`${field} mt-1`} type="number" min="0" value={draft.originalPrice} onChange={(event) => setDraft({ ...draft, originalPrice: event.target.value })} /></label>
        <label className="text-sm font-semibold">Giảm giá (%)
          <input className={`${field} mt-1`} type="number" min="0" max="100" value={draft.discountPercent} onChange={(event) => setDraft({ ...draft, discountPercent: event.target.value })} /></label>
        <div className="flex flex-wrap items-end gap-4 text-xs font-semibold sm:col-span-2">
          {([['isActive', 'Đang bán'], ['isBestSeller', 'Bán chạy'], ['isNewArrival', 'Hàng mới'], ['isSale', 'Đang giảm giá']] as const)
            .map(([key, label]) => <label key={key} className="flex items-center gap-1.5">
              <input type="checkbox" checked={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })} /> {label}
            </label>)}
        </div>
        <label className="text-sm font-semibold sm:col-span-2">Mô tả
          <textarea className={`${field} mt-1`} rows={3} maxLength={5000} value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      </div>
      <button type="button" disabled={busy} onClick={() => void write({ product: {
        name: draft.name, description: draft.description, basePrice: Number(draft.basePrice),
        originalPrice: draft.originalPrice === '' ? null : Number(draft.originalPrice),
        discountPercent: Number(draft.discountPercent), collectionId: draft.collectionId || null,
        isActive: draft.isActive, isBestSeller: draft.isBestSeller, isNewArrival: draft.isNewArrival, isSale: draft.isSale,
      } }, 'Đã lưu thông tin sản phẩm.')}
        className="min-h-11 rounded-xl bg-honey-600 px-6 text-sm font-bold text-white disabled:opacity-50">Lưu thông tin</button>
    </section>

    <section className="space-y-3 rounded-2xl border border-cream-200 bg-white p-5">
      <h3 className="font-bold">Size, giá và tồn kho</h3>
      {product.variants.map((variant) => <div key={variant.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-cream-50 p-2 text-sm">
        <span className="w-32 font-semibold">{variant.size}</span>
        <label className="text-xs">Tồn
          <input className="ml-1 w-20 rounded-lg border p-2" type="number" min="0" max="100000"
            value={variantDraft[variant.id]?.stock ?? String(variant.stock)}
            onChange={(event) => setVariantDraft((current) => ({ ...current, [variant.id]: {
              stock: event.target.value, price: current[variant.id]?.price ?? String(variant.price) } }))} /></label>
        <label className="text-xs">Giá
          <input className="ml-1 w-28 rounded-lg border p-2" type="number" min="0"
            value={variantDraft[variant.id]?.price ?? String(variant.price)}
            onChange={(event) => setVariantDraft((current) => ({ ...current, [variant.id]: {
              price: event.target.value, stock: current[variant.id]?.stock ?? String(variant.stock) } }))} /></label>
        <button type="button" disabled={busy} onClick={() => void write({ variantId: variant.id,
          stock: Number(variantDraft[variant.id]?.stock ?? variant.stock),
          price: Number(variantDraft[variant.id]?.price ?? variant.price) }, 'Đã lưu size.')}
          className="min-h-11 rounded-lg bg-honey-500 px-4 font-bold text-white disabled:opacity-50">Lưu</button>
      </div>)}
      <div className="flex flex-wrap items-end gap-2 border-t border-cream-100 pt-3">
        <label className="text-xs font-semibold">Size mới
          <input className={`${field} mt-1 w-32`} placeholder="Size 110" value={newVariant.size}
            onChange={(event) => setNewVariant({ ...newVariant, size: event.target.value })} /></label>
        <label className="text-xs font-semibold">Giá
          <input className={`${field} mt-1 w-28`} type="number" min="0" value={newVariant.price}
            onChange={(event) => setNewVariant({ ...newVariant, price: event.target.value })} /></label>
        <label className="text-xs font-semibold">Tồn
          <input className={`${field} mt-1 w-20`} type="number" min="0" value={newVariant.stock}
            onChange={(event) => setNewVariant({ ...newVariant, stock: event.target.value })} /></label>
        <button type="button" disabled={busy || !newVariant.size || newVariant.price === ''}
          onClick={() => void write({ newVariant: { size: newVariant.size, price: Number(newVariant.price), stock: Number(newVariant.stock || 0) } },
            'Đã thêm size mới.').then((ok) => { if (ok) setNewVariant({ size: '', price: '', stock: '0' }); })}
          className="min-h-11 rounded-xl bg-sage-700 px-4 text-sm font-bold text-white disabled:opacity-50">Thêm size</button>
      </div>
    </section>

    <section className="space-y-3 rounded-2xl border border-cream-200 bg-white p-5">
      <h3 className="font-bold">Ảnh sản phẩm</h3>
      <div className="flex flex-wrap gap-3">{images.map((image) => <div key={image.id} className="space-y-1">
        <img src={image.url} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
        <button type="button" disabled={busy} onClick={async () => {
          const response = await fetch(`/api/admin/products/${product.id}/images/${image.id}`, { method: 'DELETE' });
          if (response.ok) { setImages((current) => current.filter((item) => item.id !== image.id)); setMessage('Đã xóa ảnh.'); }
          else setError('Không xóa được ảnh');
        }} className="text-xs font-bold text-red-700">Xóa</button>
      </div>)}</div>
      <label className="inline-flex items-center gap-2 text-sm font-semibold">Tải ảnh lên
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
      </label>
      <div className="border-t border-cream-100 pt-3">
        <MediaPicker label="Hoặc chọn từ thư viện" value={newImageUrl} altText={product.name} aspect="square" onError={setError}
          onChange={(url) => { if (!url) return; setNewImageUrl('');
            void write({ imageUrl: url }, 'Đã thêm ảnh từ thư viện.').then((ok) => { if (ok) setImages((current) => [...current, { id: `tmp-${Date.now()}`, url }]); }); }} />
      </div>
    </section>
  </div>;
}
