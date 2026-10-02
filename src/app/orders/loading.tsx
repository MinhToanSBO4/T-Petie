export default function OrdersLoading() {
  return <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-5 animate-fade-in sm:px-6" role="status" aria-label="Đang tải đơn mua">
    <div className="flex items-center gap-3">
      <div className="size-12 rounded-2xl shimmer" />
      <div className="space-y-2"><div className="h-7 w-40 rounded-xl shimmer" /><div className="h-4 w-64 rounded-lg shimmer" /></div>
    </div>
    <div className="flex gap-2">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-10 w-28 rounded-full shimmer" />)}</div>
    {Array.from({ length: 2 }, (_, index) => <div key={index} className="space-y-3 rounded-3xl border border-cream-200 bg-white p-5">
      <div className="h-5 w-1/2 rounded-lg shimmer" />
      <div className="flex gap-3"><div className="size-20 rounded-xl shimmer" /><div className="flex-1 space-y-2"><div className="h-4 w-3/4 rounded shimmer" /><div className="h-4 w-1/3 rounded shimmer" /></div></div>
      <div className="h-10 rounded-2xl shimmer" />
    </div>)}
  </div>;
}
