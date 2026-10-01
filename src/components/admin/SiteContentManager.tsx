'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { LookbookCarousel } from '@/components/collection/LookbookCarousel';
import { FeatureCarousel } from '@/components/home/FeatureCarousel';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { ProductGrid } from '@/components/product/ProductGrid';
import { CATEGORY_PAGE_IDS, CATEGORY_PAGE_LABELS, HOME_BLOCK_IDS, type HomeBlockId } from '@/lib/content/site-content';
import type { Collection } from '@/types/collection';
import type { Product } from '@/types/product';
import type { PublicFeedback } from '@/types/testimonial';

type HomeFeatureRow = { id: string; src: string; icon: string; title: string; description: string; objectPosition: string };
type SizeGuideRow = { size: string; age: string; weight: string; height: string };
type ImageDraft = { imageUrl: string; imageAlt: string };
type LinkDraft = { title: string; linkLabel: string; linkHref: string; productIds: string[] } & ImageDraft;
type ContentDraft = {
  home_hero: { shopLabel: string; shopHref: string; lookbookLabel: string; lookbookHref: string; defaultBadge: string; slides: { id: string; imageUrl: string; imageAlt: string; icon: string; title: string; description: string; badge: string; href: string; objectPosition: string }[] } & ImageDraft;
  home_sections: { bestSellers: LinkDraft; sale: LinkDraft; collections: LinkDraft & { eyebrow: string } };
  home_layout: { order: HomeBlockId[] };
  home_features: { eyebrow: string; title: string; items: HomeFeatureRow[] };
  testimonials_section: { eyebrow: string; title: string } & ImageDraft;
  brand_assets: { logoUrl: string; logoAlt: string };
  contact_info: { hotline: string; hotlineHours: string; zaloUrl: string; zaloLabel: string; messengerUrl: string;
    facebookUrl: string; tiktokUrl: string; instagramUrl: string; commitment: string; madeIn: string; copyrightName: string };
  sale_page: { bannerUrl: string; bannerAlt: string; title: string; description: string };
  about_page: { heroImageUrl: string; heroImageAlt: string; heroTitle: string; heroDescription: string;
    ctaTitle: string; ctaDescription: string; ctaLabel: string; ctaHref: string };
  category_pages: { items: { id: string; imageUrl: string; imageAlt: string; title: string; description: string }[] };
  size_guide: { baby: SizeGuideRow[]; kids: SizeGuideRow[]; tips: string[] };
};
type ContentKey = keyof ContentDraft;

/** Các khối nằm ngay trên trang chủ nên được sửa trong bảng trượt bên phải. */
const HOME_SECTION_KEYS: ContentKey[] = ['home_hero', 'home_sections', 'home_features', 'testimonials_section'];
const HOME_SECTION_TITLES: Partial<Record<ContentKey, string>> = {
  home_hero: 'Sửa hero trang chủ',
  home_sections: 'Sửa tiêu đề các khối',
  home_features: 'Sửa ảnh chủ đề',
  testimonials_section: 'Sửa khối feedback khách hàng',
};

const emptyLink = (): LinkDraft => ({ title: '', linkLabel: '', linkHref: '', productIds: [], imageUrl: '', imageAlt: '' });
const emptyDraft = (): ContentDraft => ({
  home_hero: { shopLabel: '', shopHref: '', lookbookLabel: '', lookbookHref: '', defaultBadge: '', imageUrl: '', imageAlt: '', slides: [] },
  home_sections: { bestSellers: emptyLink(), sale: emptyLink(), collections: { ...emptyLink(), eyebrow: '' } },
  home_layout: { order: [...HOME_BLOCK_IDS] },
  home_features: { eyebrow: '', title: '', items: [] },
  testimonials_section: { eyebrow: '', title: '', imageUrl: '', imageAlt: '' },
  brand_assets: { logoUrl: '', logoAlt: '' },
  contact_info: { hotline: '', hotlineHours: '', zaloUrl: '', zaloLabel: '', messengerUrl: '', facebookUrl: '',
    tiktokUrl: '', instagramUrl: '', commitment: '', madeIn: '', copyrightName: '' },
  sale_page: { bannerUrl: '', bannerAlt: '', title: '', description: '' },
  about_page: { heroImageUrl: '', heroImageAlt: '', heroTitle: '', heroDescription: '',
    ctaTitle: '', ctaDescription: '', ctaLabel: '', ctaHref: '' },
  category_pages: { items: CATEGORY_PAGE_IDS.map((id) => ({ id, imageUrl: '', imageAlt: '', title: '', description: '' })) },
  size_guide: { baby: [], kids: [], tips: [] },
});

