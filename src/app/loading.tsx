import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';

export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 animate-fade-in" role="status" aria-label="Đang tải trang">
      <div className="space-y-4">
        <div className="h-7 w-48 rounded-xl shimmer" />
        <div className="h-12 max-w-xl rounded-2xl shimmer" />
        <div className="h-4 max-w-md rounded-lg shimmer" />
      </div>
      <ProductGridSkeleton />
    </main>
  );
}
