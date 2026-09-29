import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { authOptions } from '@/server/auth/options';
import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin' || session.user.status !== 'active') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 10000, include: { items: true } });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "T'Petie";
  const sheet = workbook.addWorksheet('Đơn hàng');
  sheet.columns = [
    { header: 'Mã đơn', key: 'code', width: 24 },
    { header: 'Ngày tạo', key: 'created', width: 23 },
    { header: 'Khách hàng', key: 'name', width: 28 },
    { header: 'Số điện thoại', key: 'phone', width: 18 },
    { header: 'Trạng thái', key: 'status', width: 18 },
    { header: 'Tạm tính (VND)', key: 'subtotal', width: 20 },
    { header: 'Phí vận chuyển (VND)', key: 'shipping', width: 24 },
    { header: 'Giảm giá (VND)', key: 'discount', width: 20 },
    { header: 'Tổng tiền (VND)', key: 'total', width: 20 },
    { header: 'Sản phẩm', key: 'items', width: 70 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF263F33' } };
  for (const order of orders) {
    sheet.addRow({
      code: order.orderCode, created: order.createdAt.toISOString(), name: order.customerName,
      phone: order.customerPhone, status: order.orderStatus,
      subtotal: Number(order.subtotal), shipping: Number(order.shippingFee),
      discount: Number(order.discountAmount), total: Number(order.totalAmount),
      items: order.items.map((item) => `${item.productName} / ${item.size} ×${item.quantity}`).join('; '),
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as BodyInit, { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="tpetie-orders-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    'Cache-Control': 'no-store',
  } });
}
