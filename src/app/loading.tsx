import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';

export default function Loading() {
  return <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8" role="status" aria-label="Đang tải trang">
    <div className="animate-pulse space-y-4"><div className="h-7 w-48 rounded-lg bg-cream-200" /><div className="h-12 max-w-xl rounded-xl bg-cream-200" /><div className="h-4 max-w-md rounded bg-cream-100" /></div>
    <ProductGridSkeleton />
  </main>;
}
