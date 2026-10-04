import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ScrollRail } from '@/components/layout/ScrollRail';
import { ProductCard } from '@/components/product/ProductCard';
import type { ProductCardData } from '@/types/product';

/**
 * Bề rộng một thẻ: điện thoại 2 thẻ và một phần thẻ thứ ba, máy tính bảng 3 thẻ và một phần thẻ kế, máy tính đủ 4 thẻ.
 * `grid` để thẻ cao bằng nhau, nút "Thêm nhanh" thẳng hàng.
 */
const SLIDE = 'grid w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[calc((100%-3rem)/4)]';

/** Khối sản phẩm của trang chủ: một hàng lướt ngang; cuối hàng là ô mở trang xem tiếp khi khối có liên kết. */
export function ProductRail({ label, heading, action, products, more }: {
  label: string; heading: React.ReactNode; action?: React.ReactNode; products: ProductCardData[];
  more?: { label: string; href: string };
}) {
  return <ScrollRail label={label} heading={heading} action={action}>
    {products.map((product) => <li key={product.id} className={SLIDE}><ProductCard product={product} /></li>)}
    {more && <li className={SLIDE}>
      <Link href={more.href} className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-honey-300 bg-honey-50 p-4 text-center transition-colors hover:bg-honey-100 sm:rounded-3xl">
        <span className="grid size-12 place-items-center rounded-full bg-white text-honey-700 shadow-sm"><ArrowRight className="size-5" aria-hidden /></span>
        <span className="text-sm font-bold text-honey-800">{more.label}</span>
      </Link>
    </li>}
  </ScrollRail>;
}
