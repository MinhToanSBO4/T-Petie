'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react';
import { DataTable, tableParams, type Column, type TableFilter, type TableQuery } from '@/components/admin/DataTable';
import { ReviewModerationPanel } from '@/components/admin/ReviewModerationPanel';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { MIN_PRICE, PRODUCT_TYPES } from '@/lib/content/product-input';
import { slugify } from '@/lib/utils/formatters';
import { PRODUCT_PHOTO_OPTIONS } from '@/client/image-compress';
import { readJson, uploadMediaBatch } from '@/client/media-upload';
import { errorText, toast } from '@/client/toast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

type VariantRow = { id: string; size: string; stock: number; price: number; weightRange: string; ageRange: string; active: boolean };
type ProductRow = { id: string; slug: string; sku: string; name: string; active: boolean; price: number;
  description: string; originalPrice: number | null; discountPercent: number; collectionId: string | null;
  subcategory: string; subcategoryName: string; material: string; colorName: string;
  isBestSeller: boolean; isNewArrival: boolean; isSale: boolean;
  images: { id: string; url: string }[]; variants: VariantRow[] };
type CollectionOption = { id: string; title: string };
type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; product: ProductRow };

const field = 'mt-2 block w-full rounded-xl border-2 border-cream-300 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-honey-500 focus:ring-4 focus:ring-honey-100';
const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}₫`;
const MAX_IMAGES = 20;

/** Tổng tồn kho của sản phẩm trên mọi size đang bán. */
const totalStock = (product: ProductRow) => product.variants.reduce((sum, variant) => sum + (variant.active ? variant.stock : 0), 0);

/** Ô giá: số nguyên từ MIN_PRICE trở lên. Ô để trống (Number('') = 0) không còn bị lưu thành giá 0đ. */
const validPrice = (value: string) => /^\d+$/.test(value.trim()) && Number(value) >= MIN_PRICE && Number(value) <= 1_000_000_000;
const validStock = (value: string) => /^\d+$/.test(value.trim()) && Number(value) <= 100000;
const priceHint = `Giá phải là số nguyên từ ${MIN_PRICE.toLocaleString('vi-VN')}đ`;

/** Danh sách bộ sưu tập đi kèm mỗi lần tải bảng sản phẩm; ô lọc và form sửa dùng lại, không gọi API thêm. */
let collectionOptions: CollectionOption[] | null = null;

const PRODUCT_SORTS = [
  { value: 'newest', label: 'Mới nhất' }, { value: 'updated', label: 'Cập nhật gần đây' }, { value: 'name', label: 'Tên A–Z' },
  { value: 'price-asc', label: 'Giá thấp → cao' }, { value: 'price-desc', label: 'Giá cao → thấp' },
];
const STATUS_FILTER: TableFilter = { key: 'status', label: 'Trạng thái bán', all: 'Tất cả sản phẩm',
  options: [{ value: 'active', label: 'Đang bán' }, { value: 'hidden', label: 'Đang ẩn' }] };
const CONDITION_FILTER: TableFilter = { key: 'filter', label: 'Tình trạng', options: [
  { value: 'low-stock', label: 'Sắp hết hàng (còn ≤ 5)' }, { value: 'out-of-stock', label: 'Hết hàng' },
  { value: 'no-image', label: 'Chưa có ảnh' }, { value: 'sale', label: 'Đang giảm giá' },
  { value: 'best-seller', label: 'Bán chạy' }, { value: 'new', label: 'Hàng mới' }] };

export function ProductManager({ canCreateProduct }: { canCreateProduct: boolean }) {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const [collections, setCollections] = useState(collectionOptions);
  const back = useCallback(() => { setView({ mode: 'list' }); setReloadKey((key) => key + 1); }, []);
  const fetchProducts = useCallback(async (query: TableQuery) => {
    const response = await fetch(`/api/admin/products?${tableParams(query)}`, { cache: 'no-store' });
    const data = await readJson(response);
    if (!response.ok) throw new Error(String(data.error || 'Không tải được sản phẩm'));
    if (Array.isArray(data.collections)) { collectionOptions = data.collections as CollectionOption[]; setCollections(collectionOptions); }
    return { items: data.items as ProductRow[], total: data.total as number, page: data.page as number, pages: data.pages as number };
  }, []);

  if (view.mode === 'create') {
    return <ProductCreateForm onCancel={back}
      onCreated={(product) => { setReloadKey((key) => key + 1); setView({ mode: 'edit', product }); }} />;
  }
  if (view.mode === 'edit') return <ProductEditLoader key={view.product.id} product={view.product} onBack={back} />;

  const columns: Column<ProductRow>[] = [
    { key: 'image', header: 'Ảnh', className: 'w-20', render: (row) => row.images[0]
      ? <img src={cloudinaryImage(row.images[0].url, { width: 96 })} alt={row.name} loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
      : <span className="text-xs text-charcoal-400">—</span> },
    { key: 'name', header: 'Sản phẩm', render: (row) => <div>
        <p className="font-semibold text-charcoal-900">{row.name}</p>
        <p className="text-xs text-charcoal-500">Mã sản phẩm: {row.sku}</p>
      </div> },
    { key: 'price', header: 'Giá', render: (row) => formatPrice(row.price) },
    { key: 'stock', header: 'Tồn kho', render: (row) => <span className={totalStock(row) === 0 ? 'font-bold text-red-700' : ''}>{totalStock(row)}</span> },
    { key: 'sizes', header: 'Size', render: (row) => <span className="text-xs text-charcoal-600">{row.variants.filter((variant) => variant.active).map((variant) => variant.size).join(', ') || '—'}</span> },
    { key: 'status', header: 'Trạng thái', render: (row) => <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
      row.active ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-charcoal-600'}`}>{row.active ? 'Đang bán' : 'Đang ẩn'}</span> },
    { key: 'action', header: '', render: (row) => <button type="button" onClick={(event) => { event.stopPropagation(); setView({ mode: 'edit', product: row }); }} className="min-h-9 whitespace-nowrap rounded-lg border border-cream-300 px-3 text-xs font-bold">Chỉnh sửa</button> },
  ];

  return <div className="space-y-4">
    {/* Tồn kho đổi theo từng đơn hàng: luôn tải lại ngầm khi quay về bảng. */}
    <DataTable columns={columns} fetchPage={fetchProducts} reloadKey={reloadKey} alwaysRevalidate
      searchPlaceholder="Tìm theo tên, SKU hoặc slug"
      sorts={PRODUCT_SORTS}
      filters={[STATUS_FILTER, CONDITION_FILTER, { key: 'collection', label: 'Bộ sưu tập', options: [
        ...(collections || []).map((collection) => ({ value: collection.id, label: collection.title })),
        { value: 'none', label: 'Chưa thuộc bộ sưu tập' }] }]}
      emptyText="Chưa có sản phẩm nào."
      onRowClick={(row) => setView({ mode: 'edit', product: row })}
      toolbar={canCreateProduct
        ? <button type="button" onClick={() => setView({ mode: 'create' })}
            className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">Thêm sản phẩm</button>
        : undefined} />
  </div>;
}

