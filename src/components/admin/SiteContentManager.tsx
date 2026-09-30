'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { LookbookCarousel } from '@/components/collection/LookbookCarousel';
import { FeatureCarousel } from '@/components/home/FeatureCarousel';
import { TestimonialsSection, type TestimonialCard } from '@/components/home/TestimonialsSection';
import { ProductGrid } from '@/components/product/ProductGrid';
import { CATEGORY_PAGE_IDS, CATEGORY_PAGE_LABELS } from '@/lib/content/site-content';
import type { Collection } from '@/types/collection';
import type { Product } from '@/types/product';

type HomeFeatureRow = { id: string; src: string; icon: string; title: string; description: string; objectPosition: string };
type SizeGuideRow = { size: string; age: string; weight: string; height: string };
type LinkDraft = { title: string; linkLabel: string; linkHref: string };
type ContentDraft = {
  home_hero: { shopLabel: string; shopHref: string; lookbookLabel: string; lookbookHref: string; defaultBadge: string };
  home_sections: { bestSellers: LinkDraft; sale: LinkDraft; collections: LinkDraft & { eyebrow: string } };
  home_features: { eyebrow: string; title: string; items: HomeFeatureRow[] };
  testimonials_section: { eyebrow: string; title: string };
  brand_assets: { logoUrl: string; logoAlt: string };
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
  testimonials_section: 'Sửa khối đánh giá khách hàng',
};