/** Ghép dữ liệu đã lưu với form mặc định, chấp nhận cả home_features dạng mảng cũ. */
function toDraft(content: Record<string, unknown> | null): ContentDraft {
  const draft = emptyDraft();
  if (!content) return draft;
  const pick = <T,>(key: ContentKey, fallback: T): T =>
    (content[key] && typeof content[key] === 'object' ? { ...(fallback as object), ...(content[key] as object) } : fallback) as T;
  draft.home_hero = pick('home_hero', draft.home_hero);
  draft.home_layout = pick('home_layout', draft.home_layout);
  const sections = pick('home_sections', draft.home_sections);
  draft.home_sections = { bestSellers: { ...emptyLink(), ...sections.bestSellers }, sale: { ...emptyLink(), ...sections.sale },
    collections: { ...emptyLink(), ...sections.collections, eyebrow: sections.collections.eyebrow || '' } };
  const rawFeatures = content.home_features;
  draft.home_features = Array.isArray(rawFeatures)
    ? { eyebrow: '', title: '', items: rawFeatures as HomeFeatureRow[] }
    : pick('home_features', draft.home_features);
  draft.testimonials_section = pick('testimonials_section', draft.testimonials_section);
  draft.brand_assets = pick('brand_assets', draft.brand_assets);
  draft.contact_info = pick('contact_info', draft.contact_info);
  draft.sale_page = pick('sale_page', draft.sale_page);
  draft.about_page = pick('about_page', draft.about_page);
  const sizeGuide = content.size_guide as { baby?: SizeGuideRow[]; kids?: SizeGuideRow[]; tips?: string[] } | null;
  if (sizeGuide) draft.size_guide = { baby: sizeGuide.baby || [], kids: sizeGuide.kids || [], tips: sizeGuide.tips || [] };
  const categories = content.category_pages as { items?: { id: string }[] } | null;
  if (categories?.items) {
    draft.category_pages = { items: CATEGORY_PAGE_IDS.map((id) => {
      const saved = categories.items!.find((item) => item.id === id);
      return { id, imageUrl: '', imageAlt: '', title: '', description: '', ...(saved || {}) };
    }) };
  }
  return draft;
}

const field = 'mt-1 block w-full rounded-xl border p-3';

function TextField({ label, value, onChange, maxLength = 160, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; maxLength?: number; placeholder?: string;
}) {
  return <label className="text-sm font-semibold">{label}
    <input value={value} maxLength={maxLength} placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)} className={field} />
  </label>;
}

const DESTINATIONS = [{ label: 'Không dẫn đi đâu', value: '' }, { label: 'Trang sản phẩm', value: '/girls' }, { label: 'Bộ sưu tập', value: '/collections' }, { label: 'Ưu đãi', value: '/sale' }, { label: 'Giới thiệu', value: '/about' }];
function DestinationField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold">{label}<select value={DESTINATIONS.some((item) => item.value === value) ? value : ''} onChange={(event) => onChange(event.target.value)} className={field}>{DESTINATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>;
}

/** Ô chọn sản phẩm chỉ cần các trường này; trang chỉ gửi đúng chừng đó xuống trình duyệt. */
export type ProductOption = Pick<Product, 'id' | 'name' | 'thumbnail' | 'basePrice'>;

