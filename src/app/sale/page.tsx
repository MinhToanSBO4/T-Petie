import Image from 'next/image';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ProductGrid } from '@/components/product/ProductGrid';
import { getProducts } from '@/server/catalog/queries';
import { getSiteContent } from '@/server/content/site-content';

export const revalidate = 60;

export default async function SalePage() {
  const [products, content] = await Promise.all([getProducts(), getSiteContent()]);
  const banner = content.sale_page;
  const saleProducts = products.filter((product) => product.isSale);
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-8">
    <Breadcrumb items={[{ label: 'Ưu đãi', href: '/sale' }]} />
    {banner?.bannerUrl && <div className="relative aspect-[3168/1344] rounded-3xl overflow-hidden bg-cream-100">
      <Image src={banner.bannerUrl} alt={banner.bannerAlt || banner.title} fill
        sizes="100vw" className="object-contain" priority />
    </div>}
    <div>{banner?.title && <h1 className="text-2xl sm:text-3xl font-bold font-heading">{banner.title}</h1>}
      {banner?.description && <p className="text-sm text-charcoal-500 mt-2">{banner.description}</p>}</div>
    <ProductGrid products={saleProducts} />
    {saleProducts.length === 0 && <p className="text-sm">Chưa có chương trình ưu đãi đang áp dụng.</p>}
  </div>;
}
