'use client';

import { useState } from 'react';
import { DataTable, tableParams, type Column, type TableFilter, type TableQuery } from '@/components/admin/DataTable';
import { readJson } from '@/client/http';
import { markAdminPagesStale } from '@/client/admin-freshness';

type Settings = { shippingFee: number; freeShippingThreshold: number };
type Coupon = {
  id: string; code: string; type: string; value: number; minSubtotal: number; active: boolean;
  requiresLogin: boolean; usedCount: number; usageLimit: number | null;
  startsAt: string | null; expiresAt: string | null;
};
type CouponDraft = {
  code: string; type: string; value: string; minSubtotal: string; active: boolean;
  requiresLogin: boolean; usageLimit: string; startsAt: string; expiresAt: string;
};

const field = 'w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-honey-500';
const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

/** Chuyển mốc ISO thành giá trị cho ô datetime-local. */
const toDateInput = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** Giá trị ô datetime-local (giờ của trình duyệt) thành mốc ISO có múi giờ, để máy chủ chạy UTC không đọc lệch. */
const toIsoDate = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const emptyDraft = (): CouponDraft => ({ code: '', type: 'FIXED', value: '10000', minSubtotal: '0',
  active: true, requiresLogin: false, usageLimit: '', startsAt: '', expiresAt: '' });

const COUPON_SORTS = [
  { value: 'newest', label: 'Mới nhất' }, { value: 'expiring', label: 'Sắp hết hạn' },
  { value: 'usage', label: 'Dùng nhiều nhất' }, { value: 'code', label: 'Mã A–Z' },
];
const COUPON_FILTERS: TableFilter[] = [
  { key: 'filter', label: 'Trạng thái', options: [{ value: 'active', label: 'Đang bật' }, { value: 'inactive', label: 'Đã tắt' }] },
  { key: 'validity', label: 'Hiệu lực', options: [
    { value: 'usable', label: 'Đang dùng được' }, { value: 'scheduled', label: 'Chưa đến ngày bắt đầu' },
    { value: 'expired', label: 'Đã hết hạn' }, { value: 'used-up', label: 'Đã hết lượt' }] },
];

async function fetchCoupons(query: TableQuery) {
  const response = await fetch(`/api/admin/coupons?${tableParams(query)}`, { cache: 'no-store' });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Không tải được mã giảm giá');
  // Mã giảm giá dùng chính mã làm khóa dòng cho bảng.
  const items = (data.items as Omit<Coupon, 'id'>[]).map((coupon) => ({ ...coupon, id: coupon.code }));
  return { items, total: data.total as number, page: data.page as number, pages: data.pages as number };
}

