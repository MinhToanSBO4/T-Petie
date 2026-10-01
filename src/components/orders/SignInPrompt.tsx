import Link from 'next/link';
import { PackageSearch } from 'lucide-react';

/** Khách chưa đăng nhập mở trang Đơn mua: mời đăng nhập, hoặc tra cứu đơn bằng mã đơn và số điện thoại. */
export function SignInPrompt({ callbackUrl }: { callbackUrl: string }) {
  return <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
    <span className="grid size-16 place-items-center rounded-3xl bg-sage-100 text-sage-700"><PackageSearch className="size-8" aria-hidden /></span>
    <h1 className="mt-4 font-heading text-xl font-bold text-charcoal-900">Đăng nhập để xem đơn mua</h1>
    <p className="mt-2 text-sm text-charcoal-600">Theo dõi đơn đang giao, xác nhận đã nhận hàng và đánh giá sản phẩm mẹ đã mua.</p>
    <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
      <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-honey-500 px-5 text-sm font-bold text-white shadow-md hover:bg-honey-600">Đăng nhập</Link>
      <Link href="/order-lookup" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-cream-300 bg-white px-5 text-sm font-bold text-charcoal-700 hover:bg-cream-50">
        Tra cứu bằng mã đơn</Link>
    </div>
    <p className="mt-4 text-xs text-charcoal-500">Đơn đặt khi chưa đăng nhập được tra cứu bằng mã đơn và số điện thoại.</p>
  </div>;
}
