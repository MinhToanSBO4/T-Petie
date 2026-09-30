/** Khung chờ khi chuyển trang quản trị; dùng hiệu ứng shimmer giống giao diện khách. */
export default function AdminLoading() {
  return <div className="space-y-6" role="status" aria-label="Đang tải trang quản trị">
    <div className="shimmer h-9 w-56 rounded-xl" />
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => <div key={item} className="shimmer h-28 rounded-2xl" />)}
    </div>
    <div className="shimmer h-72 rounded-2xl" />
  </div>;
}
