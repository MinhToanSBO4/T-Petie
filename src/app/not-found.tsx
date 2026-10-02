import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Home, PackageSearch, Sparkles } from 'lucide-react';
import { ErrorScreen, SupportContacts, errorButtonClass } from '@/components/error/ErrorScreen';
import { ProductCard } from '@/components/product/ProductCard';
import { getProducts } from '@/server/catalog/queries';
import { getSiteContent } from '@/server/content/site-content';
import type { Product } from '@/types/product';

export const metadata: Metadata = { title: "Không tìm thấy trang | T'Petie" };

/**
 * Trang 404 của khách (đường dẫn sai, sản phẩm hoặc bộ sưu tập đã ẩn): xin lỗi nhẹ nhàng, đưa lối đi tiếp, kênh liên hệ
 * và vài thiết kế còn hàng để mẹ xem tiếp thay vì rời trang.
 */
export default async function NotFound() {
  // Liên hệ và gợi ý chỉ là phần phụ (đều đọc từ cache): đọc lỗi thì bỏ qua, không để trang 404 biến thành trang lỗi.
  const [content, products] = await Promise.all([getSiteContent().catch(() => null), getProducts().catch((): Product[] => [])]);
  const inStock = products.filter((product) => product.sizes.some((size) => size.stock > 0));
  const suggestions = [...inStock.filter((product) => product.isNewArrival), ...inStock.filter((product) => !product.isNewArrival)].slice(0, 4);
  const browse = products.some((product) => product.isNewArrival)
    ? { href: '/girls?new=1', label: 'Xem hàng mới về' } : { href: '/girls', label: 'Xem sản phẩm' };

  return <>
    <ErrorScreen illustration="dress" code={404} title="Ôi, trang này không còn ở đây"
      actions={<>
        <Link href="/" className={errorButtonClass('primary')}><Home className="size-4" aria-hidden />Về trang chủ</Link>
        <Link href={browse.href} className={errorButtonClass('secondary')}><Sparkles className="size-4" aria-hidden />{browse.label}</Link>
        <Link href="/order-lookup" className={errorButtonClass('secondary')}><PackageSearch className="size-4" aria-hidden />Tra cứu đơn hàng</Link>
      </>}
      footer={<SupportContacts contact={content?.contact_info} />}>
      Có thể đường dẫn đã cũ, hoặc món đồ này vừa được cất khỏi kệ. Mẹ đừng lo nhé, còn nhiều thiết kế xinh xắn khác đang chờ bé.
    </ErrorScreen>

    {suggestions.length > 0 && <section aria-labelledby="suggestions-title" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 id="suggestions-title" className="font-heading text-lg font-bold text-charcoal-900 sm:text-2xl">Có thể mẹ sẽ thích</h2>
        <Link href="/girls" className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-bold text-honey-700 hover:text-honey-800">
          Xem tất cả<ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {suggestions.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>}
  </>;
}
