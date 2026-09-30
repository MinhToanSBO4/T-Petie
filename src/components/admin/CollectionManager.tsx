'use client';

import { useState } from 'react';
import { MediaPicker, MediaListPicker } from '@/components/admin/MediaPicker';
import type { AdminCollection } from '@/types/admin-content';

type Draft = {
  title: string; slug: string; subtitle: string; story: string; bannerUrl: string;
  lookbookUrls: string[]; themeColor: string; accentColor: string; season: string; badge: string;
  sortOrder: string; isActive: boolean; showInMenu: boolean; showOnHome: boolean;
};

const emptyDraft = (): Draft => ({ title: '', slug: '', subtitle: '', story: '', bannerUrl: '',
  lookbookUrls: [], themeColor: '#fff8ee', accentColor: '#d97706', season: '', badge: '',
  sortOrder: '0', isActive: true, showInMenu: true, showOnHome: true });

function toDraft(item: AdminCollection): Draft {
  return { title: item.title, slug: item.slug, subtitle: item.subtitle || '', story: item.story || '',
    bannerUrl: item.bannerUrl, lookbookUrls: item.lookbookUrls,
    themeColor: item.themeColor || '#fff8ee', accentColor: item.accentColor || '#d97706',
    season: item.season || '', badge: item.badge || '', sortOrder: String(item.sortOrder),
    isActive: item.isActive, showInMenu: item.showInMenu, showOnHome: item.showOnHome };
}

