export function ProductGridSkeleton() {
  return <div aria-label="Đang tải sản phẩm" role="status" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
    {Array.from({ length: 8 }, (_, index) => <div key={index} className="rounded-2xl overflow-hidden border border-cream-200 bg-white">
      <div className="aspect-[3/4] bg-cream-200" />
      <div className="p-3 space-y-2"><div className="h-4 rounded bg-cream-200 w-4/5" /><div className="h-3 rounded bg-cream-100 w-2/3" /><div className="h-4 rounded bg-cream-200 w-1/2" /></div>
    </div>)}
    <span className="sr-only">Đang tải sản phẩm…</span>
  </div>;
}