/** Tạo sản phẩm mới: tách riêng khỏi màn hình chỉnh sửa sản phẩm đã có. Tạo xong mở ngay form sửa để thêm ảnh và size. */
function ProductCreateForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (product: ProductRow) => void }) {
  const [draft, setDraft] = useState({ name: '', slug: '', sku: '', subcategory: '', price: '', size: 'Size 90', stock: '0' });
  // Đường dẫn tự sinh theo tên cho tới khi người dùng tự sửa ô đường dẫn.
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = Boolean(draft.name || draft.sku || draft.price);
  useUnsavedChangesGuard(dirty && !busy);

  const validationError = () => {
    if (draft.name.trim().length < 2) return 'Nhập tên sản phẩm (ít nhất 2 ký tự)';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) || draft.slug.length < 3) {
      return 'Đường dẫn cần ít nhất 3 ký tự: chữ thường không dấu, số và dấu gạch ngang (ví dụ vay-hoa-nhi)';
    }
    if (!/^[A-Z0-9-]{3,50}$/.test(draft.sku.trim())) return 'Mã sản phẩm (SKU) cần 3–50 ký tự: chữ không dấu, số và dấu gạch ngang (ví dụ TP-VAY-001)';
    if (!draft.subcategory) return 'Chọn loại sản phẩm để sản phẩm hiện đúng trang Áo / Quần / Váy / Set đồ';
    if (!validPrice(draft.price)) return priceHint;
    if (!draft.size.trim()) return 'Nhập tên size đầu tiên';
    if (!validStock(draft.stock)) return 'Tồn kho phải là số nguyên từ 0 đến 100000';
    return '';
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validationError();
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError('');
    const id = toast.loading('Đang tạo sản phẩm…');
    try {
      const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, sku: draft.sku.trim(), price: Number(draft.price), stock: Number(draft.stock) }) });
      const data = await readJson(response);
      if (!response.ok || !data.product) throw new Error(String(data.error || 'Không tạo được sản phẩm'));
      toast.success(`Đã tạo sản phẩm ${draft.name.trim()}`, { id });
      onCreated(data.product as ProductRow);
    } catch (submitError) { toast.error(errorText(submitError, 'Không tạo được sản phẩm'), { id }); }
    finally { setBusy(false); }
  };

  const leave = () => {
    if (dirty && !window.confirm('Thông tin đang nhập chưa được lưu. Bỏ và quay về danh sách?')) return;
    onCancel();
  };

  return <form onSubmit={submit} noValidate className="space-y-6 rounded-2xl border border-cream-200 bg-white p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-charcoal-900">Thêm sản phẩm mới</h2>
        <p className="mt-1 text-sm text-charcoal-600">Sản phẩm được tạo ở trạng thái <strong>đang ẩn</strong>. Thêm ảnh, các size còn lại rồi bật “Đang bán”.</p>
      </div>
      <button type="button" onClick={leave} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">Tên sản phẩm
        <input className={field} maxLength={150} value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value,
            ...(slugEdited ? {} : { slug: slugify(event.target.value).slice(0, 100) }) })} /></label>
      <label className="text-sm font-semibold">Đường dẫn (slug)
        <input className={field} maxLength={100} value={draft.slug} placeholder="vay-hoa-nhi"
          onChange={(event) => { setSlugEdited(true); setDraft({ ...draft, slug: event.target.value.toLowerCase() }); }} />
        <span className="mt-1 block text-xs font-normal text-charcoal-500">Tự tạo theo tên; không đổi được sau khi tạo.</span></label>
      <label className="text-sm font-semibold">Mã sản phẩm (SKU)
        <input className={field} maxLength={50} value={draft.sku} placeholder="TP-VAY-001"
          onChange={(event) => setDraft({ ...draft, sku: event.target.value.toUpperCase().replace(/\s+/g, '-') })} /></label>
      <label className="text-sm font-semibold">Loại sản phẩm
        <select className={field} value={draft.subcategory} onChange={(event) => setDraft({ ...draft, subcategory: event.target.value })}>
          <option value="">— Chọn loại —</option>
          {PRODUCT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select></label>
      <label className="text-sm font-semibold">Giá bán (đ)
        <input className={field} type="number" inputMode="numeric" min={MIN_PRICE} step="1000" value={draft.price}
          onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label>
      <label className="text-sm font-semibold">Size đầu tiên
        <input className={field} maxLength={50} value={draft.size} onChange={(event) => setDraft({ ...draft, size: event.target.value })} /></label>
      <label className="text-sm font-semibold">Tồn kho
        <input className={field} type="number" inputMode="numeric" min="0" value={draft.stock}
          onChange={(event) => setDraft({ ...draft, stock: event.target.value })} /></label>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="min-h-12 rounded-xl bg-honey-600 px-8 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang tạo…' : 'Tạo sản phẩm'}
    </button>
  </form>;
}

