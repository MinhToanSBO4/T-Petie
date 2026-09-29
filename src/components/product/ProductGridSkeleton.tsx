export function ProductGridSkeleton() {
  return (
    <div aria-label="Đang tải sản phẩm" role="status" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="rounded-3xl overflow-hidden border border-cream-200/80 bg-white shadow-card flex flex-col justify-between">
          <div className="aspect-[3/4] w-full shimmer rounded-t-3xl" />
          <div className="p-4 space-y-2.5">
            <div className="h-3.5 w-1/3 rounded-full shimmer" />
            <div className="h-4 w-5/6 rounded-lg shimmer" />
            <div className="pt-2 flex items-center justify-between">
              <div className="h-5 w-2/5 rounded-lg shimmer" />
              <div className="h-4 w-1/4 rounded-full shimmer" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải sản phẩm…</span>
    </div>
  );
}