export function CommerceManager({ initialSettings }: { initialSettings: Settings | null }) {
  const [settings, setSettings] = useState<Settings>(initialSettings ?? { shippingFee: 0, freeShippingThreshold: 0 });
  const [configured, setConfigured] = useState(initialSettings !== null);
  const [editing, setEditing] = useState<{ mode: 'create' } | { mode: 'edit'; code: string; draft: CouponDraft } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const saveSettings = async () => {
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/commerce', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'settings', ...settings }) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Không lưu được cấu hình');
      setMessage('Đã lưu phí giao hàng.');
      setConfigured(true);
      // Quay lại trang này sau khi sang trang khác sẽ được làm mới để thấy đúng giá trị mới (không làm mới ngay
      // vì sẽ dựng lại trang và mất thông báo vừa lưu).
      markAdminPagesStale();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  const saveCoupon = async (draft: CouponDraft, isNew: boolean) => {
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/coupons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: isNew ? 'create' : 'update', code: draft.code, type: draft.type, value: Number(draft.value),
          minSubtotal: Number(draft.minSubtotal), active: draft.active, requiresLogin: draft.requiresLogin,
          usageLimit: draft.usageLimit === '' ? null : Number(draft.usageLimit),
          startsAt: toIsoDate(draft.startsAt), expiresAt: toIsoDate(draft.expiresAt) }) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Không lưu được mã giảm giá');
      setMessage(isNew ? `Đã thêm mã ${draft.code}.` : `Đã lưu mã ${draft.code}.`);
      setEditing(null);
      setReloadKey((key) => key + 1);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  const removeCoupon = async (code: string) => {
    if (!window.confirm(`Xóa mã ${code}? Nếu mã đã được dùng cho đơn hàng, mã sẽ chuyển sang ngừng hoạt động để giữ lịch sử đơn.`)) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch(`/api/admin/coupons?code=${encodeURIComponent(code)}`, { method: 'DELETE' });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || 'Không xóa được mã giảm giá');
      setMessage(data.archived ? 'Mã đã được dùng cho đơn hàng nên chuyển sang ngừng hoạt động.' : 'Đã xóa mã giảm giá.');
      setEditing(null);
      setReloadKey((key) => key + 1);
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  };

  const columns: Column<Coupon>[] = [
    { key: 'code', header: 'Mã', render: (row) => <span className="font-bold text-charcoal-900">{row.code}</span> },
    { key: 'value', header: 'Mức giảm', render: (row) => row.type === 'PERCENT' ? `${row.value}%` : formatPrice(row.value) },
    { key: 'min', header: 'Đơn tối thiểu', render: (row) => formatPrice(row.minSubtotal) },
    { key: 'usage', header: 'Lượt dùng', render: (row) => `${row.usedCount}${row.usageLimit === null ? '' : `/${row.usageLimit}`}` },
    { key: 'window', header: 'Hiệu lực', render: (row) => <span className="text-xs text-charcoal-600">
        {row.startsAt ? new Date(row.startsAt).toLocaleDateString('vi-VN') : 'Không giới hạn'}
        {row.expiresAt ? ` → ${new Date(row.expiresAt).toLocaleDateString('vi-VN')}` : ''}
      </span> },
    { key: 'status', header: 'Trạng thái', render: (row) => <div className="flex flex-wrap gap-1">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${row.active ? 'bg-sage-100 text-sage-800' : 'bg-cream-200 text-charcoal-600'}`}>
          {row.active ? 'Đang bật' : 'Đã tắt'}</span>
        {row.requiresLogin && <span className="rounded-full bg-honey-100 px-2.5 py-0.5 text-[11px] font-bold text-honey-800">Cần đăng nhập</span>}
      </div> },
  ];

  return <div className="space-y-6">
    {message && <p role="status" className="rounded-xl bg-cream-100 p-3 text-sm">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <section className="rounded-2xl border border-cream-200 bg-white p-5">
      <h2 className="text-lg font-bold">Phí giao hàng</h2>
      {!configured && <p role="alert" className="mt-3 rounded-xl bg-honey-100 p-3 text-sm text-honey-800">
        Chưa có cấu hình phí giao hàng: khách chưa đặt hàng được cho tới khi bạn nhập và lưu phí giao hàng.</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Phí giao hàng (đ)
          <input type="number" min="0" max="1000000" className={`${field} mt-2`} value={settings.shippingFee}
            onChange={(event) => setSettings({ ...settings, shippingFee: Number(event.target.value) })} /></label>
        <label className="text-sm font-semibold">Miễn phí từ đơn (đ)
          <input type="number" min="0" max="100000000" className={`${field} mt-2`} value={settings.freeShippingThreshold}
            onChange={(event) => setSettings({ ...settings, freeShippingThreshold: Number(event.target.value) })} /></label>
      </div>
      <button type="button" disabled={busy} onClick={() => void saveSettings()}
        className="mt-4 min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white disabled:opacity-50">Lưu phí giao hàng</button>
    </section>

    <section className="space-y-4">
      <h2 className="text-lg font-bold">Mã giảm giá</h2>
      <DataTable columns={columns} fetchPage={fetchCoupons} reloadKey={reloadKey}
        searchPlaceholder="Tìm theo mã"
        sorts={COUPON_SORTS} filters={COUPON_FILTERS}
        emptyText="Chưa có mã giảm giá nào."
        onRowClick={(row) => setEditing({ mode: 'edit', code: row.code, draft: {
          code: row.code, type: row.type, value: String(row.value), minSubtotal: String(row.minSubtotal),
          active: row.active, requiresLogin: row.requiresLogin,
          usageLimit: row.usageLimit === null ? '' : String(row.usageLimit),
          startsAt: toDateInput(row.startsAt), expiresAt: toDateInput(row.expiresAt) } })}
        toolbar={<button type="button" onClick={() => setEditing({ mode: 'create' })}
          className="min-h-11 rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">Thêm mã giảm giá</button>} />
    </section>

    {editing && <CouponForm
      draft={editing.mode === 'edit' ? editing.draft : emptyDraft()}
      isNew={editing.mode === 'create'}
      busy={busy}
      onCancel={() => setEditing(null)}
      onSave={(draft) => void saveCoupon(draft, editing.mode === 'create')}
      onDelete={editing.mode === 'edit' ? () => void removeCoupon(editing.code) : undefined} />}
  </div>;
}

/** Form thêm mới hoặc chỉnh sửa một mã giảm giá. */
function CouponForm({ draft: initial, isNew, busy, onSave, onCancel, onDelete }: {
  draft: CouponDraft; isNew: boolean; busy: boolean;
  onSave: (draft: CouponDraft) => void; onCancel: () => void; onDelete?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  return <div className="fixed inset-0 z-40 flex justify-end">
    <button type="button" aria-label="Đóng" onClick={onCancel} className="flex-1 bg-charcoal-900/30" />
    <aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-2xl">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{isNew ? 'Thêm mã giảm giá' : `Sửa mã ${initial.code}`}</h2>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-cream-300 px-4 text-sm font-semibold">Đóng</button>
      </header>
      <div className="space-y-3">
        <label className="text-sm font-semibold">Mã
          <input className={`${field} mt-1`} maxLength={30} readOnly={!isNew} value={draft.code}
            onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} /></label>
        <label className="text-sm font-semibold">Loại
          <select className={`${field} mt-1`} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
            <option value="FIXED">Giảm tiền</option><option value="PERCENT">Giảm %</option>
          </select></label>
        <label className="text-sm font-semibold">Giá trị
          <input className={`${field} mt-1`} type="number" min="1" value={draft.value}
            onChange={(event) => setDraft({ ...draft, value: event.target.value })} /></label>
        <label className="text-sm font-semibold">Đơn tối thiểu (đ)
          <input className={`${field} mt-1`} type="number" min="0" value={draft.minSubtotal}
            onChange={(event) => setDraft({ ...draft, minSubtotal: event.target.value })} /></label>
        <label className="text-sm font-semibold">Giới hạn lượt dùng (bỏ trống nếu không giới hạn)
          <input className={`${field} mt-1`} type="number" min="1" value={draft.usageLimit}
            onChange={(event) => setDraft({ ...draft, usageLimit: event.target.value })} /></label>
        <label className="text-sm font-semibold">Bắt đầu hiệu lực
          <input type="datetime-local" className={`${field} mt-1`} value={draft.startsAt}
            onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></label>
        <label className="text-sm font-semibold">Hết hạn
          <input type="datetime-local" className={`${field} mt-1`} value={draft.expiresAt}
            onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })} /></label>
        <div className="space-y-1 text-sm font-semibold">
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" className="size-5" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Đang bật
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" className="size-5" checked={draft.requiresLogin} onChange={(event) => setDraft({ ...draft, requiresLogin: event.target.checked })} /> Chỉ áp dụng khi đã đăng nhập
          </label>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={busy || !draft.code} onClick={() => onSave(draft)}
          className="min-h-11 rounded-xl bg-sage-700 px-6 text-sm font-bold text-white disabled:opacity-50">
          {busy ? 'Đang lưu…' : isNew ? 'Thêm mã' : 'Lưu mã'}
        </button>
        {onDelete && <button type="button" disabled={busy} onClick={onDelete}
          className="min-h-11 rounded-xl px-5 text-sm font-semibold text-red-700 disabled:opacity-50">Xóa mã</button>}
      </div>
    </aside>
  </div>;
}
