import Image from 'next/image';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ProductGrid } from '@/components/product/ProductGrid';
import { getProducts } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function SalePage() {
  const products = (await getProducts()).filter((product) => product.isSale);
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-8">
    <Breadcrumb items={[{ label: 'Ưu đãi', href: '/sale' }]} />
    <div className="relative aspect-[3168/1344] rounded-3xl overflow-hidden bg-cream-100">
      <Image src="https://i.ibb.co/r2z85170/banner-uu-dai-png.png" alt="Ưu đãi T'Petie" fill
        sizes="100vw" className="object-contain" priority />
    </div>
    <div><h1 className="text-2xl sm:text-3xl font-bold font-heading">Ưu đãi cho bé yêu</h1>
      <p className="text-sm text-charcoal-500 mt-2">Giá và số lượng được cập nhật từ cửa hàng.</p></div>
    <ProductGrid products={products} />
    {products.length === 0 && <p className="text-sm">Chưa có chương trình ưu đãi đang áp dụng.</p>}
  </div>;
}
