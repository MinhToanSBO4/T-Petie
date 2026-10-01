/**
 * Khung chờ của khu vực quản trị. Mỗi trang có khung riêng dựng theo đúng bố cục thật
 * (cùng khung viền, tiêu đề, tên cột bảng) để khi dữ liệu về chỉ phần shimmer được thay chỗ,
 * bố cục không nhảy. Sửa bố cục một trang thì sửa khung tương ứng ở đây.
 */

const box = 'rounded-2xl border border-cream-200 bg-white';
const control = 'h-11 rounded-xl border border-cream-300 bg-white';

/** Giống hệt lần tải đầu của DataTable: thanh công cụ, bảng có tên cột với dòng shimmer, phân trang. */
function TableSkeleton({ headers, filter = false, action }: { headers: string[]; filter?: boolean; action?: string }) {
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className={`${control} w-64`} />
        {filter && <div className={`${control} w-28`} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className={`${control} w-28`} />
        {action && <div className="flex h-11 items-center rounded-xl bg-honey-600 px-5 text-sm font-bold text-white">{action}</div>}
      </div>
    </div>
    <div className={`overflow-x-auto ${box}`}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-cream-50 text-xs uppercase tracking-wide text-charcoal-600">
          <tr>{headers.map((header, index) => <th key={index} className="px-4 py-3 font-bold">{header}</th>)}</tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((row) => <tr key={row} className="border-t border-cream-100">
            <td colSpan={headers.length} className="px-4 py-3"><div className="shimmer h-6 rounded-lg" /></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="shimmer h-4 w-36 rounded-lg" />
      <div className="flex items-center gap-2">
        <div className={`${control} w-20`} /><div className={`${control} w-20`} />
      </div>
    </div>
  </div>;
}

function DashboardSkeleton() {
  const panel = (key: number | string, className = '', height = 'h-40') => <section key={key} className={`${box} p-5 shadow-card sm:p-6 ${className}`}>
    <div className="shimmer h-5 w-40 rounded-lg" />
    <div className="shimmer mt-2 h-3 w-56 max-w-full rounded-lg" />
    <div className={`shimmer mt-4 rounded-xl ${height}`} />
  </section>;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal-900">Tổng quan</h1>
        <div className="shimmer mt-1 h-4 w-36 rounded-lg" />
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <div className={`${control} w-28`} />
        <div className={`${control} w-full sm:w-72`} />
      </div>
    </header>
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => <div key={item} className={`${box} p-5 shadow-card`}>
        <div className="shimmer h-4 w-32 rounded-lg" />
        <div className="shimmer mt-3 h-8 w-40 max-w-full rounded-lg" />
        <div className="shimmer mt-3 h-3 w-28 rounded-lg" />
      </div>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-3">
      {panel('trend', 'xl:col-span-2', 'h-64')}
      {panel('attention', '', 'h-64')}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">{[1, 2, 3].map((item) => panel(item))}</div>
    {panel('recent', '', 'h-48')}
  </div>;
}

function SettingsSkeleton() {
  return <div className="space-y-6">
    <section className={`${box} p-5`}>
      <h2 className="text-lg font-bold">Phí giao hàng</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[1, 2].map((item) => <div key={item}><div className="shimmer h-4 w-32 rounded-lg" /><div className={`${control} mt-2 h-12`} /></div>)}
      </div>
      <div className="shimmer mt-4 h-11 w-40 rounded-xl" />
    </section>
    <section className="space-y-4">
      <h2 className="text-lg font-bold">Mã giảm giá</h2>
      <TableSkeleton filter action="Thêm mã giảm giá" headers={['Mã', 'Mức giảm', 'Đơn tối thiểu', 'Lượt dùng', 'Hiệu lực', 'Trạng thái']} />
    </section>
  </div>;
}

function ExportsSkeleton() {
  return <div className="space-y-6">
    <header>
      <h1 className="text-3xl font-bold font-heading">Xuất dữ liệu</h1>
      <div className="shimmer mt-2 h-4 max-w-xl rounded-lg" />
    </header>
    <div className="flex h-11 w-44 items-center justify-center rounded-xl bg-honey-600 text-sm font-bold text-white">Tạo file Excel mới</div>
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Lịch sử xuất dữ liệu</h2>
      {[1, 2, 3].map((item) => <div key={item} className={`flex items-center justify-between gap-3 ${box} p-4`}>
        <div className="space-y-2"><div className="shimmer h-4 w-48 rounded-lg" /><div className="shimmer h-3 w-64 max-w-full rounded-lg" /></div>
        <div className="shimmer h-7 w-24 rounded-full" />
      </div>)}
    </section>
  </div>;
}

function ContentSkeleton() {
  return <div className="pb-24">
    <div className="-mx-4 mb-6 border-b border-cream-200 bg-white/95 px-4 py-3 sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold font-heading">Chỉnh sửa nội dung website</h1>
        <div className="flex gap-2"><div className={`${control} w-36`} /><div className="shimmer h-11 w-44 rounded-xl" /></div>
      </div>
    </div>
    <section className="mb-6 rounded-2xl border border-cream-200 bg-cream-50 p-4">
      <h2 className="font-heading text-base font-bold">Thứ tự các khối trang chủ</h2>
      <div className="mt-3 flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="shimmer h-10 w-32 rounded-xl" />)}</div>
    </section>
    <div className="space-y-6">
      <div className="shimmer h-80 rounded-3xl" />
      <div className="shimmer h-56 rounded-3xl" />
    </div>
  </div>;
}

function GenericSkeleton() {
  return <div className="space-y-4">
    <div className="shimmer h-9 w-56 rounded-xl" />
    <div className={`${box} h-72`} />
  </div>;
}

/** Chọn khung chờ theo đường dẫn trang quản trị. */
export function AdminContentSkeleton({ pathname }: { pathname: string }) {
  const path = pathname.replace(/\/+$/, '') || '/admin';
  const content = (() => {
    if (path === '/admin') return <DashboardSkeleton />;
    if (path.startsWith('/admin/orders')) return <div className="space-y-4">
      <h1 className="text-3xl font-bold">Đơn hàng</h1>
      <div className="no-scrollbar flex gap-1 overflow-x-auto">
        {['Chờ xử lý', 'Đã xác nhận', 'Đang chuẩn bị', 'Đang giao', 'Hoàn tất', 'Đã hủy', 'Tất cả'].map((label, index) =>
          <div key={label} className={`flex h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold ${index === 0
            ? 'bg-honey-600 text-white' : 'border border-cream-300 bg-white text-charcoal-700'}`}>{label}</div>)}
      </div>
      <TableSkeleton headers={['', 'Mã đơn', 'Khách hàng', 'Sản phẩm', 'Tổng tiền', 'Trạng thái', '']} />
    </div>;
    if (path.startsWith('/admin/products')) return <TableSkeleton filter headers={['Ảnh', 'Sản phẩm', 'Giá', 'Tồn kho', 'Size', 'Trạng thái', '']} />;
    if (path.startsWith('/admin/collections')) return <TableSkeleton filter action="Thêm bộ sưu tập" headers={['Banner', 'Bộ sưu tập', 'Sản phẩm', 'Thứ tự', 'Hiển thị', '']} />;
    if (path.startsWith('/admin/customers')) return <TableSkeleton headers={['Khách hàng', 'Điện thoại', 'Tỉnh/thành', 'Điểm', 'Tham gia', 'Trạng thái', '']} />;
    if (path.startsWith('/admin/reviews')) return <TableSkeleton filter headers={['Khách hàng', 'Sản phẩm', 'Sao', 'Nội dung', 'Trạng thái', 'Thao tác']} />;
    if (path.startsWith('/admin/feedback')) return <TableSkeleton filter action="Thêm feedback" headers={['Ảnh', 'Chú thích', 'Thứ tự', 'Đồng ý công bố', 'Hiển thị']} />;
    if (path.startsWith('/admin/staff')) return <TableSkeleton action="Thêm nhân viên" headers={['Nhân viên', 'Tên đăng nhập', 'Đăng nhập gần nhất', 'Trạng thái', '']} />;
    if (path.startsWith('/admin/settings')) return <SettingsSkeleton />;
    if (path.startsWith('/admin/exports')) return <ExportsSkeleton />;
    if (path.startsWith('/admin/content')) return <ContentSkeleton />;
    return <GenericSkeleton />;
  })();
  return <div role="status" aria-label="Đang tải trang quản trị">{content}</div>;
}

/**
 * Khung chờ cả khu vực quản trị (header + sidebar + nội dung), dùng khi layout quản trị
 * chưa dựng xong (vào /admin từ trang khách hoặc tải lại trang), cùng bố cục với AdminLayout.
 */
export function AdminShellSkeleton({ pathname }: { pathname: string }) {
  return <div className="admin-theme min-h-screen bg-cream-50">
    <div className="sticky top-0 z-40 h-[61px] border-b border-cream-200 bg-white shadow-sm" />
    <div className="flex w-full items-start gap-3 px-3 py-6 sm:gap-4 sm:px-6 lg:gap-8">
      <div className="w-[4.5rem] shrink-0 space-y-3 sm:w-48 lg:w-60">
        {Array.from({ length: 11 }, (_, item) => <div key={item} className="shimmer h-10 rounded-xl" />)}
      </div>
      <div className="min-w-0 flex-1"><AdminContentSkeleton pathname={pathname} /></div>
    </div>
  </div>;
}
