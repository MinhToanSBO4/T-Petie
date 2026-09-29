import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export { POST } from '../checkout/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.status !== 'active') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 50,
    include: { items: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } } } } },
  });
  return NextResponse.json({ orders: orders.map((order) => ({
    id: order.orderCode, date: order.createdAt.toISOString(), status: order.orderStatus,
    total: Number(order.totalAmount), items: order.items.map((item) => ({
      name: item.productName, size: item.size, qty: item.quantity, price: Number(item.totalPrice),
      img: item.product.images[0]?.url || '/images/logo.png',
    })),
  })) });
}
