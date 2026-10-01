import ExcelJS from 'exceljs';

/**
 * Dựng file Excel quản trị: mỗi tab là một loại dữ liệu riêng.
 * Hàm thuần (chỉ nhận dữ liệu, không truy vấn database) để kiểm thử được trực tiếp.
 * Không có tab nào chứa mật khẩu, token hay thông tin đăng nhập.
 */

type Money = bigint | number;
type OrderRow = {
  orderCode: string; createdAt: Date; customerName: string; customerPhone: string; customerEmail: string | null;
  shippingAddress: string; ward: string | null; district: string; city: string; orderNote: string | null;
  source: string | null; subtotal: Money; shippingFee: Money; discountAmount: Money; totalAmount: Money;
  couponCode: string | null; paymentMethod: string; paymentStatus: string; orderStatus: string;
  accountLabel: string | null;
  items: { productName: string; sku: string; size: string; quantity: number; unitPrice: Money; totalPrice: Money }[];
};
type CustomerRow = {
  name: string | null; email: string | null; username: string | null; phone: string | null; address: string | null;
  city: string | null; status: string; points: number; babyName: string | null; babyBirthDate: Date | null;
  babyWeight: number | null; babyHeight: number | null; recommendedSize: string | null;
  createdAt: Date; lastLoginAt: Date | null; orderCount: number; completedSpend: number;
};
type StaffRow = { name: string | null; username: string | null; email: string | null; role: string; status: string;
  createdAt: Date; lastLoginAt: Date | null };
type VariantRow = { productName: string; productSku: string; collection: string | null; category: string;
  sku: string; size: string; weightRange: string | null; ageRange: string | null; price: Money; stock: number;
  productActive: boolean; variantActive: boolean; soldQuantity: number };
type CouponRow = { code: string; type: string; value: number; minSubtotal: Money; usedCount: number; usageLimit: number | null;
  startsAt: Date | null; expiresAt: Date | null; requiresLogin: boolean; active: boolean };
type ReviewRow = { productName: string; customerName: string; rating: number; content: string;
  isHidden: boolean; reply: string | null; createdAt: Date };

export type ExportData = {
  orders: OrderRow[]; customers: CustomerRow[]; staff: StaffRow[];
  variants: VariantRow[]; coupons: CouponRow[]; reviews: ReviewRow[];
};

type Column<T> = { header: string; width: number; value: (row: T) => unknown; format?: 'money' | 'date' | 'datetime' };

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
// Excel không lưu múi giờ, nên ghi giờ đồng hồ Việt Nam để file đọc đúng giờ ở mọi máy.
const vnTime = (date: Date | null) => date ? new Date(date.getTime() + VN_OFFSET_MS) : null;
const yesNo = (value: boolean) => value ? 'Có' : 'Không';
const FORMATS = { money: '#,##0', date: 'dd/mm/yyyy', datetime: 'dd/mm/yyyy hh:mm' } as const;
const ROLE_LABELS: Record<string, string> = { admin: 'Quản trị viên', staff: 'Nhân viên' };
const ACCOUNT_STATUS: Record<string, string> = { active: 'Đang hoạt động', blocked: 'Đã khóa' };
// Hệ thống hiện chỉ ghi PENDING (COD chưa thu tiền); giá trị khác, nếu có sau này, được giữ nguyên.
const PAYMENT_STATUS: Record<string, string> = { PENDING: 'Chưa thanh toán', PAID: 'Đã thanh toán' };

function addSheet<T>(workbook: ExcelJS.Workbook, name: string, columns: Column<T>[], rows: T[]) {
  // Cố định dòng tiêu đề và bật bộ lọc để người dùng lọc/sắp xếp ngay trong Excel.
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ header: column.header, width: column.width,
    style: column.format ? { numFmt: FORMATS[column.format] } : undefined }));
  for (const row of rows) {
    sheet.addRow(columns.map((column) => {
      const value = column.value(row);
      return typeof value === 'bigint' ? Number(value) : value ?? '';
    }));
  }
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF263F33' } };
  header.alignment = { vertical: 'middle', wrapText: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return sheet;
}

