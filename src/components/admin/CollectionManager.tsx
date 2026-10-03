'use client';

import { useState } from 'react';
import { DataTable, tableParams, type Column, type TableFilter, type TableQuery } from '@/components/admin/DataTable';
import { MediaPicker, MediaListPicker } from '@/components/admin/MediaPicker';
import { ColorPicker } from '@/components/admin/ColorPicker';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { ACCENT_COLOR_PRESETS, THEME_COLOR_PRESETS } from '@/lib/content/collection-colors';
import type { AdminCollection } from '@/types/admin-content';
import { readJson } from '@/client/http';
import { errorText, toast } from '@/client/toast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; collection: AdminCollection };

const field = 'mt-1 block w-full rounded-xl border p-3';

const COLLECTION_SORTS = [
  { value: 'manual', label: 'Thứ tự hiển thị' }, { value: 'newest', label: 'Mới nhất' },
  { value: 'title', label: 'Tên A–Z' }, { value: 'products', label: 'Nhiều sản phẩm nhất' },
];
const COLLECTION_FILTERS: TableFilter[] = [
  { key: 'filter', label: 'Trạng thái', options: [{ value: 'active', label: 'Đang bán' }, { value: 'hidden', label: 'Lưu trữ' }] },
  { key: 'placement', label: 'Vị trí hiển thị', all: 'Tất cả vị trí',
    options: [{ value: 'menu', label: 'Đang hiện ở menu' }, { value: 'home', label: 'Đang hiện ở trang chủ' }] },
];

