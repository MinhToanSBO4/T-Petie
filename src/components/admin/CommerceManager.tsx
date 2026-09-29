'use client';

import Link from 'next/link';
import { useState } from 'react';

type Settings = { shippingFee: number; freeShippingThreshold: number };
type Coupon = { code: string; type: string; value: number; minSubtotal: number; active: boolean; requiresLogin: boolean; usedCount: number; usageLimit: number | null };
const field = 'w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-honey-500';

export function CommerceManager({ initialSettings, initialCoupons }: { initialSettings: Settings; initialCoupons: Coupon[] }) {
  const [settings, setSettings] = useState(initialSettings);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [draft, setDraft] = useState<Coupon>({ code: '', type: 'FIXED', value: 10000, minSubtotal: 0, active: true, requiresLogin: false, usedCount: 0, usageLimit: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function save(body: object) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/commerce', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không lưu được cấu hình');
      const refreshed = await fetch('/api/admin/commerce', { cache: 'no-store' });
      const current = await refreshed.json();
      if (!refreshed.ok) throw new Error(current.error || 'Không tải lại được dữ liệu');
      setSettings(current.settings); setCoupons(current.coupons);
      setMessage('Đã lưu vào cơ sở dữ liệu.');
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra'); return false; }
    finally { setBusy(false); }
  }

  function changeCoupon(code: string, patch: Partial<Coupon>) {
    setCoupons((items) => items.map((item) => item.code === code ? { ...item, ...patch } : item));
  }

  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <div><Link href="/admin" className="text-xs font-semibold text-honey-600">← Tổng quan</Link>
      <h1 className="mt-2 font-heading text-3xl font-bold">Cấu hình bán hàng</h1>
      <p className="mt-1 text-sm text-charcoal-500">Phí giao hàng và mã giảm giá được dùng trực tiếp khi tính đơn và checkout.</p></div>
    {message && <p role="status" className="rounded-xl bg-cream-100 px-4 py-3 text-sm">{message}</p>}
    <section className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold">Giao hàng</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Phí giao hàng (đ)
          <input type="number" min="0" max="1000000" className={`${field} mt-2`} value={settings.shippingFee}
            onChange={(event) => setSettings({ ...settings, shippingFee: Number(event.target.value) })} /></label>
        <label className="text-sm font-semibold">Miễn phí từ đơn (đ)
          <input type="number" min="0" max="100000000" className={`${field} mt-2`} value={settings.freeShippingThreshold}
            onChange={(event) => setSettings({ ...settings, freeShippingThreshold: Number(event.target.value) })} /></label>
      </div>
      <button disabled={busy} onClick={() => void save({ kind: 'settings', ...settings })} className="mt-4 rounded-xl bg-honey-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Lưu phí giao hàng</button>
    </section>
    <section className="space-y-4 rounded-2xl border border-cream-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold">Mã giảm giá</h2>
      {coupons.map((coupon) => <div key={coupon.code} className="grid gap-3 border-t border-cream-100 pt-4 sm:grid-cols-6 sm:items-end">
        <div className="text-sm font-bold">{coupon.code}<p className="text-xs font-normal text-charcoal-500">Đã dùng: {coupon.usedCount}{coupon.usageLimit === null ? '' : `/${coupon.usageLimit}`}</p></div>
        <label className="text-xs">Loại<select className={field} value={coupon.type} onChange={(event) => changeCoupon(coupon.code, { type: event.target.value })}><option value="FIXED">Giảm tiền</option><option value="PERCENT">Giảm %</option></select></label>
        <label className="text-xs">Giá trị<input className={field} type="number" min="1" value={coupon.value} onChange={(event) => changeCoupon(coupon.code, { value: Number(event.target.value) })} /></label>
        <label className="text-xs">Đơn tối thiểu<input className={field} type="number" min="0" value={coupon.minSubtotal} onChange={(event) => changeCoupon(coupon.code, { minSubtotal: Number(event.target.value) })} /></label>
        <div className="space-y-1 text-xs"><label className="block"><input type="checkbox" checked={coupon.active} onChange={(event) => changeCoupon(coupon.code, { active: event.target.checked })} /> Đang bật</label>
          <label className="block"><input type="checkbox" checked={coupon.requiresLogin} onChange={(event) => changeCoupon(coupon.code, { requiresLogin: event.target.checked })} /> Cần đăng nhập</label></div>
        <button disabled={busy} onClick={() => void save({ kind: 'coupon', ...coupon })} className="rounded-xl border border-honey-500 px-4 py-2 text-sm font-bold text-honey-700 disabled:opacity-50">Lưu mã</button>
      </div>)}
      <div className="grid gap-3 border-t border-cream-100 pt-4 sm:grid-cols-6 sm:items-end">
        <label className="text-xs">Mã mới<input className={field} value={draft.code} maxLength={30} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} /></label>
        <label className="text-xs">Loại<select className={field} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="FIXED">Giảm tiền</option><option value="PERCENT">Giảm %</option></select></label>
        <label className="text-xs">Giá trị<input className={field} type="number" min="1" value={draft.value} onChange={(event) => setDraft({ ...draft, value: Number(event.target.value) })} /></label>
        <label className="text-xs">Đơn tối thiểu<input className={field} type="number" min="0" value={draft.minSubtotal} onChange={(event) => setDraft({ ...draft, minSubtotal: Number(event.target.value) })} /></label>
        <label className="text-xs"><input type="checkbox" checked={draft.requiresLogin} onChange={(event) => setDraft({ ...draft, requiresLogin: event.target.checked })} /> Cần đăng nhập</label>
        <button disabled={busy || !draft.code} onClick={() => void save({ kind: 'coupon', ...draft }).then((ok) => { if (ok) setDraft({ ...draft, code: '' }); })} className="rounded-xl bg-charcoal-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Thêm mã</button>
      </div>
    </section>
  </div>;
}