/**
 * Mở form sửa với số liệu mới nhất của sản phẩm. Dòng trong bảng có thể đã cũ (bảng được lưu trong tab),
 * còn tồn kho đổi theo từng đơn hàng; dựng form từ dữ liệu cũ khiến lần lưu sau báo xung đột.
 */
function ProductEditLoader({ product, onBack }: { product: ProductRow; onBack: () => void }) {
  const [fresh, setFresh] = useState<ProductRow | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/products/${product.id}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await readJson(response);
        if (!response.ok || !data.product) throw new Error(String(data.error || 'Không tải được sản phẩm'));
        setFresh(data.product as ProductRow);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        toast.warning('Không tải được số liệu mới nhất, đang hiện dữ liệu trong bảng', { description: errorText(error) });
        setFresh(product);
      });
    return () => controller.abort();
  }, [product]);
  if (!fresh) return <p role="status" className="rounded-2xl border border-cream-200 bg-white p-6 text-sm text-charcoal-600">Đang tải sản phẩm…</p>;
  return <ProductEditForm product={fresh} onBack={onBack} />;
}

type VariantDraft = { id: string; size: string; stock: string; price: string; weightRange: string; ageRange: string; active: boolean };
type NewVariantDraft = { key: string; size: string; price: string; stock: string; weightRange: string; ageRange: string };

