import { MapPin } from 'lucide-react';

export default function StoresPage() {
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-8">
    <section className="mx-auto max-w-2xl rounded-3xl border border-cream-200 bg-white p-8 text-center shadow-card sm:p-12">
      <MapPin className="mx-auto mb-4 h-10 w-10 text-honey-600" aria-hidden="true" />
      <h1 className="font-heading text-2xl font-bold text-charcoal-900 sm:text-3xl">Hệ thống cửa hàng T&apos;Petie</h1>
      <p className="mt-4 text-sm leading-7 text-charcoal-600">Thông tin địa chỉ và giờ mở cửa đang được xác nhận. Vui lòng liên hệ T&apos;Petie qua kênh chính thức trước khi đến cửa hàng.</p>
    </section>
  </div>;
}
