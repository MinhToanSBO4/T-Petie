import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getProducts, getProductBySlug, getRelatedProducts } from '@/server/catalog/queries';
import { toProductCard, type Product } from '@/types/product';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { siteUrl } from '@/lib/site-url';

export const revalidate = 60;

/**
 * Dựng sẵn các trang sản phẩm phổ biến lúc build để khách không gặp độ trễ truy vấn
 * ở lần truy cập đầu tiên. Sản phẩm mới vẫn được dựng theo yêu cầu nhờ ISR.
 */
export async function generateStaticParams() {
  const products = await getProducts();
  return products.slice(0, 100).map((product) => ({ slug: product.slug }));
}

/** Ảnh chia sẻ cỡ 1200px thay vì ảnh gốc vài MB. */
const shareImage = (product: Product) => product.thumbnail ? cloudinaryImage(product.thumbnail, { width: 1200 }) : undefined;

/** Tiêu đề, mô tả, canonical và ảnh chia sẻ riêng cho từng sản phẩm, đọc từ cùng cache với trang (không thêm truy vấn). */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Không tìm thấy sản phẩm | T'Petie", robots: { index: false } };
  const description = product.description.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined;
  const title = `${product.name} | T'Petie`;
  const image = shareImage(product);
  return { title, description,
    // Một sản phẩm chỉ một địa chỉ chuẩn: liên kết cũ theo mã/SKU được chuyển về slug.
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description, type: 'website', url: `/products/${product.slug}`, images: image ? [image] : undefined } };
}

/** Dữ liệu có cấu trúc Product/Offer để Google hiện giá, tình trạng còn hàng và số sao ngay trong kết quả tìm kiếm. */
function productJsonLd(product: Product) {
  const prices = product.sizes.map((size) => size.price).filter((price) => price > 0);
  const inStock = product.sizes.some((size) => size.stock > 0);
  const url = `${siteUrl()}/products/${product.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.description.replace(/\s+/g, ' ').trim().slice(0, 5000) || undefined,
    image: product.images.slice(0, 5).map((image) => cloudinaryImage(image, { width: 1200 })),
    brand: { '@type': 'Brand', name: "T'Petie" },
    ...(product.colorName ? { color: product.colorName } : {}),
    ...(product.material ? { material: product.material } : {}),
    offers: {
      '@type': 'AggregateOffer',
      url,
      priceCurrency: 'VND',
      lowPrice: prices.length ? Math.min(...prices) : product.basePrice,
      highPrice: prices.length ? Math.max(...prices) : product.basePrice,
      offerCount: product.sizes.length || 1,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.reviewCount > 0 && product.rating > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  if (decodeURIComponent(params.slug) !== product.slug) permanentRedirect(`/products/${product.slug}`);
  const relatedProducts = await getRelatedProducts(product.id, product.collectionId || null, 4);
  return <>
    <script type="application/ld+json"
      // JSON đã escape "<" để chuỗi trong mô tả không đóng được thẻ script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)).replace(/</g, '\\u003c') }} />
    <ProductDetailClient product={product} relatedProducts={relatedProducts.map(toProductCard)} />
  </>;
}