const emptyLink = (): LinkDraft => ({ title: '', linkLabel: '', linkHref: '' });
const emptyDraft = (): ContentDraft => ({
  home_hero: { shopLabel: '', shopHref: '', lookbookLabel: '', lookbookHref: '', defaultBadge: '' },
  home_sections: { bestSellers: emptyLink(), sale: emptyLink(), collections: { ...emptyLink(), eyebrow: '' } },
  home_features: { eyebrow: '', title: '', items: [] },
  testimonials_section: { eyebrow: '', title: '' },
  brand_assets: { logoUrl: '', logoAlt: '' },
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
  const sections = pick('home_sections', draft.home_sections);
  draft.home_sections = { bestSellers: { ...emptyLink(), ...sections.bestSellers }, sale: { ...emptyLink(), ...sections.sale },
    collections: { ...emptyLink(), ...sections.collections, eyebrow: sections.collections.eyebrow || '' } };
  const rawFeatures = content.home_features;
  draft.home_features = Array.isArray(rawFeatures)
    ? { eyebrow: '', title: '', items: rawFeatures as HomeFeatureRow[] }
    : pick('home_features', draft.home_features);
  draft.testimonials_section = pick('testimonials_section', draft.testimonials_section);
  draft.brand_assets = pick('brand_assets', draft.brand_assets);
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

function LinkFields({ legend, value, onChange, eyebrow }: {
  legend: string; value: LinkDraft & { eyebrow?: string }; onChange: (value: LinkDraft & { eyebrow?: string }) => void; eyebrow?: boolean;
}) {
  return <fieldset className="space-y-3 rounded-2xl border border-cream-200 p-4">
    <legend className="px-2 text-sm font-bold">{legend}</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="Tiêu đề khối" value={value.title} onChange={(title) => onChange({ ...value, title })} />
      {eyebrow && <TextField label="Dòng nhãn nhỏ phía trên" value={value.eyebrow || ''} maxLength={80}
        onChange={(next) => onChange({ ...value, eyebrow: next })} />}
      <TextField label="Nhãn liên kết" value={value.linkLabel} maxLength={60} onChange={(linkLabel) => onChange({ ...value, linkLabel })} />
      <TextField label="Đường dẫn liên kết" value={value.linkHref} maxLength={300} placeholder="/collections"
        onChange={(linkHref) => onChange({ ...value, linkHref })} />
    </div>
  </fieldset>;
}

/** Bọc một khối thật của trang khách hàng và gắn nút Sửa ở góc. */
function EditableSection({ label, active, onEdit, children }: {
  label: string; active: boolean; onEdit: () => void; children: React.ReactNode;
}) {
  return <section className={`relative rounded-3xl transition-shadow ${active ? 'ring-2 ring-honey-500' : 'hover:ring-2 hover:ring-honey-300'}`}>
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

export function SiteContentManager({ initialContent, collections, bestSellers, saleProducts, testimonials }: {
  initialContent: Record<string, unknown>;
  collections: Collection[];
  bestSellers: Product[];
  saleProducts: Product[];
  testimonials: TestimonialCard[];
}) {
  const [draft, setDraft] = useState<ContentDraft>(() => toDraft(initialContent));
  const [dirty, setDirty] = useState<ContentKey[]>([]);
  const [editing, setEditing] = useState<ContentKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty((current) => current.includes(key) ? current : [...current, key]);
  };
  const toggle = (key: ContentKey) => setEditing((current) => current === key ? null : key);

  const saveAll = async () => {
    if (dirty.length === 0) return;
    setSaving(true); setMessage(''); setError('');
    const failed: ContentKey[] = [];
    try {
      for (const key of dirty) {
        const response = await fetch(`/api/admin/site-content/${key}`, { method: 'PUT',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft[key]) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) { failed.push(key); setError(data.error || `Không lưu được khối ${key}`); }
      }
      if (failed.length === 0) {
        setMessage(`Đã lưu ${dirty.length} khối nội dung. Website sẽ hiển thị nội dung mới trong ít phút.`);
        setDirty([]);
        window.dispatchEvent(new Event('tpetie:site-content-updated'));
      } else {
        setDirty(failed);
      }
    } finally { setSaving(false); }
  };

  const sections = draft.home_sections;

  return <div className="pb-24">
    {/* Thanh công cụ chỉnh sửa */}
    <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-cream-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
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

    {/* Mô phỏng trang chủ bằng chính các khối thật */}
    <div className="space-y-10">
      {collections.length > 0 && <EditableSection label="1. Hero trang chủ" active={editing === 'home_hero'} onEdit={() => toggle('home_hero')}>
        <HeroCarousel collections={collections} hero={draft.home_hero} />
      </EditableSection>}

      {bestSellers.length > 0 && <EditableSection label="2. Sản phẩm bán chạy" active={editing === 'home_sections'} onEdit={() => toggle('home_sections')}>
        <div className="px-1">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading text-charcoal-900 sm:text-2xl">{sections.bestSellers.title || 'Sản phẩm bán chạy'}</h2>
            {sections.bestSellers.linkLabel && <span className="text-xs font-bold text-honey-600">{sections.bestSellers.linkLabel} →</span>}
          </div>
          <ProductGrid products={bestSellers} />
        </div>
      </EditableSection>}

      {saleProducts.length > 0 && <EditableSection label="3. Sản phẩm ưu đãi" active={editing === 'home_sections'} onEdit={() => toggle('home_sections')}>
        <div className="px-1">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading text-charcoal-900 sm:text-2xl">{sections.sale.title || 'Sản phẩm ưu đãi'}</h2>
            {sections.sale.linkLabel && <span className="text-xs font-bold text-honey-600">{sections.sale.linkLabel}</span>}
          </div>
          <ProductGrid products={saleProducts} />
        </div>
      </EditableSection>}

      {collections.length > 0 && <EditableSection label="4. Bộ sưu tập nổi bật" active={editing === 'home_sections'} onEdit={() => toggle('home_sections')}>
        <div className="px-1">
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

      {draft.home_features.items.length > 0 && <EditableSection label="5. Ảnh chủ đề" active={editing === 'home_features'} onEdit={() => toggle('home_features')}>
        <div className="px-1"><FeatureCarousel section={draft.home_features} /></div>
      </EditableSection>}

      {testimonials.length > 0 && <EditableSection label="6. Đánh giá khách hàng" active={editing === 'testimonials_section'} onEdit={() => toggle('testimonials_section')}>
        <TestimonialsSection testimonials={testimonials} section={draft.testimonials_section} />
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

        {editing === 'home_hero' && <div className="grid gap-3 sm:grid-cols-2">
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
        </div>}

        {editing === 'home_sections' && <div className="space-y-4">
          <LinkFields legend="Sản phẩm bán chạy" value={draft.home_sections.bestSellers}
            onChange={(bestSellers) => update('home_sections', { ...draft.home_sections, bestSellers })} />
          <LinkFields legend="Sản phẩm ưu đãi" value={draft.home_sections.sale}
            onChange={(sale) => update('home_sections', { ...draft.home_sections, sale })} />
          <LinkFields legend="Bộ sưu tập nổi bật" eyebrow value={draft.home_sections.collections}
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
            Nội dung đánh giá lấy từ khách hàng đã gửi và được duyệt ở mục &ldquo;Đánh giá sản phẩm&rdquo;.
            Tại đây chỉ chỉnh tiêu đề khối hiển thị ở trang chủ.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
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