const toVariantDrafts = (product: ProductRow): VariantDraft[] => product.variants.map((variant) => ({
  id: variant.id, size: variant.size, stock: String(variant.stock), price: String(variant.price),
  weightRange: variant.weightRange, ageRange: variant.ageRange, active: variant.active }));

/**
 * Chi tiết và chỉnh sửa một sản phẩm đã có.
 * Mọi thay đổi — kể cả thêm, xóa hay sắp xếp ảnh — chỉ được ghi vào database
 * khi bấm "Lưu thay đổi"; nút "Hủy thay đổi" khôi phục lại trạng thái ban đầu.
 * Chỉ trường đã đổi được gửi lên; tồn kho gửi kèm số lúc mở form để máy chủ không ghi đè đơn vừa đặt.
 */
function ProductEditForm({ product, onBack }: { product: ProductRow; onBack: () => void }) {
  const initial = {
    name: product.name, description: product.description,
    originalPrice: product.originalPrice === null ? '' : String(product.originalPrice),
    discountPercent: String(product.discountPercent), collectionId: product.collectionId || '',
    subcategory: product.subcategory, subcategoryName: product.subcategoryName,
    material: product.material, colorName: product.colorName,
    isActive: product.active, isBestSeller: product.isBestSeller, isNewArrival: product.isNewArrival, isSale: product.isSale,
  };
  const initialVariants = toVariantDrafts(product);
  const initialImages = product.images.map((image) => image.url);
  const [draft, setDraft] = useState(initial);
  const [variants, setVariants] = useState(initialVariants);
  const [images, setImages] = useState(initialImages);
  const [newVariants, setNewVariants] = useState<NewVariantDraft[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>(collectionOptions || []);
  const [allPrice, setAllPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const busy = saving || uploading;
  // Lỗi nhập liệu cần sửa trên form; kết quả lưu/tải ảnh hiện ở thông báo góc màn hình.
  const [error, setError] = useState('');

  // Nạp danh sách bộ sưu tập một lần để chọn cho sản phẩm.
  useEffect(() => {
    if (collectionOptions) return;
    const controller = new AbortController();
    fetch('/api/admin/collections?limit=50', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Không tải được danh sách bộ sưu tập')))
      .then((data) => setCollections(data.items || []))
      .catch((loadError) => { if (!controller.signal.aborted) toast.error(errorText(loadError, 'Không tải được danh sách bộ sưu tập')); });
    return () => controller.abort();
  }, []);

  const dirty = JSON.stringify({ draft, variants, images, newVariants })
    !== JSON.stringify({ draft: initial, variants: initialVariants, images: initialImages, newVariants: [] });
  useUnsavedChangesGuard(dirty || busy);

  const cancel = () => {
    setDraft(initial);
    setVariants(initialVariants);
    setImages(initialImages);
    setNewVariants([]);
    setError('');
    toast.info('Đã hủy các thay đổi chưa lưu');
  };

  const leave = () => {
    if (dirty && !window.confirm('Có thay đổi chưa lưu. Rời trang và bỏ các thay đổi đó?')) return;
    onBack();
  };

  /** Nén rồi tải từng ảnh một (mỗi request nhỏ hơn giới hạn 4,5 MB của Vercel); một ảnh lỗi không làm hỏng cả loạt. */
  const uploadImages = async (list: FileList) => {
    const files = Array.from(list).slice(0, Math.max(0, MAX_IMAGES - images.length));
    const skipped = list.length - files.length;
    if (skipped > 0) toast.warning(`Bỏ qua ${skipped} ảnh vì mỗi sản phẩm tối đa ${MAX_IMAGES} ảnh`);
    if (files.length === 0) return;
    setUploading(true);
    try { await uploadMediaBatch(files, PRODUCT_PHOTO_OPTIONS, draft.name, (asset) => setImages((current) => [...current, asset.url])); }
    finally { setUploading(false); }
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

  const updateVariant = (id: string, patch: Partial<VariantDraft>) =>
    setVariants((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  const updateNewVariant = (key: string, patch: Partial<NewVariantDraft>) =>
    setNewVariants((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));

  const validationError = () => {
    if (draft.name.trim().length < 2) return 'Tên sản phẩm cần ít nhất 2 ký tự';
    if (draft.originalPrice.trim() && !validPrice(draft.originalPrice)) return `Giá gốc: ${priceHint.toLowerCase()}, hoặc bỏ trống`;
    if (!/^\d+$/.test(draft.discountPercent.trim()) || Number(draft.discountPercent) > 100) return 'Giảm giá (%) phải từ 0 đến 100';
    for (const variant of variants) {
      if (!validPrice(variant.price)) return `${variant.size}: ${priceHint.toLowerCase()}`;
      if (!validStock(variant.stock)) return `${variant.size}: tồn kho phải là số nguyên từ 0 đến 100000`;
    }
    const sizes = new Set(variants.map((variant) => variant.size.toLocaleLowerCase('vi-VN')));
    for (const variant of newVariants) {
      const size = variant.size.trim();
      if (!size) return 'Size mới: nhập tên size (ví dụ Size 110)';
      if (sizes.has(size.toLocaleLowerCase('vi-VN'))) return `${size} đã có trong sản phẩm`;
      sizes.add(size.toLocaleLowerCase('vi-VN'));
      if (!validPrice(variant.price)) return `${size}: ${priceHint.toLowerCase()}`;
      if (!validStock(variant.stock || '0')) return `${size}: tồn kho phải là số nguyên từ 0 đến 100000`;
    }
    if (draft.isActive && !variants.some((variant) => variant.active) && newVariants.length === 0) {
      return 'Sản phẩm đang bán cần ít nhất một size đang bán';
    }
    return '';
  };

  /** Chỉ các trường đã đổi so với lúc mở form. */
  const buildPayload = () => {
    const productPatch: Record<string, unknown> = {};
    const text = (key: keyof typeof initial) => { if (draft[key] !== initial[key]) productPatch[key] = draft[key]; };
    (['name', 'description', 'collectionId', 'subcategoryName', 'material', 'colorName',
      'isActive', 'isBestSeller', 'isNewArrival', 'isSale'] as const).forEach(text);
    if (draft.subcategory !== initial.subcategory) productPatch.subcategory = draft.subcategory || null;
    if (draft.originalPrice !== initial.originalPrice) productPatch.originalPrice = draft.originalPrice.trim() === '' ? null : Number(draft.originalPrice);
    if (draft.discountPercent !== initial.discountPercent) productPatch.discountPercent = Number(draft.discountPercent);
    if (productPatch.collectionId === '') productPatch.collectionId = null;

    const variantPatches = variants.flatMap((variant) => {
      const before = initialVariants.find((row) => row.id === variant.id)!;
      const patch: Record<string, unknown> = {};
      if (variant.stock !== before.stock) { patch.stock = Number(variant.stock); patch.expectedStock = Number(before.stock); }
      if (variant.price !== before.price) patch.price = Number(variant.price);
      if (variant.weightRange !== before.weightRange) patch.weightRange = variant.weightRange;
      if (variant.ageRange !== before.ageRange) patch.ageRange = variant.ageRange;
      if (variant.active !== before.active) patch.isActive = variant.active;
      return Object.keys(patch).length ? [{ id: variant.id, ...patch }] : [];
    });
    return {
      ...(Object.keys(productPatch).length ? { product: productPatch } : {}),
      ...(variantPatches.length ? { variants: variantPatches } : {}),
      ...(newVariants.length ? { newVariants: newVariants.map((variant) => ({ size: variant.size.trim(), price: Number(variant.price),
        stock: Number(variant.stock || 0), weightRange: variant.weightRange, ageRange: variant.ageRange })) } : {}),
      ...(JSON.stringify(images) !== JSON.stringify(initialImages) ? { images } : {}),
    };
  };

  const save = async () => {
    const invalid = validationError();
    // Lỗi hiện ở đầu form, còn nút lưu nằm ở thanh dưới cùng: báo thêm ở góc màn hình để không bấm mà không thấy gì.
    if (invalid) { setError(invalid); toast.error(invalid); return; }
    setSaving(true); setError('');
    const id = toast.loading('Đang lưu sản phẩm…');
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) });
      const data = await readJson(response);
      // 409: tồn kho vừa đổi ở nơi khác (đơn mới, người khác sửa) nên báo xung đột, không phải lỗi.
      if (response.status === 409) { toast.warning(String(data.error || 'Sản phẩm vừa được cập nhật ở nơi khác'), { id }); return; }
      if (!response.ok) throw new Error(String(data.error || 'Không lưu được sản phẩm'));
      toast.success(`Đã lưu sản phẩm ${draft.name}`, { id });
      onBack();
    } catch (saveError) { toast.error(errorText(saveError, 'Không lưu được sản phẩm'), { id }); }
    finally { setSaving(false); }
  };

  const activePrices = [...variants.filter((variant) => variant.active).map((variant) => variant.price), ...newVariants.map((variant) => variant.price)]
    .filter(validPrice).map(Number);
  const displayPrice = activePrices.length ? Math.min(...activePrices) : product.price;
  const collectionMissing = draft.collectionId && !collections.some((collection) => collection.id === draft.collectionId);

  return <div className="space-y-6 pb-2">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-charcoal-900">{product.name}</h2>
        <p className="mt-1 text-sm text-charcoal-500">{product.sku} · /{product.slug}</p>
      </div>
      <button type="button" onClick={leave} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

    <section className="space-y-6 rounded-2xl border border-cream-200 bg-white p-6">
      <h3 className="border-b border-cream-100 pb-3 text-xl font-bold text-charcoal-900">Thông tin sản phẩm</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">Tên sản phẩm
          <input className={field} maxLength={150} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="text-sm font-semibold">Bộ sưu tập
          <select className={field} value={draft.collectionId} onChange={(event) => setDraft({ ...draft, collectionId: event.target.value })}>
            <option value="">Không thuộc bộ sưu tập</option>
            {collectionMissing && <option value={draft.collectionId}>Bộ sưu tập đã ẩn/lưu trữ</option>}
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}
          </select></label>
        <label className="text-sm font-semibold">Loại sản phẩm
          <select className={field} value={draft.subcategory} onChange={(event) => {
            const type = PRODUCT_TYPES.find((item) => item.value === event.target.value);
            // Tên loại đang trống hoặc đang là tên mặc định thì đổi theo loại mới; tên tự đặt (ví dụ "Chân váy") giữ nguyên.
            const defaultName = PRODUCT_TYPES.some((item) => item.label === draft.subcategoryName) || !draft.subcategoryName;
            setDraft({ ...draft, subcategory: event.target.value, ...(defaultName ? { subcategoryName: type?.label || '' } : {}) });
          }}>
            <option value="">— Chưa chọn (không hiện ở trang Áo/Quần/Váy/Set) —</option>
            {PRODUCT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select></label>
        <label className="text-sm font-semibold">Tên loại hiển thị
          <input className={field} maxLength={50} placeholder="Ví dụ: Chân váy" value={draft.subcategoryName}
            onChange={(event) => setDraft({ ...draft, subcategoryName: event.target.value })} /></label>
        <label className="text-sm font-semibold">Chất liệu
          <input className={field} maxLength={200} placeholder="Ví dụ: Đũi organic" value={draft.material}
            onChange={(event) => setDraft({ ...draft, material: event.target.value })} /></label>
        <label className="text-sm font-semibold">Màu
          <input className={field} maxLength={100} placeholder="Ví dụ: Hồng phấn" value={draft.colorName}
            onChange={(event) => setDraft({ ...draft, colorName: event.target.value })} />
          <span className="mt-1 block text-xs font-normal text-charcoal-500">Dùng cho bộ lọc màu; màu đầu tiên quyết định nhóm màu.</span></label>
        <div className="text-sm font-semibold">Giá hiển thị
          <p className="mt-2 rounded-xl bg-cream-50 px-4 py-3 font-bold text-charcoal-900">Từ {formatPrice(displayPrice)}</p>
          <span className="mt-1 block text-xs font-normal text-charcoal-500">Tự lấy theo size rẻ nhất đang bán; sửa giá ở từng size bên dưới.</span></div>
        <label className="text-sm font-semibold">Giá gốc (đ, bỏ trống nếu không có)
          <input className={field} type="number" inputMode="numeric" min={MIN_PRICE} value={draft.originalPrice}
            onChange={(event) => setDraft({ ...draft, originalPrice: event.target.value })} /></label>
        <label className="text-sm font-semibold">Giảm giá (%)
          <input className={field} type="number" inputMode="numeric" min="0" max="100" value={draft.discountPercent}
            onChange={(event) => setDraft({ ...draft, discountPercent: event.target.value })} /></label>
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
      {variants.length > 1 && <div className="flex flex-wrap items-end gap-3 rounded-xl bg-honey-50 p-4">
        <label className="text-sm font-semibold">Đặt cùng một giá cho mọi size (đ)
          <input className={field} type="number" inputMode="numeric" min={MIN_PRICE} value={allPrice} onChange={(event) => setAllPrice(event.target.value)} /></label>
        <button type="button" disabled={!validPrice(allPrice)}
          onClick={() => setVariants((current) => current.map((row) => ({ ...row, price: String(Number(allPrice)) })))}
          className="min-h-12 rounded-xl border border-honey-400 bg-white px-5 text-sm font-semibold disabled:opacity-50">Áp dụng</button>
      </div>}
      <div className="space-y-4">
        {variants.map((variant) => <div key={variant.id}
          className={`grid gap-4 rounded-xl p-4 sm:grid-cols-6 ${variant.active ? 'bg-cream-50' : 'bg-cream-100 opacity-70'}`}>
          <div className="space-y-2 self-center">
            <p className="text-base font-bold text-charcoal-900">{variant.size}</p>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" className="size-4" checked={variant.active}
                onChange={(event) => updateVariant(variant.id, { active: event.target.checked })} /> Đang bán size này</label>
          </div>
          <label className="text-sm font-semibold">Tồn kho
            <input className={field} type="number" inputMode="numeric" min="0" max="100000" value={variant.stock}
              onChange={(event) => updateVariant(variant.id, { stock: event.target.value })} /></label>
          <label className="text-sm font-semibold">Giá bán (đ)
            <input className={field} type="number" inputMode="numeric" min={MIN_PRICE} value={variant.price}
              onChange={(event) => updateVariant(variant.id, { price: event.target.value })} /></label>
          <label className="text-sm font-semibold">Cân nặng
            <input className={field} maxLength={100} placeholder="10 - 12kg" value={variant.weightRange}
              onChange={(event) => updateVariant(variant.id, { weightRange: event.target.value })} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Độ tuổi
            <input className={field} maxLength={100} placeholder="1 - 2 tuổi" value={variant.ageRange}
              onChange={(event) => updateVariant(variant.id, { ageRange: event.target.value })} /></label>
        </div>)}
      </div>
      <div className="space-y-4 border-t border-cream-100 pt-5">
        <p className="text-sm font-semibold text-charcoal-700">Thêm size mới</p>
        {newVariants.map((variant) => <div key={variant.key} className="grid gap-4 rounded-xl border border-dashed border-cream-300 p-4 sm:grid-cols-6">
          <label className="text-sm font-semibold">Size
            <input className={field} maxLength={50} placeholder="Size 110" value={variant.size}
              onChange={(event) => updateNewVariant(variant.key, { size: event.target.value })} /></label>
          <label className="text-sm font-semibold">Giá bán (đ)
            <input className={field} type="number" inputMode="numeric" min={MIN_PRICE} value={variant.price}
              onChange={(event) => updateNewVariant(variant.key, { price: event.target.value })} /></label>
          <label className="text-sm font-semibold">Tồn kho
            <input className={field} type="number" inputMode="numeric" min="0" value={variant.stock}
              onChange={(event) => updateNewVariant(variant.key, { stock: event.target.value })} /></label>
          <label className="text-sm font-semibold">Cân nặng
            <input className={field} maxLength={100} placeholder="16 - 20kg" value={variant.weightRange}
              onChange={(event) => updateNewVariant(variant.key, { weightRange: event.target.value })} /></label>
          <label className="text-sm font-semibold">Độ tuổi
            <input className={field} maxLength={100} placeholder="4 - 5 tuổi" value={variant.ageRange}
              onChange={(event) => updateNewVariant(variant.key, { ageRange: event.target.value })} /></label>
          <button type="button" onClick={() => setNewVariants((current) => current.filter((row) => row.key !== variant.key))}
            className="min-h-12 self-end rounded-xl px-4 text-sm font-semibold text-red-700">Bỏ size này</button>
        </div>)}
        <button type="button" onClick={() => setNewVariants((current) => [...current, { key: crypto.randomUUID(), size: '',
          // Size mới mặc định cùng giá size cuối để không vô tình để trống giá.
          price: variants.at(-1)?.price ?? '', stock: '0', weightRange: '', ageRange: '' }])}
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
          <img src={cloudinaryImage(url, { width: 400 })} alt={`Ảnh ${index + 1}`} className="h-28 w-full rounded-lg object-cover" />
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
        busy || images.length >= MAX_IMAGES ? 'border-cream-300 bg-cream-50 opacity-60' : 'border-honey-300 bg-honey-50 hover:border-honey-500'}`}>
        <Upload className="h-6 w-6 text-honey-600" />
        <span className="text-sm font-bold text-charcoal-900">
          {uploading ? 'Đang tải ảnh…' : 'Tải ảnh lên (chọn được nhiều ảnh)'}
        </span>
        <span className="text-xs text-charcoal-500">JPEG, PNG, WebP · ảnh lớn được tự nén · tối đa {MAX_IMAGES} ảnh · thứ tự chọn được giữ nguyên</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" disabled={busy || images.length >= MAX_IMAGES} className="hidden"
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
          {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>

    <section className="space-y-4 rounded-2xl border border-cream-200 bg-white p-6" aria-labelledby="product-reviews-title">
      <div className="border-b border-cream-100 pb-3">
        <h3 id="product-reviews-title" className="text-xl font-bold text-charcoal-900">Đánh giá của khách</h3>
        <p className="mt-1 text-sm text-charcoal-600">Trả lời, ẩn hoặc xóa đánh giá được lưu ngay, không cần bấm “Lưu thay đổi”.</p>
      </div>
      <ReviewModerationPanel productId={product.id} />
    </section>
  </div>;
}
