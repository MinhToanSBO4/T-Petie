/**
 * Kiểm tra quy trình xử lý đơn của quản trị viên qua server thật (`npm run dev` đang chạy):
 * - Danh sách đơn trả số đếm từng trạng thái và đủ thông tin giao hàng + lịch sử.
 * - Chuyển bước ghi lịch sử (ai làm), hoàn tác được ngay sau đó và xóa dòng lịch sử đã hoàn tác.
 * - Hủy bắt buộc có lý do, hoàn kho; đơn đang giao hủy được (giao không thành công).
 * - Đơn giao quá AUTO_COMPLETE_DAYS ngày tự hoàn tất, đơn COD chuyển sang đã thanh toán.
 * Script tự tạo tài khoản và đơn tạm; mọi thứ được xóa (kể cả tồn kho được trả về đúng số cũ) sau khi chạy.
 * Bước tự hoàn tất chỉ chạy tối đa 10 phút một lần trên mỗi server: chạy script ngay sau khi khởi động server.
 */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const base = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000');
const cookies = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
function assert(condition, message) { if (!condition) throw new Error(message); }

async function login(username, password) {
  const csrf = await fetch(new URL('/api/auth/csrf', base));
  const response = await fetch(new URL('/api/auth/callback/credentials', base), {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookies(csrf) },
    body: new URLSearchParams({ csrfToken: (await csrf.json()).csrfToken, email: username,
      password, callbackUrl: new URL('/admin', base).toString(), json: 'true' }),
  });
  return [cookies(csrf), cookies(response)].filter(Boolean).join('; ');
}

