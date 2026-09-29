export default function AdminLoading() {
  return <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-pulse" role="status" aria-label="Đang tải trang quản trị">
    <div className="h-9 w-64 rounded-xl bg-cream-200" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-2xl bg-cream-200" />)}</div>
    <div className="h-72 rounded-2xl bg-cream-100" />
  </main>;
}
