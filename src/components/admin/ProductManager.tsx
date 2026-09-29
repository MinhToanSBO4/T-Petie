'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type ProductRow = { id: string; slug: string; sku: string; name: string; price: number; active: boolean;
  images: { id: string; url: string }[]; variants: { id: string; size: string; stock: number; price: number }[] };

export function ProductManager({ canCreateProduct }: { canCreateProduct: boolean }) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [imageDraft, setImageDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({ name: '', slug: '', sku: '', price: '', size: 'Size 90', stock: '0', imageUrl: '' });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const productResponse = await fetch('/api/admin/products', { cache: 'no-store' });
      if (!productResponse.ok) throw new Error('Không tải được dữ liệu quản trị');
      const productData = await productResponse.json();
      setProducts(productData.products);
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
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); }
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

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <div><Link href="/admin" className="text-xs text-honey-600">← Quản trị</Link>
      <h1 className="text-3xl font-bold">Sản phẩm & bộ sưu tập</h1>
      <p className="text-sm text-charcoal-500">Quản lý tồn kho theo size và URL ảnh CDN.</p>
      <div className="mt-3 flex flex-wrap gap-4"><Link href="/admin/bo-suu-tap" className="text-sm font-semibold text-honey-700">Quản lý bộ sưu tập →</Link>
        <Link href="/admin/feedback" className="text-sm font-semibold text-honey-700">Quản lý feedback →</Link></div></div>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    {loading && <p>Đang tải...</p>}

    <section className="space-y-4"><h2 className="text-xl font-bold">Sản phẩm ({products.length})</h2>
      {products.map((product) => <article key={product.id} className="bg-white border border-cream-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-2"><div><strong>{product.name}</strong>
          <p className="text-xs text-charcoal-500">{product.sku} · {product.price.toLocaleString('vi-VN')}₫</p></div>
          <Link href={`/san-pham/${product.slug}`} className="text-xs font-semibold text-honey-600">Xem trang sản phẩm ↗</Link></div>
        <div className="flex flex-wrap gap-3">
          {product.variants.map((variant) => <div key={variant.id} className="flex items-center gap-2 rounded-xl bg-cream-50 p-2 text-sm">
            <label htmlFor={`stock-${variant.id}`}>{variant.size}</label>
            <input id={`stock-${variant.id}`} type="number" min="0" max="100000" className="w-20 rounded-lg border p-2"
              value={stockDraft[variant.id] ?? String(variant.stock)}
              onChange={(event) => setStockDraft((current) => ({ ...current, [variant.id]: event.target.value }))} />
            <button onClick={() => write(`/api/admin/products/${product.id}`, 'PATCH', { variantId: variant.id,
              stock: Number(stockDraft[variant.id] ?? variant.stock) })} className="min-h-11 px-3 rounded-lg bg-honey-500 text-white font-bold">Lưu</button>
          </div>)}
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
          <div className="flex gap-2"><input type="url" placeholder="https://res.cloudinary.com/..." value={imageDraft[product.id] || ''}
            onChange={(event) => setImageDraft((current) => ({ ...current, [product.id]: event.target.value }))}
            className="flex-1 min-w-0 rounded-xl border p-2 text-sm" />
            <button onClick={() => write(`/api/admin/products/${product.id}`, 'PATCH', { imageUrl: imageDraft[product.id] })}
              className="px-4 min-h-11 rounded-xl bg-sage-600 text-white font-bold text-sm">Thêm ảnh CDN</button></div>
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
