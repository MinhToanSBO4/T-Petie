import Link from 'next/link';
import { Package, PackageSearch } from 'lucide-react';
import { ErrorScreen, SupportContacts, errorButtonClass } from '@/components/error/ErrorScreen';
import { getSiteContent } from '@/server/content/site-content';

/** Mã đơn không tồn tại hoặc thuộc tài khoản khác: không tiết lộ đơn đó có tồn tại hay không. */
export default async function OrderNotFound() {
  const contact = (await getSiteContent().catch(() => null))?.contact_info;
  return <ErrorScreen illustration="parcel" title="Không tìm thấy đơn hàng"
    actions={<>
      <Link href="/orders" className={errorButtonClass('primary')}><Package className="size-4" aria-hidden />Về Đơn mua</Link>
      <Link href="/order-lookup" className={errorButtonClass('secondary')}><PackageSearch className="size-4" aria-hidden />Tra cứu bằng mã đơn</Link>
    </>}
    footer={<SupportContacts contact={contact} />}>
    Đơn này không có trong tài khoản của mẹ. Nếu mẹ đặt hàng khi chưa đăng nhập, mẹ tra cứu bằng mã đơn và số điện thoại nhé.
  </ErrorScreen>;
}
