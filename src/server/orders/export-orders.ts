import 'server-only';
import { prisma } from '@/server/db/client';
import { uploadRawFileToCloudinary } from '@/server/media/cloudinary';
import { buildExportWorkbook } from '@/lib/export/workbook';
import { ORDER_STATUS_LABELS } from '@/lib/orders/status';

/**
 * Trường trả về cho giao diện. Không gồm fileUrl: file chứa thông tin khách hàng nên chỉ được tải
 * qua /download (kiểm tra quyền mỗi lần), không để lộ đường dẫn lưu trữ ra trình duyệt.
 */
export const EXPORT_JOB_FIELDS = { id: true, status: true, fileName: true, orderCount: true, error: true,
  createdAt: true, completedAt: true } as const;

const EXPORT_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_ROWS = 10000;

/**
 * Gom toàn bộ dữ liệu quản trị cho file Excel: đơn hàng, chi tiết sản phẩm, thanh toán,
 * khách hàng, nhân sự, tồn kho, mã giảm giá, đánh giá. Chỉ chọn trường cần xuất (không lấy mật khẩu).
 */
export async function buildAdminWorkbook(): Promise<{ buffer: Buffer; orderCount: number }> {
  // Runtime chỉ có 1 kết nối database nên các truy vấn chạy lần lượt; mỗi truy vấn đều có giới hạn.
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: MAX_ROWS,
    include: { items: true, user: { select: { username: true, email: true } } } });
  const users = await prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: MAX_ROWS,
    select: { id: true, name: true, email: true, username: true, phone: true, address: true, city: true, role: true,
      status: true, points: true, babyName: true, babyBirthDate: true, babyWeight: true, babyHeight: true,
      recommendedSize: true, createdAt: true, lastLoginAt: true } });
  const orderCounts = await prisma.order.groupBy({ by: ['userId'], where: { userId: { not: null } }, _count: { _all: true } });
  const spend = await prisma.order.groupBy({ by: ['userId'], where: { userId: { not: null }, orderStatus: 'COMPLETED' },
    _sum: { totalAmount: true } });
  const variants = await prisma.productVariant.findMany({ take: MAX_ROWS,
    orderBy: [{ product: { name: 'asc' } }, { size: 'asc' }],
    include: { product: { select: { name: true, sku: true, categoryName: true, isActive: true,
      collection: { select: { title: true } } } } } });
  const sold = await prisma.orderItem.groupBy({ by: ['variantId'], where: { order: { orderStatus: { not: 'CANCELLED' } } },
    _sum: { quantity: true } });
  const coupons = await prisma.coupon.findMany({ orderBy: { code: 'asc' } });
  const reviews = await prisma.productReview.findMany({ orderBy: { createdAt: 'desc' }, take: MAX_ROWS,
    include: { product: { select: { name: true } } } });

  const countByUser = new Map(orderCounts.map((row) => [row.userId, row._count._all]));
  const spendByUser = new Map(spend.map((row) => [row.userId, Number(row._sum.totalAmount || 0)]));
  const soldByVariant = new Map(sold.map((row) => [row.variantId, row._sum.quantity || 0]));

  const workbook = buildExportWorkbook({
    orders: orders.map((order) => ({ ...order, accountLabel: order.user?.username || order.user?.email || null })),
    customers: users.filter((user) => user.role === 'user').map((user) => ({ ...user,
      orderCount: countByUser.get(user.id) || 0, completedSpend: spendByUser.get(user.id) || 0 })),
    staff: users.filter((user) => user.role !== 'user'),
    variants: variants.map((variant) => ({ productName: variant.product.name, productSku: variant.product.sku,
      collection: variant.product.collection?.title || null, category: variant.product.categoryName,
      sku: variant.sku, size: variant.size, weightRange: variant.weightRange, ageRange: variant.ageRange,
      price: variant.price, stock: variant.stock, productActive: variant.product.isActive, variantActive: variant.isActive,
      soldQuantity: soldByVariant.get(variant.id) || 0 })),
    coupons,
    reviews: reviews.map((review) => ({ ...review, productName: review.product.name })),
  }, ORDER_STATUS_LABELS);
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
    const { buffer, orderCount } = await buildAdminWorkbook();
    // Ngày theo giờ Việt Nam để tên file khớp ngày chủ shop bấm xuất.
    const fileName = `tpetie-du-lieu-${new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)}.xlsx`;
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
