'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { MediaPicker } from '@/components/admin/MediaPicker';

type VariantRow = { id: string; size: string; stock: number; price: number; weightRange: string; ageRange: string };
type ProductRow = { id: string; slug: string; sku: string; name: string; active: boolean; price: number;
  description: string; originalPrice: number | null; discountPercent: number; collectionId: string | null;
  isBestSeller: boolean; isNewArrival: boolean; isSale: boolean;
  images: { id: string; url: string }[]; variants: VariantRow[] };
type CollectionOption = { id: string; title: string };
type ProductDraft = { name: string; description: string; basePrice: string; originalPrice: string;
  discountPercent: string; collectionId: string; isActive: boolean; isBestSeller: boolean;
  isNewArrival: boolean; isSale: boolean };
const field = 'w-full rounded-xl border p-2 text-sm';

const toDraft = (product: ProductRow): ProductDraft => ({
  name: product.name, description: product.description, basePrice: String(product.price),
  originalPrice: product.originalPrice === null ? '' : String(product.originalPrice),
  discountPercent: String(product.discountPercent), collectionId: product.collectionId || '',
  isActive: product.active, isBestSeller: product.isBestSeller, isNewArrival: product.isNewArrival, isSale: product.isSale,
});

export function ProductManager({ canCreateProduct }: { canCreateProduct: boolean }) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ id: string; draft: ProductDraft } | null>(null);
  const [variantDraft, setVariantDraft] = useState<Record<string, { size: string; price: string; stock: string }>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({ name: '', slug: '', sku: '', price: '', size: 'Size 90', stock: '0' });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const productResponse = await fetch('/api/admin/products', { cache: 'no-store' });
      if (!productResponse.ok) throw new Error('Không tải được dữ liệu quản trị');
      const productData = await productResponse.json();
      setProducts(productData.products);
      setCollections(productData.collections || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const write = async (url: string, method: string, data?: object) => {
    setMessage('');
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' },
        ...(data ? { body: JSON.stringify(data) } : {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Thao tác thất bại');
      setMessage('Đã lưu thay đổi.');
      await refresh();
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); return false; }
  };

  const uploadFile = async (productId: string, file: File) => {
    setMessage('Đang tải ảnh lên CDN...');
    const body = new FormData();
    body.set('file', file);
    try {
      const response = await fetch(`/api/admin/products/${productId}/upload`, { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Tải ảnh thất bại');
      setMessage('Ảnh đã được lưu trên CDN.');
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tải ảnh thất bại'); }
  };

  const saveProduct = async (id: string, draft: ProductDraft) => {
    const saved = await write(`/api/admin/products/${id}`, 'PATCH', { product: {
      name: draft.name, description: draft.description, basePrice: Number(draft.basePrice),
      originalPrice: draft.originalPrice === '' ? null : Number(draft.originalPrice),
      discountPercent: Number(draft.discountPercent), collectionId: draft.collectionId || null,
      isActive: draft.isActive, isBestSeller: draft.isBestSeller, isNewArrival: draft.isNewArrival, isSale: draft.isSale,
    } });
    if (saved) setEditing(null);
  };

  return <div className="space-y-8">
    <div><h1 className="text-3xl font-bold">Sản phẩm</h1>
      <p className="text-sm text-charcoal-500">Quản lý thông tin, tồn kho theo size và ảnh sản phẩm.</p></div>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    {loading && <p>Đang tải...</p>}

    <section className="space-y-4"><h2 className="text-xl font-bold">Sản phẩm ({products.length})</h2>
      {products.map((product) => <article key={product.id} className="bg-white border border-cream-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-2"><div><strong>{product.name}</strong>
          <p className="text-xs text-charcoal-500">{product.sku} · {product.price.toLocaleString('vi-VN')}₫{product.active ? '' : ' · Đang ẩn'}</p></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(editing?.id === product.id ? null : { id: product.id, draft: toDraft(product) })}
              className="text-xs font-semibold text-honey-700">{editing?.id === product.id ? 'Đóng' : 'Sửa thông tin'}</button>
            <Link href={`/products/${product.slug}`} className="text-xs font-semibold text-honey-600">Xem trang sản phẩm ↗</Link></div></div>

        {editing?.id === product.id && <div className="grid gap-3 rounded-xl bg-cream-50 p-3 sm:grid-cols-2">
          <label className="text-xs font-semibold sm:col-span-2">Tên sản phẩm
            <input className={`${field} mt-1`} value={editing.draft.name} maxLength={150}
              onChange={(event) => setEditing({ ...editing, draft: { ...editing.draft, name: event.target.value } })} /></label>
          <label className="text-xs font-semibold">Giá bán (đ)
            <input className={`${field} mt-1`} type="number" min="0" value={editing.draft.basePrice}
              onChange={(event) => setEditing({ ...editing, draft: { ...editing.draft, basePrice: event.target.value } })} /></label>
          <label className="text-xs font-semibold">Giá gốc (đ, bỏ trống nếu không có)
            <input className={`${field} mt-1`} type="number" min="0" value={editing.draft.originalPrice}
              onChange={(event) => setEditing({ ...editing, draft: { ...editing.draft, originalPrice: event.target.value } })} /></label>
          <label className="text-xs font-semibold">Giảm giá (%)
            <input className={`${field} mt-1`} type="number" min="0" max="100" value={editing.draft.discountPercent}
              onChange={(event) => setEditing({ ...editing, draft: { ...editing.draft, discountPercent: event.target.value } })} /></label>
          <label className="text-xs font-semibold">Bộ sưu tập
            <select className={`${field} mt-1`} value={editing.draft.collectionId}
              onChange={(event) => setEditing({ ...editing, draft: { ...editing.draft, collectionId: event.target.value } })}>
              <option value="">Không thuộc bộ sưu tập</option>
              {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}
            </select></label>
          <label className="text-xs font-semibold sm:col-span-2">Mô tả
            <textarea className={`${field} mt-1`} rows={3} maxLength={5000} value={editing.draft.description}
              onChange={(event) => setEditing({ ...editing, draft: { ...editing.draft, description: event.target.value } })} /></label>
          <div className="flex flex-wrap gap-4 text-xs font-semibold sm:col-span-2">
            {([['isActive', 'Đang bán'], ['isBestSeller', 'Bán chạy'], ['isNewArrival', 'Hàng mới'], ['isSale', 'Đang giảm giá']] as const)
              .map(([key, label]) => <label key={key} className="flex items-center gap-1.5">
                <input type="checkbox" checked={editing.draft[key]}
                  onChange={(event) => setEditing({ ...editing, draft: { ...editing.draft, [key]: event.target.checked } })} /> {label}
              </label>)}
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={() => void saveProduct(product.id, editing.draft)}
              className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">Lưu thông tin</button>
            <button onClick={() => setEditing(null)} className="min-h-11 rounded-xl border border-cream-300 px-5 text-sm font-semibold">Hủy</button>
          </div>
        </div>}

        <div className="flex flex-wrap gap-3">
          {product.variants.map((variant) => <div key={variant.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-cream-50 p-2 text-sm">
            <span className="font-semibold">{variant.size}</span>
            <label htmlFor={`stock-${variant.id}`} className="text-xs">Tồn</label>
            <input id={`stock-${variant.id}`} type="number" min="0" max="100000" className="w-20 rounded-lg border p-2"
              value={stockDraft[variant.id] ?? String(variant.stock)}
              onChange={(event) => setStockDraft((current) => ({ ...current, [variant.id]: event.target.value }))} />
            <label htmlFor={`price-${variant.id}`} className="text-xs">Giá</label>
            <input id={`price-${variant.id}`} type="number" min="0" className="w-28 rounded-lg border p-2"
              value={priceDraft[variant.id] ?? String(variant.price)}
              onChange={(event) => setPriceDraft((current) => ({ ...current, [variant.id]: event.target.value }))} />
            <button onClick={() => void write(`/api/admin/products/${product.id}`, 'PATCH', { variantId: variant.id,
              stock: Number(stockDraft[variant.id] ?? variant.stock), price: Number(priceDraft[variant.id] ?? variant.price) })}
              className="min-h-11 px-3 rounded-lg bg-honey-500 text-white font-bold">Lưu</button>
          </div>)}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold">Thêm size
            <input className={`${field} mt-1 w-32`} placeholder="Size 110" value={variantDraft[product.id]?.size || ''}
              onChange={(event) => setVariantDraft((current) => ({ ...current,
                [product.id]: { size: event.target.value, price: current[product.id]?.price || String(product.price), stock: current[product.id]?.stock || '0' } }))} /></label>
          <label className="text-xs font-semibold">Giá
            <input className={`${field} mt-1 w-28`} type="number" min="0" value={variantDraft[product.id]?.price || ''}
              onChange={(event) => setVariantDraft((current) => ({ ...current,
                [product.id]: { size: current[product.id]?.size || '', price: event.target.value, stock: current[product.id]?.stock || '0' } }))} /></label>
          <label className="text-xs font-semibold">Tồn
            <input className={`${field} mt-1 w-20`} type="number" min="0" value={variantDraft[product.id]?.stock || ''}
              onChange={(event) => setVariantDraft((current) => ({ ...current,
                [product.id]: { size: current[product.id]?.size || '', price: current[product.id]?.price || '', stock: event.target.value } }))} /></label>
          <button disabled={!variantDraft[product.id]?.size || !variantDraft[product.id]?.price}
            onClick={() => void write(`/api/admin/products/${product.id}`, 'PATCH', { newVariant: {
              size: variantDraft[product.id].size, price: Number(variantDraft[product.id].price), stock: Number(variantDraft[product.id].stock || 0) } })
              .then((ok) => { if (ok) setVariantDraft((current) => ({ ...current, [product.id]: { size: '', price: '', stock: '' } })); })}
            className="min-h-11 rounded-xl bg-sage-700 px-4 text-sm font-bold text-white disabled:opacity-50">Thêm size</button>
        </div>

        <div className="space-y-2"><p className="text-sm font-semibold">Ảnh</p>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">Tải ảnh lên CDN
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(product.id, file); }} />
          </label>
          <div className="flex flex-wrap gap-2">{product.images.map((image) => <div key={image.id} className="flex items-center gap-2 rounded-lg border p-2">
            <img src={image.url} alt={product.name} className="w-12 h-12 object-cover rounded" />
            <button onClick={() => { if (confirm('Xóa ảnh này?')) void write(`/api/admin/products/${product.id}/images/${image.id}`, 'DELETE'); }}
              className="text-xs font-bold text-red-700 min-h-11">Xóa</button>
          </div>)}</div>
          <MediaPicker label="Thêm ảnh cho sản phẩm" value="" altText={product.name} aspect="square" onError={setMessage}
            onChange={(url) => { if (url) void write(`/api/admin/products/${product.id}`, 'PATCH', { imageUrl: url }); }} />
        </div>
      </article>)}
    </section>

    {canCreateProduct && <section className="bg-white rounded-2xl border border-cream-200 p-5 space-y-3">
      <h2 className="text-xl font-bold">Tạo sản phẩm</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(newProduct).map(([key, value]) => <input key={key} aria-label={key} placeholder={key} value={value}
          onChange={(event) => setNewProduct((current) => ({ ...current, [key]: event.target.value }))}
          className="rounded-xl border p-3 text-sm" />)}
      </div>
      <button onClick={() => write('/api/admin/products', 'POST', { ...newProduct, price: Number(newProduct.price), stock: Number(newProduct.stock) })}
        className="px-5 min-h-11 rounded-xl bg-honey-600 text-white font-bold">Tạo sản phẩm</button>
    </section>}

  </div>;
}