async function request(path, method = 'GET', cookie = '', body) {
  const response = await fetch(new URL(path, base), { method, redirect: 'manual',
    headers: { cookie, origin: base.origin, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* trang HTML */ }
  return { status: response.status, text, data };
}

async function main() {
  const suffix = randomBytes(4).toString('hex');
  const accountIds = []; const orderIds = [];
  const variant = await prisma.productVariant.findFirst({ where: { isActive: true, product: { isActive: true } }, include: { product: true } });
  assert(variant, 'No active variant to attach test orders to');
  const stockBefore = variant.stock;
  try {
    const username = `flow${suffix}`;
    const password = randomBytes(24).toString('base64url');
    const user = await prisma.user.create({ data: { username, email: `${username}@example.invalid`, name: 'Order flow check',
      password: await bcrypt.hash(password, 12), role: 'admin', status: 'active' } });
    accountIds.push(user.id);
    const admin = await login(username, password);

    const makeOrder = async (status, events = []) => {
      const order = await prisma.order.create({ data: {
        orderCode: `FLOW${suffix}${orderIds.length}`.toUpperCase(), customerName: 'Kiểm thử quy trình',
        customerPhone: '0900000000', shippingAddress: '12 Kiểm Thử', ward: 'Dịch Vọng', city: 'Hà Nội', district: 'Cầu Giấy',
        subtotal: 300000n, shippingFee: 30000n, totalAmount: 330000n, orderStatus: status, paymentMethod: 'COD',
        items: { create: [{ productId: variant.productId, variantId: variant.id, productName: variant.product.name,
          sku: variant.sku, size: variant.size, quantity: 1, unitPrice: 300000n, totalPrice: 300000n }] },
        statusEvents: { create: events },
      } });
      orderIds.push(order.id);
      return order;
    };
    const longAgo = new Date(Date.now() - 8 * 86400e3);
    const overdue = await makeOrder('SHIPPING', [{ status: 'SHIPPING', actor: 'admin', createdAt: longAgo }]);
    const pending = await makeOrder('PENDING');
    const shipping = await makeOrder('SHIPPING', [{ status: 'SHIPPING', actor: 'admin' }]);

    // --- Danh sách: tự hoàn tất đơn giao quá hạn, số đếm theo trạng thái, đủ thông tin giao hàng ---
    const list = await request(`/api/admin/orders?q=FLOW${suffix}&filter=PENDING`, 'GET', admin);
    assert(list.status === 200, `Order list: ${list.status} ${list.text}`);
    assert(list.data.counts.PENDING === 1 && list.data.counts.SHIPPING === 1 && list.data.counts.COMPLETED === 1,
      `Status counts: ${JSON.stringify(list.data.counts)}`);
    const row = list.data.items[0];
    assert(row?.orderCode === pending.orderCode && row.ward === 'Dịch Vọng' && row.shippingFee === 30000 && Array.isArray(row.events),
      'Order row is missing delivery details or history');
    const completed = await prisma.order.findUnique({ where: { id: overdue.id }, include: { statusEvents: true } });
    assert(completed.orderStatus === 'COMPLETED' && completed.completedAt && completed.paymentStatus === 'PAID',
      `Overdue order not auto-completed: ${completed.orderStatus} ${completed.paymentStatus}`);
    assert(completed.statusEvents.some((event) => event.status === 'COMPLETED' && event.actor === 'system'), 'Auto-complete not logged as system');
    console.log('✔ List: status counts, delivery details, overdue shipping order auto-completed and marked paid');

    // --- Chuyển bước rồi hoàn tác ---
    const confirm = await request(`/api/admin/orders/${pending.orderCode}`, 'PATCH', admin, { status: 'CONFIRMED' });
    assert(confirm.status === 200, `Confirm: ${confirm.status} ${confirm.text}`);
    const undo = await request(`/api/admin/orders/${pending.orderCode}`, 'PATCH', admin, { undo: 'CONFIRMED' });
    assert(undo.status === 200 && undo.data.status === 'PENDING', `Undo: ${undo.status} ${undo.text}`);
    const afterUndo = await prisma.order.findUnique({ where: { id: pending.id }, include: { statusEvents: true } });
    assert(afterUndo.orderStatus === 'PENDING' && afterUndo.statusEvents.length === 0, 'Undo left the order or its history changed');
    const undoAgain = await request(`/api/admin/orders/${pending.orderCode}`, 'PATCH', admin, { undo: 'CONFIRMED' });
    assert(undoAgain.status === 409, `Second undo accepted: ${undoAgain.status}`);
    const undoCompleted = await request(`/api/admin/orders/${overdue.orderCode}`, 'PATCH', admin, { undo: 'COMPLETED' });
    assert(undoCompleted.status === 409, `Undo of a completed order accepted: ${undoCompleted.status}`);
    console.log('✔ Undo: step reverted with history removed; repeat undo and undo of completion rejected');

    // --- Hủy: bắt buộc lý do, hoàn kho; đơn đang giao hủy được ---
    const noReason = await request(`/api/admin/orders/${pending.orderCode}`, 'PATCH', admin, { status: 'CANCELLED' });
    assert(noReason.status === 400, `Cancel without reason accepted: ${noReason.status}`);
    const stockMid = (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock;
    const cancel = await request(`/api/admin/orders/${shipping.orderCode}`, 'PATCH', admin, { status: 'CANCELLED', note: 'Khách không nhận hàng' });
    assert(cancel.status === 200, `Cancel shipping order: ${cancel.status} ${cancel.text}`);
    const cancelled = await prisma.order.findUnique({ where: { id: shipping.id }, include: { statusEvents: true } });
    assert(cancelled.orderStatus === 'CANCELLED' && cancelled.statusEvents.some((event) => event.note === 'Khách không nhận hàng'), 'Cancel reason not saved');
    const stockAfter = (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock;
    assert(stockAfter === stockMid + 1, `Stock not restored on cancel: ${stockMid} -> ${stockAfter}`);
    console.log('✔ Cancel: reason required and saved, failed delivery cancels and restocks');
  } finally {
    if (orderIds.length) {
      await prisma.orderStatusEvent.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: stockBefore } });
    if (accountIds.length) await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
    console.log('Temporary account and orders removed, stock restored');
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error('✖', error.message); process.exitCode = 1; });
