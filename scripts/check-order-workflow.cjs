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

    // --- Xử lý hàng loạt: chuyển thẳng nhiều bước (ghi đủ lịch sử), bỏ qua đơn không hợp lệ, hoàn tác về trạng thái cũ ---
    const first = await makeOrder('PENDING', [{ status: 'PENDING' }]);
    const second = await makeOrder('CONFIRMED', [{ status: 'PENDING' }, { status: 'CONFIRMED', actor: 'admin' }]);
    const bulk = await request('/api/admin/orders/bulk', 'POST', admin,
      { action: 'advance', codes: [first.orderCode, second.orderCode, shipping.orderCode], to: 'SHIPPING' });
    assert(bulk.status === 200, `Bulk advance: ${bulk.status} ${bulk.text}`);
    const byCode = Object.fromEntries(bulk.data.results.map((result) => [result.code, result]));
    assert(byCode[first.orderCode].ok && byCode[second.orderCode].ok && !byCode[shipping.orderCode].ok,
      `Bulk advance results: ${bulk.text}`);
    const jumped = await prisma.order.findUnique({ where: { id: first.id }, include: { statusEvents: { orderBy: { createdAt: 'asc' } } } });
    assert(jumped.orderStatus === 'SHIPPING' && jumped.statusEvents.map((event) => event.status).join() === 'PENDING,CONFIRMED,PROCESSING,SHIPPING'
      && jumped.statusEvents.slice(1).every((event) => event.actor === 'admin'), `Jump history: ${jumped.statusEvents.map((event) => event.status)}`);
    const bulkUndo = await request('/api/admin/orders/bulk', 'POST', admin, { action: 'undo', items: [
      { code: first.orderCode, current: 'SHIPPING', to: 'PENDING' }, { code: second.orderCode, current: 'SHIPPING', to: 'CONFIRMED' }] });
    assert(bulkUndo.status === 200 && bulkUndo.data.results.every((result) => result.ok), `Bulk undo: ${bulkUndo.text}`);
    const [undoneFirst, undoneSecond] = await Promise.all([first, second].map((order) =>
      prisma.order.findUnique({ where: { id: order.id }, include: { statusEvents: true } })));
    assert(undoneFirst.orderStatus === 'PENDING' && undoneFirst.statusEvents.length === 1
      && undoneSecond.orderStatus === 'CONFIRMED' && undoneSecond.statusEvents.length === 2, 'Bulk undo did not restore both orders');
    console.log('✔ Bulk: jump PENDING → SHIPPING logs every step, invalid order skipped, undo restores each original status');

    // --- Hoàn tất (COD) rồi hoàn tác: gỡ mốc hoàn tất và trạng thái đã thu tiền ---
    const complete = await request('/api/admin/orders/bulk', 'POST', admin, { action: 'advance', codes: [first.orderCode], to: 'COMPLETED' });
    assert(complete.status === 200 && complete.data.results[0].ok, `Complete: ${complete.text}`);
    const done = await prisma.order.findUnique({ where: { id: first.id } });
    assert(done.orderStatus === 'COMPLETED' && done.completedAt && done.paymentStatus === 'PAID', 'Completion did not record payment');
    const reopen = await request('/api/admin/orders/bulk', 'POST', admin, { action: 'undo', items: [{ code: first.orderCode, current: 'COMPLETED', to: 'PENDING' }] });
    assert(reopen.status === 200 && reopen.data.results[0].ok, `Undo completion: ${reopen.text}`);
    const reopened = await prisma.order.findUnique({ where: { id: first.id } });
    assert(reopened.orderStatus === 'PENDING' && !reopened.completedAt && reopened.paymentStatus === 'PENDING', 'Undo of completion left payment/completion data');
    console.log('✔ Completion: COD marked paid, undo right after removes completion and payment');

    // --- Giới hạn và phân quyền ---
    const tooMany = await request('/api/admin/orders/bulk', 'POST', admin, { action: 'advance', to: 'CONFIRMED',
      codes: Array.from({ length: 51 }, (_, index) => `TP-LIMIT-${index}`) });
    assert(tooMany.status === 400, `51 orders accepted: ${tooMany.status}`);
    const noReasonBulk = await request('/api/admin/orders/bulk', 'POST', admin, { action: 'cancel', codes: [first.orderCode] });
    assert(noReasonBulk.status === 400, `Bulk cancel without reason accepted: ${noReasonBulk.status}`);
    const staffName = `flowstaff${suffix}`;
    const staffPassword = randomBytes(24).toString('base64url');
    const staffUser = await prisma.user.create({ data: { username: staffName, email: `${staffName}@example.invalid`, name: 'Staff flow check',
      password: await bcrypt.hash(staffPassword, 12), role: 'staff', status: 'active' } });
    accountIds.push(staffUser.id);
    const staff = await login(staffName, staffPassword);
    const staffBulk = await request('/api/admin/orders/bulk', 'POST', staff, { action: 'advance', codes: [first.orderCode], to: 'CONFIRMED' });
    assert(staffBulk.status === 200 && staffBulk.data.results[0]?.ok, `Staff could not process orders: ${staffBulk.status} ${staffBulk.text}`);
    const staffStep = await prisma.orderStatusEvent.findFirst({ where: { orderId: first.id, status: 'CONFIRMED' }, orderBy: { createdAt: 'desc' } });
    assert(staffStep?.actor === 'staff', `Staff step recorded as ${staffStep?.actor}`);
    const staffUndo = await request(`/api/admin/orders/${first.orderCode}`, 'PATCH', staff, { undo: 'CONFIRMED' });
    assert(staffUndo.status === 200 && staffUndo.data.status === 'PENDING', `Staff undo: ${staffUndo.status} ${staffUndo.text}`);
    console.log('✔ Bulk limits: 50 orders per request, cancel needs a reason; staff process orders (logged as staff) and can undo');
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
