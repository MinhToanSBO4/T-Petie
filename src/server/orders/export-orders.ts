import 'server-only';
import ExcelJS from 'exceljs';
import { prisma } from '@/server/db/client';
import { uploadRawFileToCloudinary } from '@/server/media/cloudinary';

const EXPORT_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_ORDERS = 10000;

/** Địa chỉ giao hàng đầy đủ từ các trường đã lưu. */
function fullAddress(order: { shippingAddress: string; ward: string | null; district: string; city: string }) {
  return [order.shippingAddress, order.ward, order.district, order.city].filter(Boolean).join(', ');
}

/**
 * Dựng file Excel đơn hàng theo đúng thứ tự cột đã chốt:
 * thời gian, mã đơn, khách, điện thoại, địa chỉ, sản phẩm, tổng tiền,
 * mã giảm giá, ghi chú, kênh tiếp cận, trạng thái, số lần mua.
 */
export async function buildOrdersWorkbook(): Promise<{ buffer: Buffer; orderCount: number }> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: MAX_ORDERS,
    include: { items: true },
  });
  const phones = [...new Set(orders.map((order) => order.customerPhone))];
  const counts = phones.length ? await prisma.order.groupBy({
    by: ['customerPhone'],
    where: { customerPhone: { in: phones } },
    _count: { _all: true },
  }) : [];
  const purchaseCount = new Map(counts.map((row) => [row.customerPhone, row._count._all]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "T'Petie";
  const sheet = workbook.addWorksheet('Đơn hàng');
  sheet.columns = [
    { header: 'Thời gian', key: 'createdAt', width: 22 },
    { header: 'Mã đơn', key: 'orderCode', width: 26 },
    { header: 'Tên khách hàng', key: 'customerName', width: 26 },
    { header: 'Số điện thoại', key: 'phone', width: 16 },
    { header: 'Địa chỉ', key: 'address', width: 50 },
    { header: 'Sản phẩm (tên + size + số lượng)', key: 'items', width: 60 },
    { header: 'Tổng tiền (VND)', key: 'total', width: 18 },
    { header: 'Mã giảm giá', key: 'couponCode', width: 16 },
    { header: 'Ghi chú', key: 'note', width: 32 },
    { header: 'Kênh tiếp cận', key: 'source', width: 18 },
    { header: 'Trạng thái đơn', key: 'status', width: 16 },
    { header: 'Số lần mua', key: 'purchaseCount', width: 14 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF263F33' } };
  sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };

  for (const order of orders) {
    sheet.addRow({
      createdAt: order.createdAt.toLocaleString('vi-VN'),
      orderCode: order.orderCode,
      customerName: order.customerName,
      phone: order.customerPhone,
      address: fullAddress(order),
      items: order.items.map((item) => `${item.productName} / ${item.size} ×${item.quantity}`).join('; '),
      total: Number(order.totalAmount),
      couponCode: order.couponCode || '',
      note: order.orderNote || '',
      source: order.source || '',
      status: order.orderStatus,
      purchaseCount: purchaseCount.get(order.customerPhone) || 1,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), orderCount: orders.length };
}

/**
 * Chạy một tiến trình xuất dữ liệu: dựng file, tải lên Cloudinary và cập nhật trạng thái.
 * Được gọi nền sau khi API đã trả về nên người dùng không phải chờ.
 */
export async function runOrderExportJob(jobId: string): Promise<void> {
  try {
    await prisma.exportJob.update({ where: { id: jobId }, data: { status: 'processing' } });
    const { buffer, orderCount } = await buildOrdersWorkbook();
    const fileName = `tpetie-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const uploaded = await uploadRawFileToCloudinary(buffer, fileName, EXPORT_MIME);
    if (!uploaded) throw new Error('Không tải được file lên Cloudinary');
    await prisma.exportJob.update({ where: { id: jobId },
      data: { status: 'completed', fileName, fileUrl: uploaded.url, orderCount, completedAt: new Date() } });
  } catch (error) {
    console.error('Export job failed:', error);
    await prisma.exportJob.update({ where: { id: jobId },
      data: { status: 'failed', error: error instanceof Error ? error.message.slice(0, 300) : 'Lỗi không xác định',
        completedAt: new Date() } }).catch(() => {});
  }
}
