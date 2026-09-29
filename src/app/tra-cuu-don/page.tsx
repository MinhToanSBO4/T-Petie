'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

type OrderResult = { code: string; status: string; createdAt: string; customerName: string;
  city: string; district: string; total: number; items: { name: string; size: string; quantity: number; total: number }[] };

function Lookup() {
  const params = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setOrder(null);
    const response = await fetch(`/api/orders/${encodeURIComponent(code.trim())}?phone=${encodeURIComponent(phone.trim())}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) { setError(result.error || 'Không tìm thấy đơn hàng'); return; }
    setOrder(result.order);
  };
  return <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
    <h1 className="text-3xl font-bold">Tra cứu đơn hàng</h1>
    <form onSubmit={submit} className="bg-white border border-cream-200 rounded-2xl p-5 space-y-3">
      <label className="block text-sm font-semibold">Mã đơn hàng</label>
      <input value={code} onChange={(event) => setCode(event.target.value)} required className="w-full border rounded-xl p-3" placeholder="TP-..." />
      <label className="block text-sm font-semibold">Số điện thoại đặt hàng</label>
      <input value={phone} onChange={(event) => setPhone(event.target.value)} required className="w-full border rounded-xl p-3" placeholder="09..." />
      <button className="min-h-11 px-5 bg-honey-600 text-white rounded-xl font-bold">Tra cứu</button>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </form>
    {order && <article className="bg-white border border-cream-200 rounded-2xl p-5 space-y-3">
      <div className="flex justify-between"><strong>{order.code}</strong><span>{order.status}</span></div>
      <p className="text-sm">{new Date(order.createdAt).toLocaleDateString('vi-VN')} · {order.customerName} · {order.district}, {order.city}</p>
      {order.items.map((item, index) => <div key={index} className="flex justify-between border-t pt-2 text-sm">
        <span>{item.name} · {item.size} ×{item.quantity}</span><span>{item.total.toLocaleString('vi-VN')}₫</span>
      </div>)}
      <p className="font-bold text-right">Tổng: {order.total.toLocaleString('vi-VN')}₫</p>
    </article>}
  </div>;
}

export default function OrderLookupPage() {
  return <Suspense fallback={<p className="p-8">Đang tải...</p>}><Lookup /></Suspense>;
}