export function CollectionManager({ initialCollections }: { initialCollections: AdminCollection[] }) {
  const [collections, setCollections] = useState(initialCollections);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const change = (key: keyof Draft, value: string | boolean | string[]) => setDraft((current) => ({ ...current, [key]: value }));
  const refresh = async () => {
    const response = await fetch('/api/admin/collections', { cache: 'no-store' });
    if (!response.ok) throw new Error('Không tải lại được bộ sưu tập');
    const data = await response.json();
    setCollections(data.collections);
    window.dispatchEvent(new Event('tpetie:collections-updated'));
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const response = await fetch(editingId ? `/api/admin/collections/${editingId}` : '/api/admin/collections', {
        method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, sortOrder: Number(draft.sortOrder) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không lưu được bộ sưu tập');
      await refresh();
      setEditingId(null); setDraft(emptyDraft()); setMessage('Đã lưu bộ sưu tập. Menu và trang chủ sẽ hiển thị theo cấu hình mới.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };
  const remove = async (item: AdminCollection) => {
    if (!window.confirm(`Xóa ${item.title} khỏi website? Nếu có sản phẩm, bộ sưu tập sẽ được lưu trữ để giữ liên kết dữ liệu.`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/collections/${item.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không xóa được bộ sưu tập');
      await refresh();
      if (editingId === item.id) { setEditingId(null); setDraft(emptyDraft()); }
      setMessage(data.archived ? 'Đã lưu trữ bộ sưu tập có sản phẩm.' : 'Đã xóa bộ sưu tập.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-8">
    <header><h1 className="mt-2 text-3xl font-bold font-heading">Bộ sưu tập</h1>
      <p className="mt-1 text-sm text-charcoal-600">Thêm, sắp xếp và chọn nơi hiển thị. Menu khách hàng tự lấy danh sách đang bật.</p>
    </header>
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm text-charcoal-900">{message}</p>}

    <section aria-labelledby="collection-list-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 id="collection-list-heading" className="text-xl font-bold">Danh sách ({collections.length})</h2>
        <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft()); }}
          className="min-h-11 rounded-xl bg-honey-600 px-4 text-sm font-bold text-white">Thêm bộ sưu tập</button></div>
      {collections.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-4">
        <div className="flex items-center gap-3 min-w-0">{item.bannerUrl && <img src={item.bannerUrl} alt="" className="size-14 rounded-xl object-cover bg-cream-100" />}
          <div><h3 className="font-bold text-charcoal-900">{item.title}</h3>
            <p className="text-xs text-charcoal-600">/{item.slug} · {item.productCount} sản phẩm · Thứ tự {item.sortOrder}</p>
            <p className="text-xs text-charcoal-600">{item.isActive ? 'Đang bán' : 'Lưu trữ'} · Menu: {item.isActive && item.showInMenu ? 'Có' : 'Không'} · Trang chủ: {item.isActive && item.showOnHome ? 'Có' : 'Không'}</p>
          </div></div>
        <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => { setEditingId(item.id); setDraft(toDraft(item)); document.getElementById('collection-editor')?.scrollIntoView(); }}
          className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">Sửa</button>
          {item.isActive && <button type="button" disabled={busy} onClick={() => void remove(item)} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-red-700">Xóa</button>}
        </div>
      </article>)}
      {collections.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-sm text-charcoal-600">Chưa có bộ sưu tập.</p>}
    </section>

    <form id="collection-editor" onSubmit={save} className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-6 space-y-5">
      <h2 className="text-xl font-bold">{editingId ? 'Sửa bộ sưu tập' : 'Tạo bộ sưu tập'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Tên bộ sưu tập<input required minLength={2} maxLength={100} value={draft.title} onChange={(e) => change('title', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
        <label className="text-sm font-semibold">Slug URL<input required readOnly={!!editingId} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={(e) => change('slug', e.target.value)} className="mt-1 block w-full rounded-xl border p-3 read-only:bg-cream-100" /></label>
        <div className="sm:col-span-2">
          <MediaPicker label="Ảnh banner" value={draft.bannerUrl} altText={draft.title} onError={setMessage}
            onChange={(bannerUrl) => change('bannerUrl', bannerUrl)} />
        </div>
        <label className="text-sm font-semibold">Phụ đề<input maxLength={200} value={draft.subtitle} onChange={(e) => change('subtitle', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
        <label className="text-sm font-semibold">Mùa / chủ đề<input maxLength={100} value={draft.season} onChange={(e) => change('season', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
        <label className="text-sm font-semibold">Nhãn<input maxLength={80} value={draft.badge} onChange={(e) => change('badge', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
        <label className="text-sm font-semibold">Thứ tự hiển thị<input type="number" min="0" max="999" value={draft.sortOrder} onChange={(e) => change('sortOrder', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Câu chuyện<textarea maxLength={5000} rows={4} value={draft.story} onChange={(e) => change('story', e.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>
        <div className="sm:col-span-2">
          <MediaListPicker label="Ảnh lookbook" values={draft.lookbookUrls} onError={setMessage}
            onChange={(lookbookUrls) => change('lookbookUrls', lookbookUrls)} />
        </div>
        <label className="text-sm font-semibold">Màu nền<input type="color" value={draft.themeColor} onChange={(e) => change('themeColor', e.target.value)} className="mt-1 block h-11 w-full rounded-xl border p-1" /></label>
        <label className="text-sm font-semibold">Màu nhấn<input type="color" value={draft.accentColor} onChange={(e) => change('accentColor', e.target.value)} className="mt-1 block h-11 w-full rounded-xl border p-1" /></label>
      </div>
      <div className="flex flex-wrap gap-5 text-sm font-semibold">
        {(['isActive', 'showInMenu', 'showOnHome'] as const).map((key) => <label key={key} className="flex items-center gap-2 min-h-11">
          <input type="checkbox" checked={draft[key]} onChange={(e) => change(key, e.target.checked)} className="size-5" />
          {{ isActive: 'Đang hoạt động', showInMenu: 'Hiện ở menu', showOnHome: 'Hiện ở trang chủ' }[key]}
        </label>)}
      </div>
      <button disabled={busy || !draft.bannerUrl} className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu bộ sưu tập'}</button>
      {!draft.bannerUrl && <p className="text-xs text-charcoal-500">Cần tải lên ảnh banner trước khi lưu.</p>}
    </form>
  </div>;
}