export function buildExportWorkbook(data: ExportData, orderStatusLabels: Record<string, string>) {
  const status = (value: string) => orderStatusLabels[value] || value;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "T'Petie";

  // Số lần mua tính theo số điện thoại trên toàn bộ đơn trong file.
  const purchases = new Map<string, number>();
  for (const order of data.orders) purchases.set(order.customerPhone, (purchases.get(order.customerPhone) || 0) + 1);

  // Tab đầu giữ nguyên thứ tự cột đã chốt với cửa hàng.
  addSheet<OrderRow>(workbook, 'Đơn hàng', [
    { header: 'Thời gian', width: 18, format: 'datetime', value: (row) => vnTime(row.createdAt) },
    { header: 'Mã đơn', width: 24, value: (row) => row.orderCode },
    { header: 'Tên khách hàng', width: 24, value: (row) => row.customerName },
    { header: 'Số điện thoại', width: 15, value: (row) => row.customerPhone },
    { header: 'Địa chỉ', width: 48, value: (row) => [row.shippingAddress, row.ward, row.district, row.city].filter(Boolean).join(', ') },
    { header: 'Sản phẩm (tên + size + số lượng)', width: 56,
      value: (row) => row.items.map((item) => `${item.productName} / ${item.size} ×${item.quantity}`).join('; ') },
    { header: 'Tổng tiền (VND)', width: 16, format: 'money', value: (row) => row.totalAmount },
    { header: 'Mã giảm giá', width: 14, value: (row) => row.couponCode },
    { header: 'Ghi chú', width: 30, value: (row) => row.orderNote },
    { header: 'Kênh tiếp cận', width: 18, value: (row) => row.source },
    { header: 'Trạng thái đơn', width: 16, value: (row) => status(row.orderStatus) },
    { header: 'Số lần mua', width: 12, value: (row) => purchases.get(row.customerPhone) || 1 },
  ], data.orders);

  addSheet<OrderRow & { item: OrderRow['items'][number] }>(workbook, 'Chi tiết sản phẩm', [
    { header: 'Mã đơn', width: 24, value: (row) => row.orderCode },
    { header: 'Thời gian', width: 18, format: 'datetime', value: (row) => vnTime(row.createdAt) },
    { header: 'Trạng thái đơn', width: 16, value: (row) => status(row.orderStatus) },
    { header: 'Sản phẩm', width: 40, value: (row) => row.item.productName },
    { header: 'SKU', width: 20, value: (row) => row.item.sku },
    { header: 'Size', width: 12, value: (row) => row.item.size },
    { header: 'Số lượng', width: 10, value: (row) => row.item.quantity },
    { header: 'Đơn giá (VND)', width: 15, format: 'money', value: (row) => row.item.unitPrice },
    { header: 'Thành tiền (VND)', width: 16, format: 'money', value: (row) => row.item.totalPrice },
  ], data.orders.flatMap((order) => order.items.map((item) => ({ ...order, item }))));

  addSheet<OrderRow>(workbook, 'Thanh toán & giao hàng', [
    { header: 'Mã đơn', width: 24, value: (row) => row.orderCode },
    { header: 'Tạm tính (VND)', width: 15, format: 'money', value: (row) => row.subtotal },
    { header: 'Phí giao hàng (VND)', width: 17, format: 'money', value: (row) => row.shippingFee },
    { header: 'Giảm giá (VND)', width: 15, format: 'money', value: (row) => row.discountAmount },
    { header: 'Tổng tiền (VND)', width: 16, format: 'money', value: (row) => row.totalAmount },
    { header: 'Phương thức thanh toán', width: 20, value: (row) => row.paymentMethod },
    { header: 'Trạng thái thanh toán', width: 20, value: (row) => PAYMENT_STATUS[row.paymentStatus] || row.paymentStatus },
    { header: 'Email', width: 26, value: (row) => row.customerEmail },
    { header: 'Tỉnh/Thành', width: 16, value: (row) => row.city },
    { header: 'Quận/Huyện', width: 16, value: (row) => row.district },
    { header: 'Phường/Xã', width: 16, value: (row) => row.ward },
    { header: 'Tài khoản đặt hàng', width: 24, value: (row) => row.accountLabel || 'Khách vãng lai' },
  ], data.orders);

  addSheet<CustomerRow>(workbook, 'Khách hàng', [
    { header: 'Họ tên', width: 24, value: (row) => row.name },
    { header: 'Email', width: 28, value: (row) => row.email },
    { header: 'Tên đăng nhập', width: 18, value: (row) => row.username },
    { header: 'Số điện thoại', width: 15, value: (row) => row.phone },
    { header: 'Địa chỉ', width: 36, value: (row) => row.address },
    { header: 'Tỉnh/Thành', width: 16, value: (row) => row.city },
    { header: 'Trạng thái', width: 16, value: (row) => ACCOUNT_STATUS[row.status] || row.status },
    { header: 'Số đơn', width: 10, value: (row) => row.orderCount },
    { header: 'Chi tiêu (đơn hoàn tất, VND)', width: 20, format: 'money', value: (row) => row.completedSpend },
    { header: 'Điểm', width: 8, value: (row) => row.points },
    { header: 'Tên bé', width: 16, value: (row) => row.babyName },
    { header: 'Ngày sinh bé', width: 14, format: 'date', value: (row) => vnTime(row.babyBirthDate) },
    { header: 'Cân nặng bé (kg)', width: 14, value: (row) => row.babyWeight },
    { header: 'Chiều cao bé (cm)', width: 14, value: (row) => row.babyHeight },
    { header: 'Size gợi ý', width: 20, value: (row) => row.recommendedSize },
    { header: 'Ngày đăng ký', width: 18, format: 'datetime', value: (row) => vnTime(row.createdAt) },
    { header: 'Đăng nhập gần nhất', width: 18, format: 'datetime', value: (row) => vnTime(row.lastLoginAt) },
  ], data.customers);

  addSheet<StaffRow>(workbook, 'Nhân sự', [
    { header: 'Họ tên', width: 24, value: (row) => row.name },
    { header: 'Tên đăng nhập', width: 18, value: (row) => row.username },
    { header: 'Email', width: 28, value: (row) => row.email },
    { header: 'Vai trò', width: 16, value: (row) => ROLE_LABELS[row.role] || row.role },
    { header: 'Trạng thái', width: 16, value: (row) => ACCOUNT_STATUS[row.status] || row.status },
    { header: 'Ngày tạo', width: 18, format: 'datetime', value: (row) => vnTime(row.createdAt) },
    { header: 'Đăng nhập gần nhất', width: 18, format: 'datetime', value: (row) => vnTime(row.lastLoginAt) },
  ], data.staff);

  addSheet<VariantRow>(workbook, 'Sản phẩm & tồn kho', [
    { header: 'Sản phẩm', width: 40, value: (row) => row.productName },
    { header: 'Mã sản phẩm', width: 16, value: (row) => row.productSku },
    { header: 'Bộ sưu tập', width: 20, value: (row) => row.collection },
    { header: 'Danh mục', width: 20, value: (row) => row.category },
    { header: 'SKU size', width: 20, value: (row) => row.sku },
    { header: 'Size', width: 12, value: (row) => row.size },
    { header: 'Cân nặng', width: 12, value: (row) => row.weightRange },
    { header: 'Độ tuổi', width: 12, value: (row) => row.ageRange },
    { header: 'Giá bán (VND)', width: 14, format: 'money', value: (row) => row.price },
    { header: 'Tồn kho', width: 10, value: (row) => row.stock },
    { header: 'Đã bán (không tính đơn hủy)', width: 16, value: (row) => row.soldQuantity },
    { header: 'Đang bán', width: 10, value: (row) => yesNo(row.productActive && row.variantActive) },
  ], data.variants);

  addSheet<CouponRow>(workbook, 'Mã giảm giá', [
    { header: 'Mã', width: 16, value: (row) => row.code },
    { header: 'Loại', width: 14, value: (row) => row.type === 'PERCENT' ? 'Phần trăm' : 'Số tiền' },
    { header: 'Giá trị', width: 12, value: (row) => row.type === 'PERCENT' ? `${row.value}%` : row.value },
    { header: 'Đơn tối thiểu (VND)', width: 18, format: 'money', value: (row) => row.minSubtotal },
    { header: 'Đã dùng', width: 10, value: (row) => row.usedCount },
    { header: 'Giới hạn lượt', width: 12, value: (row) => row.usageLimit ?? 'Không giới hạn' },
    { header: 'Bắt đầu', width: 18, format: 'datetime', value: (row) => vnTime(row.startsAt) },
    { header: 'Hết hạn', width: 18, format: 'datetime', value: (row) => vnTime(row.expiresAt) },
    { header: 'Cần đăng nhập', width: 14, value: (row) => yesNo(row.requiresLogin) },
    { header: 'Đang hoạt động', width: 14, value: (row) => yesNo(row.active) },
  ], data.coupons);

  addSheet<ReviewRow>(workbook, 'Đánh giá', [
    { header: 'Ngày', width: 18, format: 'datetime', value: (row) => vnTime(row.createdAt) },
    { header: 'Sản phẩm', width: 36, value: (row) => row.productName },
    { header: 'Khách hàng', width: 22, value: (row) => row.customerName },
    { header: 'Số sao', width: 8, value: (row) => row.rating },
    { header: 'Nội dung', width: 60, value: (row) => row.content },
    { header: 'Đang hiển thị', width: 12, value: (row) => yesNo(!row.isHidden) },
    { header: 'Shop trả lời', width: 40, value: (row) => row.reply || '' },
  ], data.reviews);

  return workbook;
}