async function fetchCollections(query: TableQuery) {
  const response = await fetch(`/api/admin/collections?${tableParams(query)}`, { cache: 'no-store' });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Không tải được bộ sưu tập');
  return { items: data.items as AdminCollection[], total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function CollectionManager() {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [reloadKey, setReloadKey] = useState(0);
  const back = () => { setView({ mode: 'list' }); setReloadKey((key) => key + 1); };

  if (view.mode !== 'list') return <CollectionForm collection={view.mode === 'edit' ? view.collection : null} onDone={back} />;

  const columns: Column<AdminCollection>[] = [
    { key: 'banner', header: 'Banner', className: 'w-24', render: (row) => row.bannerUrl
      ? <img src={cloudinaryImage(row.bannerUrl, { width: 160 })} alt={row.title} loading="lazy" className="h-12 w-20 rounded-lg object-cover" />
      : <span className="text-xs text-charcoal-400">—</span> },
    { key: 'title', header: 'Bộ sưu tập', render: (row) => <div>
        <p className="font-semibold text-charcoal-900">{row.title}</p>
        <p className="text-xs text-charcoal-500">{row.season || 'Chưa gắn mùa/chủ đề'}</p>
      </div> },
    { key: 'products', header: 'Sản phẩm', render: (row) => row.productCount },
    { key: 'order', header: 'Thứ tự', render: (row) => row.sortOrder },
    { key: 'show', header: 'Hiển thị', render: (row) => <span className="text-xs text-charcoal-600">
        {row.isActive ? 'Đang bán' : 'Lưu trữ'} · Menu: {row.isActive && row.showInMenu ? 'Có' : 'Không'} · Trang chủ: {row.isActive && row.showOnHome ? 'Có' : 'Không'}
      </span> },
    { key: 'action', header: '', render: (row) => <button type="button" onClick={(event) => { event.stopPropagation(); setView({ mode: 'edit', collection: row }); }} className="min-h-9 whitespace-nowrap rounded-lg border border-cream-300 px-3 text-xs font-bold">Chỉnh sửa</button> },
  ];

  return <div className="space-y-4">
    <DataTable columns={columns} fetchPage={fetchCollections} reloadKey={reloadKey}
      searchPlaceholder="Tìm theo tên hoặc slug"
      sorts={COLLECTION_SORTS} filters={COLLECTION_FILTERS}
      emptyText="Chưa có bộ sưu tập nào."
      onRowClick={(row) => setView({ mode: 'edit', collection: row })}
      toolbar={<button type="button" onClick={() => setView({ mode: 'create' })}
        className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">Thêm bộ sưu tập</button>} />
  </div>;
}

/** Tạo mới hoặc chỉnh sửa một bộ sưu tập. */
function CollectionForm({ collection, onDone }: { collection: AdminCollection | null; onDone: () => void }) {
  const editing = Boolean(collection);
  const [draft, setDraft] = useState({
    title: collection?.title || '', slug: collection?.slug || '', subtitle: collection?.subtitle || '',
    story: collection?.story || '', bannerUrl: collection?.bannerUrl || '', lookbookUrls: collection?.lookbookUrls || [],
    themeColor: collection?.themeColor || '#fff8ee', accentColor: collection?.accentColor || '#d97706',
    season: collection?.season || '', badge: collection?.badge || '', sortOrder: String(collection?.sortOrder ?? 0),
    isActive: collection?.isActive ?? true, showInMenu: collection?.showInMenu ?? true, showOnHome: collection?.showOnHome ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [initialDraft] = useState(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  useUnsavedChangesGuard(dirty && !busy);
  const leave = () => {
    if (dirty && !window.confirm('Có thay đổi chưa lưu. Rời trang và bỏ các thay đổi đó?')) return;
    onDone();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const id = toast.loading(editing ? 'Đang lưu bộ sưu tập…' : 'Đang tạo bộ sưu tập…');
    try {
      const response = await fetch(editing ? `/api/admin/collections/${collection!.id}` : '/api/admin/collections', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, sortOrder: Number(draft.sortOrder) }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Không lưu được bộ sưu tập');
      toast.success(editing ? 'Đã lưu bộ sưu tập' : `Đã tạo bộ sưu tập ${draft.title}`, { id });
      onDone();
    } catch (submitError) {
      const text = errorText(submitError, 'Không lưu được bộ sưu tập');
      toast.error(text, { id });
    }
    finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-cream-200 bg-white p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold">{editing ? 'Sửa bộ sưu tập' : 'Thêm bộ sưu tập mới'}</h2>
      <button type="button" onClick={leave} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">← Về danh sách</button>
    </header>

    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Tên bộ sưu tập
        <input className={field} required minLength={2} maxLength={100} value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label className="text-sm font-semibold">Slug URL
        <input className={`${field} read-only:bg-cream-100`} required readOnly={editing} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*"
          value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} /></label>
      <div className="sm:col-span-2">
        <MediaPicker label="Ảnh banner" value={draft.bannerUrl} altText={draft.title}
          onChange={(bannerUrl) => setDraft({ ...draft, bannerUrl })} />
        <p className="mt-1 text-xs text-charcoal-500">Ảnh ngang, nên khoảng 2048 × 780 px. Banner hiển thị nguyên ảnh, không bị cắt, nên chữ thiết kế trong ảnh vẫn giữ nguyên.</p>
      </div>
      <label className="text-sm font-semibold">Phụ đề
        <input className={field} maxLength={200} value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
      <label className="text-sm font-semibold">Mùa / chủ đề
        <input className={field} maxLength={100} value={draft.season} onChange={(event) => setDraft({ ...draft, season: event.target.value })} /></label>
      <label className="text-sm font-semibold">Nhãn
        <input className={field} maxLength={80} value={draft.badge} onChange={(event) => setDraft({ ...draft, badge: event.target.value })} /></label>
      <label className="text-sm font-semibold">Thứ tự hiển thị
        <input className={field} type="number" min="0" max="999" value={draft.sortOrder}
          onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Câu chuyện
        <textarea className={field} rows={4} maxLength={5000} value={draft.story}
          onChange={(event) => setDraft({ ...draft, story: event.target.value })} /></label>
      <div className="sm:col-span-2">
        <MediaListPicker label="Ảnh lookbook" values={draft.lookbookUrls}
          onChange={(lookbookUrls) => setDraft({ ...draft, lookbookUrls })} />
        <p className="mt-1 text-xs text-charcoal-500">Ảnh dọc (tỉ lệ 2:3) đẹp nhất. 3 ảnh đầu hiện ở trang Bộ sưu tập; ảnh đầu tiên là ảnh lớn trong trang chi tiết. Dùng nút lên/xuống để đổi thứ tự.</p>
      </div>
      <ColorPicker label="Màu nền" value={draft.themeColor} presets={THEME_COLOR_PRESETS}
        onChange={(themeColor) => setDraft({ ...draft, themeColor })} />
      <ColorPicker label="Màu nhấn" value={draft.accentColor} presets={ACCENT_COLOR_PRESETS}
        onChange={(accentColor) => setDraft({ ...draft, accentColor })} />
    </div>
    <div className="flex flex-wrap gap-5 text-sm font-semibold">
      {([['isActive', 'Đang hoạt động'], ['showInMenu', 'Hiện ở menu'], ['showOnHome', 'Hiện ở trang chủ']] as const)
        .map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-2">
          <input type="checkbox" className="size-5" checked={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })} /> {label}
        </label>)}
    </div>
    <button disabled={busy || !draft.bannerUrl} className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">
      {busy ? 'Đang lưu…' : editing ? 'Lưu bộ sưu tập' : 'Tạo bộ sưu tập'}
    </button>
    {!draft.bannerUrl && <p className="text-xs text-charcoal-500">Cần tải lên ảnh banner trước khi lưu.</p>}
  </form>;
}
