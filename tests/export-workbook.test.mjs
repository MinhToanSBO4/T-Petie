import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildExportWorkbook } from '../src/lib/export/workbook.ts';
import { ORDER_STATUS_LABELS } from '../src/lib/orders/status.ts';

// Thứ tự cột tab đầu đã chốt với cửa hàng; scripts/check-export-flow.cjs cũng kiểm tra đúng danh sách này.
const LOCKED_ORDER_HEADERS = ['Thời gian', 'Mã đơn', 'Tên khách hàng', 'Số điện thoại', 'Địa chỉ',
  'Sản phẩm (tên + size + số lượng)', 'Tổng tiền (VND)', 'Mã giảm giá', 'Ghi chú', 'Kênh tiếp cận',
  'Trạng thái đơn', 'Số lần mua'];

const order = (overrides) => ({
  orderCode: 'TP001', createdAt: new Date('2026-09-30T17:30:00Z'), customerName: 'Chị Hà', customerPhone: '0901',
  customerEmail: 'ha@example.com', shippingAddress: '12 Láng', ward: 'Láng Thượng', district: 'Đống Đa', city: 'Hà Nội',
  orderNote: 'Giao giờ hành chính', source: 'Facebook', subtotal: 400000n, shippingFee: 30000n, discountAmount: 20000n,
  totalAmount: 410000n, couponCode: 'TPETIE20', paymentMethod: 'COD', paymentStatus: 'PENDING', orderStatus: 'COMPLETED',
  accountLabel: 'chiha',
  items: [
    { productName: 'Váy hoa', sku: 'VH-S2', size: 'Size 2', quantity: 1, unitPrice: 250000n, totalPrice: 250000n },
    { productName: 'Áo thun', sku: 'AT-S2', size: 'Size 2', quantity: 2, unitPrice: 75000n, totalPrice: 150000n },
  ],
  ...overrides,
});

const data = {
  orders: [order({}), order({ orderCode: 'TP002', orderStatus: 'CANCELLED', accountLabel: null, items: [] })],
  customers: [{ name: 'Chị Hà', email: 'ha@example.com', username: 'chiha', phone: '0901', address: null, city: 'Hà Nội',
    status: 'active', points: 0, babyName: 'Bé Na', babyBirthDate: new Date('2024-05-01T00:00:00Z'), babyWeight: 11,
    babyHeight: 82, recommendedSize: 'Size 2', createdAt: new Date('2026-01-01T00:00:00Z'), lastLoginAt: null,
    orderCount: 2, completedSpend: 410000 }],
  staff: [{ name: 'Minh', username: 'minh', email: null, role: 'staff', status: 'blocked',
    createdAt: new Date('2026-01-01T00:00:00Z'), lastLoginAt: null }],
  variants: [{ productName: 'Váy hoa', productSku: 'VH', collection: 'Hè', category: 'Váy', sku: 'VH-S2', size: 'Size 2',
    weightRange: '10-12kg', ageRange: null, price: 250000n, stock: 3, productActive: true, variantActive: false, soldQuantity: 1 }],
  coupons: [{ code: 'TPETIE20', type: 'PERCENT', value: 20, minSubtotal: 0n, usedCount: 1, usageLimit: null,
    startsAt: null, expiresAt: null, requiresLogin: false, active: true }],
  reviews: [{ productName: 'Váy hoa', customerName: 'Chị Hà', rating: 5, content: 'Đẹp', isApproved: true,
    isFeatured: false, createdAt: new Date('2026-09-01T00:00:00Z') }],
};

async function roundTrip() {
  // Ghi ra file rồi đọc lại, để kiểm tra đúng thứ người dùng mở trong Excel.
  const buffer = await buildExportWorkbook(data, ORDER_STATUS_LABELS).xlsx.writeBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}
const headers = (sheet) => sheet.getRow(1).values.slice(1);
const rowValues = (sheet, index) => sheet.getRow(index).values.slice(1);

test('each kind of data gets its own tab, orders first with the locked column order', async () => {
  const workbook = await roundTrip();
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Đơn hàng', 'Chi tiết sản phẩm',
    'Thanh toán & giao hàng', 'Khách hàng', 'Nhân sự', 'Sản phẩm & tồn kho', 'Mã giảm giá', 'Đánh giá']);
  assert.deepEqual(headers(workbook.worksheets[0]), LOCKED_ORDER_HEADERS);
});

test('order tab reads naturally: Vietnam time, full address, Vietnamese status, repeat purchases', async () => {
  const sheet = (await roundTrip()).getWorksheet('Đơn hàng');
  const [time, code, , , address, items, total, , , , status, purchases] = rowValues(sheet, 2);
  // 17:30 UTC ngày 30/09 = 00:30 ngày 01/10 giờ Việt Nam.
  assert.equal(time.toISOString(), '2026-10-01T00:30:00.000Z');
  assert.equal(sheet.getColumn(1).numFmt, 'dd/mm/yyyy hh:mm');
  assert.equal(code, 'TP001');
  assert.equal(address, '12 Láng, Láng Thượng, Đống Đa, Hà Nội');
  assert.equal(items, 'Váy hoa / Size 2 ×1; Áo thun / Size 2 ×2');
  assert.equal(total, 410000);
  assert.equal(status, 'Hoàn tất');
  assert.equal(purchases, 2);
  assert.equal(rowValues(sheet, 3)[10], 'Đã hủy');
});

test('line items, payments and stock are split out with numeric money columns', async () => {
  const workbook = await roundTrip();
  const items = workbook.getWorksheet('Chi tiết sản phẩm');
  assert.equal(items.rowCount, 3); // tiêu đề + 2 món của đơn TP001; đơn không có món không sinh dòng
  assert.deepEqual(rowValues(items, 3).slice(3), ['Áo thun', 'AT-S2', 'Size 2', 2, 75000, 150000]);
  const payments = workbook.getWorksheet('Thanh toán & giao hàng');
  assert.deepEqual(rowValues(payments, 2).slice(0, 7), ['TP001', 400000, 30000, 20000, 410000, 'COD', 'Chưa thanh toán']);
  assert.equal(rowValues(payments, 3)[11], 'Khách vãng lai');
  const stock = workbook.getWorksheet('Sản phẩm & tồn kho');
  assert.equal(rowValues(stock, 2)[9], 3);
  assert.equal(rowValues(stock, 2)[11], 'Không', 'hidden size is not on sale');
});

test('accounts tabs translate roles and never include credentials', async () => {
  const workbook = await roundTrip();
  assert.deepEqual(rowValues(workbook.getWorksheet('Nhân sự'), 2).slice(3, 5), ['Nhân viên', 'Đã khóa']);
  const customer = rowValues(workbook.getWorksheet('Khách hàng'), 2);
  assert.equal(customer[7], 2);
  assert.equal(customer[8], 410000);
  for (const sheet of workbook.worksheets) {
    assert.ok(!headers(sheet).some((header) => /mật khẩu|password|token/i.test(header)), `${sheet.name} exposes credentials`);
  }
});

test('coupons and reviews are readable without knowing internal codes', async () => {
  const workbook = await roundTrip();
  assert.deepEqual(rowValues(workbook.getWorksheet('Mã giảm giá'), 2).slice(0, 6),
    ['TPETIE20', 'Phần trăm', '20%', 0, 1, 'Không giới hạn']);
  assert.deepEqual(rowValues(workbook.getWorksheet('Đánh giá'), 2).slice(1, 6), ['Váy hoa', 'Chị Hà', 5, 'Đẹp', 'Có']);
});
