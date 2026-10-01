import Link from 'next/link';
import { PackageX } from 'lucide-react';

/** Mã đơn không tồn tại hoặc thuộc tài khoản khác: không tiết lộ đơn đó có tồn tại hay không. */
export default function OrderNotFound() {
  return <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
    <span className="grid size-16 place-items-center rounded-3xl bg-cream-100 text-charcoal-500"><PackageX className="size-8" aria-hidden /></span>
    <h1 className="mt-4 font-heading text-xl font-bold text-charcoal-900">Không tìm thấy đơn hàng</h1>
    <p className="mt-2 text-sm text-charcoal-600">Đơn này không có trong tài khoản của mẹ. Mẹ kiểm tra lại mã đơn hoặc xem danh sách Đơn mua nhé.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link href="/orders" className="inline-flex min-h-11 items-center rounded-full bg-honey-500 px-6 text-sm font-bold text-white shadow-md hover:bg-honey-600">Về Đơn mua</Link>
      <Link href="/order-lookup" className="inline-flex min-h-11 items-center rounded-full border border-cream-300 bg-white px-6 text-sm font-bold text-charcoal-700 hover:bg-cream-50">Tra cứu bằng mã đơn</Link>
    </div>
  </div>;
}