function ProductSelector({ products, selected, onChange }: { products: ProductOption[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState('');
  const matches = products.filter((product) => product.name.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN')));
  const chosen = selected.map((id) => products.find((product) => product.id === id)).filter((product): product is ProductOption => Boolean(product));
  return <div className="space-y-3 rounded-xl border border-cream-200 p-3"><div className="flex items-center justify-between"><p className="text-sm font-bold">Sản phẩm đã chọn: {chosen.length}</p></div>
    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm sản phẩm theo tên…" className="w-full rounded-lg border p-2 text-sm" />
    {query && <div className="max-h-56 space-y-2 overflow-y-auto">{matches.filter((product) => !selected.includes(product.id)).map((product) => <button key={product.id} type="button" onClick={() => { onChange([...selected, product.id]); setQuery(''); }} className="flex w-full items-center gap-3 rounded-xl border border-cream-200 p-2 text-left hover:border-honey-500"><img src={product.thumbnail} alt="" className="size-12 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{product.name}</span><span className="text-sm font-bold text-honey-700">{product.basePrice.toLocaleString('vi-VN')}đ</span><span className="rounded-lg bg-honey-600 px-2 py-1 text-xs font-bold text-white">Chọn</span></button>)}</div>}
    <div className="space-y-2">{chosen.map((product, index) => <div key={product.id} className="flex items-center gap-3 rounded-xl bg-cream-50 p-2"><span className="text-sm font-bold">{index + 1}</span><img src={product.thumbnail} alt="" className="size-10 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{product.name}</span><button type="button" onClick={() => onChange(selected.filter((id) => id !== product.id))} className="text-sm font-semibold text-red-700">Bỏ</button></div>)}</div>
  </div>;
}

function LinkFields({ legend, value, onChange, eyebrow, products }: {
  legend: string; value: LinkDraft & { eyebrow?: string }; onChange: (value: LinkDraft & { eyebrow?: string }) => void; eyebrow?: boolean; products: ProductOption[];
}) {
  return <fieldset className="space-y-3 rounded-2xl border border-cream-200 p-4">
    <legend className="px-2 text-sm font-bold">{legend}</legend>
    <MediaPicker label="Ảnh minh họa" value={value.imageUrl} altText={value.imageAlt}
      onChange={(imageUrl) => onChange({ ...value, imageUrl })} />
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="Mô tả ảnh (alt)" value={value.imageAlt} maxLength={200}
        onChange={(imageAlt) => onChange({ ...value, imageAlt })} />
      <TextField label="Tiêu đề khối" value={value.title} onChange={(title) => onChange({ ...value, title })} />
      {eyebrow && <TextField label="Dòng nhãn nhỏ phía trên" value={value.eyebrow || ''} maxLength={80}
        onChange={(next) => onChange({ ...value, eyebrow: next })} />}
      <TextField label="Nhãn liên kết" value={value.linkLabel} maxLength={60} onChange={(linkLabel) => onChange({ ...value, linkLabel })} />
      <DestinationField label="Nút sẽ mở" value={value.linkHref}
        onChange={(linkHref) => onChange({ ...value, linkHref })} />
    </div>
    <ProductSelector products={products} selected={value.productIds} onChange={(productIds) => onChange({ ...value, productIds })} />
  </fieldset>;
}

/** Bọc một khối thật của trang khách hàng và gắn nút Sửa ở góc. */
function EditableSection({ label, active, onEdit, children, style }: {
  label: string; active: boolean; onEdit: () => void; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return <section style={style} className={`relative rounded-3xl transition-shadow ${active ? 'ring-2 ring-honey-500' : 'hover:ring-2 hover:ring-honey-300'}`}>
    <div className="pointer-events-none absolute -top-3 left-3 z-20 rounded-full bg-charcoal-900/85 px-3 py-1 text-[11px] font-bold text-white">
      {label}
    </div>
    <button type="button" onClick={onEdit}
      className="absolute -top-3 right-3 z-20 min-h-9 rounded-full bg-honey-600 px-4 text-xs font-bold text-white shadow-md hover:bg-honey-700">
      {active ? 'Đang sửa' : 'Sửa'}
    </button>
    {children}
  </section>;
}

/** Khối không nằm trên trang chủ: giữ bản xem trước gọn và nút Sửa. */
function SectionShell({ title, hint, editing, onToggle, preview, children }: {
  title: string; hint: string; editing: boolean; onToggle: () => void;
  preview: React.ReactNode; children: React.ReactNode;
}) {
  return <section className={`rounded-2xl border bg-white p-5 sm:p-6 ${editing ? 'border-honey-500 ring-2 ring-honey-200' : 'border-cream-200'}`}>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold">{title}</h2><p className="text-xs text-charcoal-500">{hint}</p></div>
      <button type="button" onClick={onToggle}
        className={`min-h-11 rounded-xl px-4 text-sm font-bold ${editing ? 'border border-cream-300' : 'bg-honey-600 text-white'}`}>
        {editing ? 'Đóng' : 'Sửa'}
      </button>
    </header>
    <div className="mt-4 rounded-xl border border-dashed border-cream-300 bg-cream-50 p-3">{preview}</div>
    {editing && <div className="mt-4 space-y-4">{children}</div>}
  </section>;
}

const previewImage = (url: string, label: string) => url
  ? <img src={url} alt={label} className="h-24 w-full rounded-lg object-cover" />
  : <p className="text-xs text-charcoal-500">Chưa cấu hình ảnh</p>;

const HOME_BLOCK_LABELS: Record<HomeBlockId, string> = {
  hero: 'Hero trang chủ', bestSellers: 'Sản phẩm bán chạy', sale: 'Sản phẩm ưu đãi',
  collections: 'Bộ sưu tập nổi bật', features: 'Ảnh chủ đề', testimonials: 'Feedback khách hàng',
};

/** Danh sách kéo-thả dùng HTML Drag and Drop, chỉ đổi thứ tự chứ không làm mất khối. */
function HomeOrderEditor({ order, onChange }: { order: HomeBlockId[]; onChange: (order: HomeBlockId[]) => void }) {
  const [dragged, setDragged] = useState<HomeBlockId | null>(null);
  const move = (target: HomeBlockId) => {
    if (!dragged || dragged === target) return;
    const next = order.filter((id) => id !== dragged);
    next.splice(next.indexOf(target), 0, dragged);
    onChange(next);
    setDragged(null);
  };
  return <section className="mb-6 rounded-2xl border border-cream-200 bg-cream-50 p-4">
    <h2 className="font-heading text-base font-bold">Thứ tự các khối trang chủ</h2>
    <p className="mt-1 text-xs text-charcoal-600">Giữ biểu tượng ⠿ rồi kéo một khối đến vị trí mong muốn. Nhấn Lưu tất cả thay đổi để áp dụng trên website.</p>
    <ol className="mt-3 space-y-2">{order.map((id, index) => <li key={id} draggable
      onDragStart={() => setDragged(id)} onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()}
      onDrop={() => move(id)} className={`flex cursor-grab items-center gap-3 rounded-xl border bg-white px-3 py-3 text-sm font-semibold active:cursor-grabbing ${dragged === id ? 'border-honey-500 opacity-50' : 'border-cream-200'}`}>
      <span aria-hidden="true" className="text-lg text-charcoal-400">⠿</span><span className="text-charcoal-500">{index + 1}.</span>{HOME_BLOCK_LABELS[id]}
    </li>)}</ol>
  </section>;
}

export function SiteContentManager({ initialContent, collections, products, bestSellers, saleProducts, feedback, feedbackTotal }: {
  initialContent: Record<string, unknown>;
  collections: Collection[];
  products: ProductOption[];
  bestSellers: Product[];
  saleProducts: Product[];
  feedback: PublicFeedback[];
  feedbackTotal: number;
}) {
  const [draft, setDraft] = useState<ContentDraft>(() => toDraft(initialContent));
  const router = useRouter();
  const [dirty, setDirty] = useState<ContentKey[]>([]);
  const [editing, setEditing] = useState<ContentKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const revisionRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/site-content', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được nội dung');
      setDraft(toDraft(data.content));
      setDirty([]);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Có lỗi xảy ra'); }
  }, []);

  const update = <K extends ContentKey>(key: K, value: ContentDraft[K]) => {
    revisionRef.current += 1;
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty((current) => current.includes(key) ? current : [...current, key]);
  };
  const toggle = (key: ContentKey) => setEditing((current) => current === key ? null : key);

  const saveAll = async () => {
    if (dirty.length === 0) return;
    const keysToSave = [...dirty];
    const savedRevision = revisionRef.current;
    setSaving(true); setMessage(''); setError('');
    const failed: ContentKey[] = [];
    try {
      // Các khối độc lập nhau nên lưu song song thay vì chờ lần lượt từng khối.
      await Promise.all(keysToSave.map(async (key) => {
        const response = await fetch(`/api/admin/site-content/${key}`, { method: 'PUT',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft[key]) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) { failed.push(key); setError(data.error || `Không lưu được khối ${key}`); }
      }));
      if (failed.length === 0) {
        const changedDuringSave = revisionRef.current !== savedRevision;
        setMessage(changedDuringSave
          ? `Đã lưu ${keysToSave.length} khối. Bạn còn thay đổi mới chưa được lưu.`
          : `Đã lưu ${keysToSave.length} khối nội dung. Website sẽ hiển thị nội dung mới trong ít phút.`);
        if (!changedDuringSave) setDirty([]);
        // Trang này dựng từ dữ liệu máy chủ: xóa bản đã lưu trong trình duyệt để lần mở sau thấy nội dung mới.
        router.refresh();
      } else {
        if (revisionRef.current === savedRevision) setDirty(failed);
      }
    } finally { setSaving(false); }
  };

  const sections = draft.home_sections;

  return <div className="pb-24">
    {/* Thanh công cụ chỉnh sửa */}
    {/* Thanh công cụ nằm dưới header quản trị đang cố định. */}
    <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-cream-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold font-heading">Chỉnh sửa nội dung website</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" target="_blank" className="min-h-11 rounded-xl border border-cream-300 px-4 py-2.5 text-sm font-semibold">Xem trang thật ↗</Link>
          {dirty.length > 0 && <button type="button" disabled={saving} onClick={() => void load()}
            className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold disabled:opacity-50">Hoàn tác</button>}
          <button type="button" disabled={saving || dirty.length === 0} onClick={() => void saveAll()}
            className="min-h-11 rounded-xl bg-sage-700 px-5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Đang lưu…' : `Lưu tất cả thay đổi${dirty.length ? ` (${dirty.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>

    {message && <p role="status" className="mb-4 rounded-xl bg-cream-100 p-3 text-sm text-charcoal-900">{message}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <HomeOrderEditor order={draft.home_layout.order} onChange={(order) => update('home_layout', { order })} />

    {/* Mô phỏng trang chủ bằng chính các khối thật */}
    <div className="flex flex-col gap-10">
      {(collections.length > 0 || draft.home_hero.imageUrl) && <EditableSection style={{ order: draft.home_layout.order.indexOf('hero') }} label="Hero trang chủ" active={editing === 'home_hero'} onEdit={() => toggle('home_hero')}>
        <HeroCarousel collections={collections} hero={draft.home_hero} />
      </EditableSection>}

      {bestSellers.length > 0 && <EditableSection style={{ order: draft.home_layout.order.indexOf('bestSellers') }} label="Sản phẩm bán chạy" active={editing === 'home_sections'} onEdit={() => toggle('home_sections')}>
        <div className="px-1">
          {sections.bestSellers.imageUrl && <img src={sections.bestSellers.imageUrl} alt={sections.bestSellers.imageAlt || ''} className="mb-5 h-40 w-full rounded-2xl object-cover" />}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading text-charcoal-900 sm:text-2xl">{sections.bestSellers.title || 'Sản phẩm bán chạy'}</h2>
            {sections.bestSellers.linkLabel && <span className="text-xs font-bold text-honey-600">{sections.bestSellers.linkLabel} →</span>}
          </div>
          <ProductGrid products={bestSellers} />
        </div>
      </EditableSection>}

      {saleProducts.length > 0 && <EditableSection style={{ order: draft.home_layout.order.indexOf('sale') }} label="Sản phẩm ưu đãi" active={editing === 'home_sections'} onEdit={() => toggle('home_sections')}>
        <div className="px-1">
          {sections.sale.imageUrl && <img src={sections.sale.imageUrl} alt={sections.sale.imageAlt || ''} className="mb-5 h-40 w-full rounded-2xl object-cover" />}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading text-charcoal-900 sm:text-2xl">{sections.sale.title || 'Sản phẩm ưu đãi'}</h2>
            {sections.sale.linkLabel && <span className="text-xs font-bold text-honey-600">{sections.sale.linkLabel}</span>}
          </div>
          <ProductGrid products={saleProducts} />
        </div>
      </EditableSection>}

      {collections.length > 0 && <EditableSection style={{ order: draft.home_layout.order.indexOf('collections') }} label="Bộ sưu tập nổi bật" active={editing === 'home_sections'} onEdit={() => toggle('home_sections')}>
        <div className="px-1">
          {sections.collections.imageUrl && <img src={sections.collections.imageUrl} alt={sections.collections.imageAlt || ''} className="mb-5 h-40 w-full rounded-2xl object-cover" />}
          <div className="mb-4 flex items-center justify-between">
            <div>
              {sections.collections.eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-honey-600">{sections.collections.eyebrow}</p>}
              <h2 className="text-lg font-bold font-heading text-charcoal-900 sm:text-2xl">{sections.collections.title || 'Bộ sưu tập nổi bật'}</h2>
            </div>
            {sections.collections.linkLabel && <span className="text-xs font-bold text-honey-600">{sections.collections.linkLabel} →</span>}
          </div>
          <LookbookCarousel collections={collections} />
        </div>
      </EditableSection>}

      {draft.home_features.items.length > 0 && <EditableSection style={{ order: draft.home_layout.order.indexOf('features') }} label="Ảnh chủ đề" active={editing === 'home_features'} onEdit={() => toggle('home_features')}>
        <div className="px-1"><FeatureCarousel section={draft.home_features} /></div>
      </EditableSection>}

      {feedback.length > 0 && <EditableSection style={{ order: draft.home_layout.order.indexOf('testimonials') }} label="Feedback khách hàng" active={editing === 'testimonials_section'} onEdit={() => toggle('testimonials_section')}>
        <TestimonialsSection feedback={feedback} feedbackTotal={feedbackTotal} section={draft.testimonials_section} />
      </EditableSection>}
    </div>

    {/* Các khối thuộc trang khác */}
    <div className="mt-12 space-y-6">
      <h2 className="text-xl font-bold font-heading">Nội dung các trang khác</h2>

      <SectionShell title="Banner trang Ưu đãi" hint="Ảnh và lời dẫn ở đầu trang /sale."
        editing={editing === 'sale_page'} onToggle={() => toggle('sale_page')}
        preview={<div className="space-y-2">{previewImage(draft.sale_page.bannerUrl, draft.sale_page.bannerAlt)}
          <p className="text-sm font-bold">{draft.sale_page.title || '—'}</p>
          <p className="text-xs text-charcoal-600">{draft.sale_page.description || '—'}</p></div>}>
        <MediaPicker label="Ảnh banner" value={draft.sale_page.bannerUrl} altText={draft.sale_page.bannerAlt} onError={setError}
          onChange={(bannerUrl) => update('sale_page', { ...draft.sale_page, bannerUrl })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Mô tả ảnh (alt)" value={draft.sale_page.bannerAlt} maxLength={200}
            onChange={(bannerAlt) => update('sale_page', { ...draft.sale_page, bannerAlt })} />
          <TextField label="Tiêu đề trang" value={draft.sale_page.title} maxLength={160}
            onChange={(title) => update('sale_page', { ...draft.sale_page, title })} />
          <TextField label="Lời dẫn" value={draft.sale_page.description} maxLength={500}
            onChange={(description) => update('sale_page', { ...draft.sale_page, description })} />
        </div>
      </SectionShell>

      <SectionShell title="Trang Về Chúng Tôi" hint="Ảnh nền đầu trang và khối mời gọi cuối trang."
        editing={editing === 'about_page'} onToggle={() => toggle('about_page')}
        preview={<div className="space-y-2">{previewImage(draft.about_page.heroImageUrl, draft.about_page.heroImageAlt)}
          <p className="text-xs text-charcoal-600">Tiêu đề ẩn SEO: {draft.about_page.heroTitle || '—'}</p>
          <div className="rounded-lg bg-gradient-to-r from-cream-200 to-blush-100 p-3 text-center">
            <p className="text-sm font-bold">{draft.about_page.ctaTitle || '—'}</p>
            <p className="text-xs">{draft.about_page.ctaDescription || '—'}</p>
            <p className="mt-1 text-xs font-bold text-honey-700">{draft.about_page.ctaLabel || '—'}</p>
          </div></div>}>
        <MediaPicker label="Ảnh nền đầu trang" value={draft.about_page.heroImageUrl} altText={draft.about_page.heroImageAlt} onError={setError}
          onChange={(heroImageUrl) => update('about_page', { ...draft.about_page, heroImageUrl })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Mô tả ảnh (alt)" value={draft.about_page.heroImageAlt} maxLength={200}
            onChange={(heroImageAlt) => update('about_page', { ...draft.about_page, heroImageAlt })} />
          <TextField label="Tiêu đề ẩn cho SEO" value={draft.about_page.heroTitle} maxLength={200}
            onChange={(heroTitle) => update('about_page', { ...draft.about_page, heroTitle })} />
          <TextField label="Mô tả ẩn cho SEO" value={draft.about_page.heroDescription} maxLength={500}
            onChange={(heroDescription) => update('about_page', { ...draft.about_page, heroDescription })} />
          <TextField label="Tiêu đề khối mời gọi" value={draft.about_page.ctaTitle} maxLength={200}
            onChange={(ctaTitle) => update('about_page', { ...draft.about_page, ctaTitle })} />
          <TextField label="Lời dẫn khối mời gọi" value={draft.about_page.ctaDescription} maxLength={500}
            onChange={(ctaDescription) => update('about_page', { ...draft.about_page, ctaDescription })} />
          <TextField label="Nhãn nút" value={draft.about_page.ctaLabel} maxLength={60}
            onChange={(ctaLabel) => update('about_page', { ...draft.about_page, ctaLabel })} />
          <TextField label="Liên kết nút" value={draft.about_page.ctaHref} maxLength={300} placeholder="/collections"
            onChange={(ctaHref) => update('about_page', { ...draft.about_page, ctaHref })} />
        </div>
      </SectionShell>

      <SectionShell title="Ảnh chủ đề trang danh mục" hint="Ảnh và lời dẫn đầu mỗi trang danh mục sản phẩm."
        editing={editing === 'category_pages'} onToggle={() => toggle('category_pages')}
        preview={<div className="grid gap-2 sm:grid-cols-3">{draft.category_pages.items.map((item) =>
          <div key={item.id} className="rounded-lg border border-cream-200 bg-white p-2">
            {previewImage(item.imageUrl, item.imageAlt)}
            <p className="mt-1 text-xs font-semibold">{CATEGORY_PAGE_LABELS[item.id as keyof typeof CATEGORY_PAGE_LABELS]?.label || item.id}</p>
            <p className="truncate text-xs text-charcoal-600">{item.title || '—'}</p>
          </div>)}</div>}>
        {draft.category_pages.items.map((item, index) => <div key={item.id} className="space-y-3 rounded-2xl border border-cream-200 p-4">
          <h3 className="font-bold">{CATEGORY_PAGE_LABELS[item.id as keyof typeof CATEGORY_PAGE_LABELS]?.label || item.id}</h3>
          <MediaPicker label="Ảnh chủ đề" value={item.imageUrl} altText={item.imageAlt} onError={setError}
            onChange={(imageUrl) => update('category_pages', { items: draft.category_pages.items
              .map((row, position) => position === index ? { ...row, imageUrl } : row) })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Mô tả ảnh (alt)" value={item.imageAlt} maxLength={200}
              onChange={(imageAlt) => update('category_pages', { items: draft.category_pages.items
                .map((row, position) => position === index ? { ...row, imageAlt } : row) })} />
            <TextField label="Tiêu đề trang" value={item.title} maxLength={160}
              onChange={(title) => update('category_pages', { items: draft.category_pages.items
                .map((row, position) => position === index ? { ...row, title } : row) })} />
            <TextField label="Lời dẫn" value={item.description} maxLength={500}
              onChange={(description) => update('category_pages', { items: draft.category_pages.items
                .map((row, position) => position === index ? { ...row, description } : row) })} />
          </div>
        </div>)}
      </SectionShell>

      <SectionShell title="Bảng hướng dẫn chọn size" hint="Số đo hiển thị trong cửa sổ chọn size ở trang sản phẩm và chân trang."
        editing={editing === 'size_guide'} onToggle={() => toggle('size_guide')}
        preview={<div className="space-y-1 text-xs">
          <p>Em bé: {draft.size_guide.baby.length} dòng · Bé lớn: {draft.size_guide.kids.length} dòng · {draft.size_guide.tips.length} lưu ý</p>
          {draft.size_guide.baby.slice(0, 2).map((row, index) => <p key={index} className="text-charcoal-600">
            {row.size} · {row.age} · {row.weight} · {row.height}</p>)}
        </div>}>
        {(['baby', 'kids'] as const).map((group) => <div key={group} className="space-y-2">
          <h3 className="text-sm font-bold">{group === 'baby' ? 'Bảng cho em bé' : 'Bảng cho bé lớn'}</h3>
          {draft.size_guide[group].map((row, index) => <div key={index} className="grid gap-2 sm:grid-cols-5">
            {(['size', 'age', 'weight', 'height'] as const).map((key) => <input key={key} className="rounded-xl border p-2 text-sm"
              placeholder={{ size: 'Size', age: 'Độ tuổi', weight: 'Cân nặng', height: 'Chiều cao' }[key]} maxLength={100} value={row[key]}
              onChange={(event) => update('size_guide', { ...draft.size_guide,
                [group]: draft.size_guide[group].map((item, position) => position === index ? { ...item, [key]: event.target.value } : item) })} />)}
            <button type="button" className="min-h-11 rounded-xl px-3 text-sm font-semibold text-red-700"
              onClick={() => update('size_guide', { ...draft.size_guide,
                [group]: draft.size_guide[group].filter((_, position) => position !== index) })}>Xóa</button>
          </div>)}
          <button type="button" className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold"
            onClick={() => update('size_guide', { ...draft.size_guide,
              [group]: [...draft.size_guide[group], { size: '', age: '', weight: '', height: '' }] })}>Thêm dòng</button>
        </div>)}
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Lưu ý khi chọn size</h3>
          {draft.size_guide.tips.map((tip, index) => <div key={index} className="flex gap-2">
            <input className="flex-1 rounded-xl border p-2 text-sm" maxLength={500} value={tip}
              onChange={(event) => update('size_guide', { ...draft.size_guide,
                tips: draft.size_guide.tips.map((item, position) => position === index ? event.target.value : item) })} />
            <button type="button" className="min-h-11 rounded-xl px-3 text-sm font-semibold text-red-700"
              onClick={() => update('size_guide', { ...draft.size_guide,
                tips: draft.size_guide.tips.filter((_, position) => position !== index) })}>Xóa</button>
          </div>)}
          <button type="button" className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold"
            onClick={() => update('size_guide', { ...draft.size_guide, tips: [...draft.size_guide.tips, ''] })}>Thêm lưu ý</button>
        </div>
      </SectionShell>

      <SectionShell title="Nhận diện thương hiệu" hint="Logo dùng ở đầu trang, chân trang và trang đăng ký."
        editing={editing === 'brand_assets'} onToggle={() => toggle('brand_assets')}
        preview={<div className="flex items-center gap-3">
          {draft.brand_assets.logoUrl
            ? <img src={draft.brand_assets.logoUrl} alt={draft.brand_assets.logoAlt} className="h-12 rounded-lg object-contain" />
            : <span className="font-heading text-lg font-bold text-honey-700">T&apos;Petie</span>}
          <span className="text-xs text-charcoal-600">{draft.brand_assets.logoAlt || 'Chưa có mô tả'}</span>
        </div>}>
        <MediaPicker label="Logo" value={draft.brand_assets.logoUrl} altText={draft.brand_assets.logoAlt} aspect="square" onError={setError}
          onChange={(logoUrl) => update('brand_assets', { ...draft.brand_assets, logoUrl })} />
        <TextField label="Mô tả logo (alt)" value={draft.brand_assets.logoAlt} maxLength={200}
          onChange={(logoAlt) => update('brand_assets', { ...draft.brand_assets, logoAlt })} />
      </SectionShell>

      <SectionShell title="Liên hệ & mạng xã hội" hint="Hiển thị ở chân trang, nút chat Messenger và trang chính sách. Để trống mục nào thì mục đó được ẩn."
        editing={editing === 'contact_info'} onToggle={() => toggle('contact_info')}
        preview={<div className="space-y-1 text-sm text-charcoal-700">
          <p>Hotline: <strong>{draft.contact_info.hotline || 'chưa có'}</strong>{draft.contact_info.hotlineHours ? ` (${draft.contact_info.hotlineHours})` : ''}</p>
          <p className="text-xs text-charcoal-500">{[draft.contact_info.zaloUrl && 'Zalo', draft.contact_info.messengerUrl && 'Messenger',
            draft.contact_info.facebookUrl && 'Facebook', draft.contact_info.tiktokUrl && 'TikTok', draft.contact_info.instagramUrl && 'Instagram']
            .filter(Boolean).join(' · ') || 'Chưa có kênh mạng xã hội'}</p>
        </div>}>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ['hotline', 'Số hotline', 20, '035 999 5381'], ['hotlineHours', 'Giờ nhận cuộc gọi', 60, '8:30 – 23:00'],
            ['zaloUrl', 'Liên kết Zalo', 300, 'https://zalo.me/…'], ['zaloLabel', 'Tên hiển thị Zalo', 80, "Zalo Official: T'Petie"],
            ['messengerUrl', 'Liên kết Messenger (nút chat)', 300, 'https://m.me/…'], ['facebookUrl', 'Trang Facebook', 300, 'https://www.facebook.com/…'],
            ['tiktokUrl', 'Kênh TikTok', 300, 'https://www.tiktok.com/@…'], ['instagramUrl', 'Trang Instagram', 300, 'https://www.instagram.com/…'],
            ['madeIn', 'Nhãn xuất xứ', 80, 'Thiết kế & May đo tại Việt Nam'], ['copyrightName', 'Tên bản quyền', 80, "T'Petie Vietnam"],
          ] as const).map(([key, label, maxLength, placeholder]) => <TextField key={key} label={label} value={draft.contact_info[key]}
            maxLength={maxLength} placeholder={placeholder} onChange={(value) => update('contact_info', { ...draft.contact_info, [key]: value })} />)}
        </div>
        <TextField label="Lời cam kết (chân trang)" value={draft.contact_info.commitment} maxLength={300}
          onChange={(commitment) => update('contact_info', { ...draft.contact_info, commitment })} />
      </SectionShell>
    </div>

    {/* Drawer chỉnh sửa cho các khối nằm ngay trên trang chủ */}
    {editing && HOME_SECTION_KEYS.includes(editing) && <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Đóng bảng chỉnh sửa" onClick={() => setEditing(null)}
        className="flex-1 bg-charcoal-900/30" />
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-2xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{HOME_SECTION_TITLES[editing]}</h2>
          <button type="button" onClick={() => setEditing(null)}
            className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">Đóng</button>
        </header>

        {editing === 'home_hero' && <div className="space-y-3">
          <p className="rounded-xl bg-cream-100 p-3 text-xs text-charcoal-600">Danh sách ảnh Hero hoạt động giống phần Ảnh chủ đề: thêm nhiều ảnh, mỗi ảnh có nội dung riêng.</p>
          {draft.home_hero.slides.map((slide, index) => <div key={slide.id} className="space-y-2 rounded-2xl border border-cream-200 p-3">
            <div className="flex justify-between"><strong>Ảnh Hero {index + 1}</strong><button type="button" className="text-sm text-red-700" onClick={() => update('home_hero', { ...draft.home_hero, slides: draft.home_hero.slides.filter((_, position) => position !== index) })}>Xóa ảnh</button></div>
            <MediaPicker label="Ảnh nền" value={slide.imageUrl} altText={slide.imageAlt} onError={setError} onChange={(imageUrl) => update('home_hero', { ...draft.home_hero, slides: draft.home_hero.slides.map((item, position) => position === index ? { ...item, imageUrl } : item) })} />
            <div className="grid gap-2 sm:grid-cols-2"><TextField label="Mô tả ảnh (alt)" value={slide.imageAlt} onChange={(imageAlt) => update('home_hero', { ...draft.home_hero, slides: draft.home_hero.slides.map((item, position) => position === index ? { ...item, imageAlt } : item) })} /><TextField label="Biểu tượng (emoji)" value={slide.icon} onChange={(icon) => update('home_hero', { ...draft.home_hero, slides: draft.home_hero.slides.map((item, position) => position === index ? { ...item, icon } : item) })} /><TextField label="Tiêu đề" value={slide.title} onChange={(title) => update('home_hero', { ...draft.home_hero, slides: draft.home_hero.slides.map((item, position) => position === index ? { ...item, title } : item) })} /><TextField label="Mô tả" value={slide.description} onChange={(description) => update('home_hero', { ...draft.home_hero, slides: draft.home_hero.slides.map((item, position) => position === index ? { ...item, description } : item) })} /><TextField label="Vị trí ảnh" value={slide.objectPosition} placeholder="center center" onChange={(objectPosition) => update('home_hero', { ...draft.home_hero, slides: draft.home_hero.slides.map((item, position) => position === index ? { ...item, objectPosition } : item) })} /><DestinationField label="Bấm vào ảnh sẽ mở" value={slide.href} onChange={(href) => update('home_hero', { ...draft.home_hero, slides: draft.home_hero.slides.map((item, position) => position === index ? { ...item, href } : item) })} /></div>
          </div>)}
          {draft.home_hero.slides.length < 12 && <button type="button" className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold" onClick={() => update('home_hero', { ...draft.home_hero, slides: [...draft.home_hero.slides, { id: `hero-${Date.now().toString(36)}`, imageUrl: '', imageAlt: '', icon: '✨', title: '', description: '', badge: '', href: '', objectPosition: 'center center' }] })}>Thêm ảnh Hero</button>}
          <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Nhãn nút mua sắm" value={draft.home_hero.shopLabel} maxLength={60}
            onChange={(shopLabel) => update('home_hero', { ...draft.home_hero, shopLabel })} />
          <TextField label="Liên kết nút mua sắm" value={draft.home_hero.shopHref} maxLength={300} placeholder="/girls"
            onChange={(shopHref) => update('home_hero', { ...draft.home_hero, shopHref })} />
          <TextField label="Nhãn nút lookbook" value={draft.home_hero.lookbookLabel} maxLength={60}
            onChange={(lookbookLabel) => update('home_hero', { ...draft.home_hero, lookbookLabel })} />
          <TextField label="Liên kết nút lookbook" value={draft.home_hero.lookbookHref} maxLength={300} placeholder="/collections"
            onChange={(lookbookHref) => update('home_hero', { ...draft.home_hero, lookbookHref })} />
          <TextField label="Nhãn mặc định của banner" value={draft.home_hero.defaultBadge} maxLength={60}
            onChange={(defaultBadge) => update('home_hero', { ...draft.home_hero, defaultBadge })} />
          </div></div>}

        {editing === 'home_sections' && <div className="space-y-4">
          <LinkFields legend="Sản phẩm bán chạy" products={products} value={draft.home_sections.bestSellers}
            onChange={(bestSellers) => update('home_sections', { ...draft.home_sections, bestSellers })} />
          <LinkFields legend="Sản phẩm ưu đãi" products={products} value={draft.home_sections.sale}
            onChange={(sale) => update('home_sections', { ...draft.home_sections, sale })} />
          <LinkFields legend="Bộ sưu tập nổi bật" products={products} eyebrow value={draft.home_sections.collections}
            onChange={(next) => update('home_sections', { ...draft.home_sections,
              collections: { ...next, eyebrow: next.eyebrow || '' } })} />
        </div>}

        {editing === 'home_features' && <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Dòng nhãn nhỏ" value={draft.home_features.eyebrow} maxLength={80}
              onChange={(eyebrow) => update('home_features', { ...draft.home_features, eyebrow })} />
            <TextField label="Tiêu đề khối" value={draft.home_features.title} maxLength={160}
              onChange={(title) => update('home_features', { ...draft.home_features, title })} />
          </div>
          {draft.home_features.items.map((item, index) => <div key={index} className="space-y-3 rounded-2xl border border-cream-200 p-4">
            <div className="flex items-center justify-between"><h3 className="font-bold">Ảnh {index + 1}</h3>
              <button type="button" className="min-h-11 px-3 text-sm font-semibold text-red-700"
                onClick={() => update('home_features', { ...draft.home_features,
                  items: draft.home_features.items.filter((_, position) => position !== index) })}>Xóa ảnh</button></div>
            <MediaPicker label="Ảnh nền" value={item.src} altText={item.title} onError={setError}
              onChange={(src) => update('home_features', { ...draft.home_features,
                items: draft.home_features.items.map((row, position) => position === index ? { ...row, src } : row) })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Biểu tượng (emoji)" value={item.icon} maxLength={12}
                onChange={(icon) => update('home_features', { ...draft.home_features,
                  items: draft.home_features.items.map((row, position) => position === index ? { ...row, icon } : row) })} />
              <TextField label="Vị trí ảnh (object-position)" value={item.objectPosition} maxLength={40} placeholder="center 20%"
                onChange={(objectPosition) => update('home_features', { ...draft.home_features,
                  items: draft.home_features.items.map((row, position) => position === index ? { ...row, objectPosition } : row) })} />
              <TextField label="Tiêu đề" value={item.title} maxLength={100}
                onChange={(title) => update('home_features', { ...draft.home_features,
                  items: draft.home_features.items.map((row, position) => position === index ? { ...row, title } : row) })} />
              <TextField label="Mô tả" value={item.description} maxLength={500}
                onChange={(description) => update('home_features', { ...draft.home_features,
                  items: draft.home_features.items.map((row, position) => position === index ? { ...row, description } : row) })} />
            </div>
          </div>)}
          {draft.home_features.items.length < 12 && <button type="button"
            className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold"
            onClick={() => update('home_features', { ...draft.home_features,
              items: [...draft.home_features.items, { id: `feature-${Date.now().toString(36)}`, src: '', icon: '🌸',
                title: '', description: '', objectPosition: 'center center' }] })}>Thêm ảnh chủ đề</button>}
        </div>}

        {editing === 'testimonials_section' && <div className="space-y-4">
          <p className="rounded-xl bg-cream-100 p-3 text-xs text-charcoal-600">
            Ảnh feedback quản lý ở mục &ldquo;Feedback&rdquo;; đánh giá của khách đã mua chọn hiện trang chủ ở mục
            &ldquo;Đánh giá sản phẩm&rdquo;. Tại đây chỉ chỉnh tiêu đề khối (dùng chung cho trang album /feedback).
          </p>
          <MediaPicker label="Ảnh minh họa đánh giá" value={draft.testimonials_section.imageUrl} altText={draft.testimonials_section.imageAlt} onError={setError}
            onChange={(imageUrl) => update('testimonials_section', { ...draft.testimonials_section, imageUrl })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Mô tả ảnh (alt)" value={draft.testimonials_section.imageAlt} maxLength={200}
              onChange={(imageAlt) => update('testimonials_section', { ...draft.testimonials_section, imageAlt })} />
            <TextField label="Dòng nhãn nhỏ" value={draft.testimonials_section.eyebrow} maxLength={80}
              onChange={(eyebrow) => update('testimonials_section', { ...draft.testimonials_section, eyebrow })} />
            <TextField label="Tiêu đề khối" value={draft.testimonials_section.title} maxLength={160}
              onChange={(title) => update('testimonials_section', { ...draft.testimonials_section, title })} />
          </div>
        </div>}
      </aside>
    </div>}
  </div>;
}
