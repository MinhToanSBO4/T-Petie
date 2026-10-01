/**
 * Kiểm tra các thay đổi mới: khung quản trị tách khỏi giao diện khách,
 * điều hướng theo vai trò, trình chỉnh sửa nội dung trực quan và luồng đánh giá sản phẩm.
 */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const base = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000');
const cookies = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');

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
  const response = await fetch(new URL(path, base), { method,
    headers: { cookie, origin: base.origin, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* trang HTML */ }
  return { status: response.status, text, data };
}

function assert(condition, message) { if (!condition) throw new Error(message); }

/** Danh sách đánh giá công khai được cache ngắn: thử lại vài lần cho tới khi đúng điều kiện. */
async function waitForPublicReviews(productId, condition) {
  let list;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    list = await request(`/api/reviews?productId=${productId}`);
    if (condition(list)) return list;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  return list;
}

async function makeAccount(role, suffix, ids) {
  const username = `flow${role}${suffix}`;
  const password = randomBytes(24).toString('base64url');
  const user = await prisma.user.create({ data: { username, email: `${username}@example.invalid`,
    name: `Flow ${role}`, password: await bcrypt.hash(password, 12), role, status: 'active' } });
  ids.push(user.id);
  return { cookie: await login(username, password), id: user.id, password };
}

async function main() {
  const suffix = Date.now().toString(36);
  const accountIds = [];
  let reviewId;
  let orderId;
  try {
    const admin = await makeAccount('admin', suffix, accountIds);
    const staff = await makeAccount('staff', suffix, accountIds);
    const customer = await makeAccount('user', suffix, accountIds);

    // 1. Khu quản trị không còn thanh điều hướng của trang khách.
    const adminProducts = await request('/admin/products', 'GET', admin.cookie);
    assert(adminProducts.status === 200, 'Admin products page failed.');
    assert(!adminProducts.text.includes('Giỏ hàng'), 'Customer cart chrome still rendered inside admin area.');
    const publicHome = await request('/', 'GET');
    assert(publicHome.text.includes('Giỏ hàng'), 'Customer chrome missing on the public site.');

    // 2. Nhân viên mở trang chỉ dành admin được đưa về khu vực của họ (không về trang đăng nhập).
    const staffOnAdminPage = await request('/admin/exports', 'GET', staff.cookie);
    assert(staffOnAdminPage.text.includes('/admin/products'), 'Staff was not redirected to their own area.');

    // 3. Trình chỉnh sửa nội dung hiển thị khối thật của trang chủ kèm nút Sửa.
    const contentEditor = await request('/admin/content', 'GET', admin.cookie);
    assert(contentEditor.status === 200, 'Content editor failed.');
    assert(contentEditor.text.includes('Chỉnh sửa nội dung website'), 'Content editor toolbar missing.');
    assert(contentEditor.text.includes('Hero trang chủ'), 'Home sections are not rendered in the editor.');
    assert(contentEditor.text.includes('Sửa'), 'Edit buttons missing in the editor.');

    // 4. Luồng đánh giá sản phẩm: khách đã nhận hàng gửi → hiển thị ngay ở trang sản phẩm → nhân viên ẩn/trả lời.
    const variant = await prisma.productVariant.findFirst({ where: { isActive: true, product: { isActive: true } },
      include: { product: { select: { id: true, name: true } } } });
    assert(variant, 'No active product to review.');
    const product = variant.product;
    const order = await prisma.order.create({ data: {
      orderCode: `TP-FLOW-${suffix.toUpperCase()}`, userId: customer.id, customerName: 'Flow user', customerPhone: '0900000000',
      shippingAddress: 'Kiểm tra', city: 'Hà Nội', district: 'Ba Đình', subtotal: variant.price, totalAmount: variant.price,
      orderStatus: 'COMPLETED', completedAt: new Date(),
      items: { create: { productId: product.id, variantId: variant.id, productName: product.name, sku: variant.sku,
        size: variant.size, quantity: 1, unitPrice: variant.price, totalPrice: variant.price } },
    }, include: { items: true } });
    orderId = order.id;
    const notBought = await request('/api/reviews', 'POST', staff.cookie,
      { orderItemId: order.items[0].id, rating: 5, content: 'Không phải đơn của mình.' });
    assert(notBought.status === 404, 'A review for someone else\'s purchase was accepted.');
    const submitted = await request('/api/reviews', 'POST', customer.cookie,
      { orderItemId: order.items[0].id, rating: 5, content: `Đánh giá kiểm tra ${suffix}: vải mềm, bé mặc rất thoải mái.` });
    assert(submitted.status === 201, `Review submit failed: ${submitted.status} ${submitted.text.slice(0, 120)}`);
    reviewId = JSON.parse(submitted.text).id;

    const duplicate = await request('/api/reviews', 'POST', customer.cookie,
      { orderItemId: order.items[0].id, rating: 4, content: 'Đánh giá trùng, hệ thống phải chặn lại.' });
    assert(duplicate.status === 409, 'Duplicate review for the same purchased item was accepted.');

    const publicList = await waitForPublicReviews(product.id, (list) => list.text.includes(suffix));
    assert(publicList.text.includes(suffix), 'A new review was not published immediately.');

    // Nhân viên được ẩn và trả lời đánh giá; khách thường thì không.
    const customerCannotModerate = await request('/api/admin/reviews', 'PATCH', customer.cookie, { id: reviewId, isHidden: true });
    assert(customerCannotModerate.status === 403, 'A customer was allowed to moderate reviews.');
    const hidden = await request('/api/admin/reviews', 'PATCH', staff.cookie, { id: reviewId, isHidden: true });
    assert(hidden.status === 200, `Staff could not hide a review: ${hidden.status}`);
    const hiddenList = await waitForPublicReviews(product.id, (list) => !list.text.includes(suffix));
    assert(!hiddenList.text.includes(suffix), 'A hidden review is still public.');
    const shownAgain = await request('/api/admin/reviews', 'PATCH', staff.cookie, { id: reviewId, isHidden: false });
    assert(shownAgain.status === 200, `Staff could not show the review again: ${shownAgain.status}`);
    const replied = await request('/api/admin/reviews', 'PATCH', staff.cookie, { id: reviewId, reply: `Cảm ơn mẹ ${suffix}` });
    assert(replied.status === 200, `Staff could not reply: ${replied.status}`);
    const productReviews = await request(`/api/admin/reviews?productId=${product.id}`, 'GET', staff.cookie);
    assert(productReviews.data?.items.some((item) => item.id === reviewId && item.reply === `Cảm ơn mẹ ${suffix}`),
      'Product-scoped review list is missing the reply.');

    // Trang chủ không hiện đánh giá sản phẩm; đánh giá chỉ nằm ở trang sản phẩm.
    const home = await request('/', 'GET');
    assert(!home.text.includes(suffix), 'A product review was shown on the homepage.');
    const guestList = await waitForPublicReviews(product.id, (list) => list.text.includes(`Cảm ơn mẹ ${suffix}`));
    const guestReview = guestList.data?.reviews?.find((review) => review.id === reviewId);
    assert(guestReview?.reply?.content === `Cảm ơn mẹ ${suffix}`, 'Shop reply missing from the product page list.');

    console.log('Flow checks passed: admin chrome, role routing, visual content editor, review publish/hide/reply pipeline.');
  } finally {
    if (reviewId) {
      const review = await prisma.productReview.findUnique({ where: { id: reviewId }, select: { productId: true } });
      await prisma.productReview.deleteMany({ where: { id: reviewId } });
      // Điểm sao đã tính từ đánh giá thử: tính lại sau khi xóa.
      if (review) {
        const left = await prisma.productReview.aggregate({ where: { productId: review.productId, isHidden: false },
          _avg: { rating: true }, _count: { _all: true } });
        await prisma.product.update({ where: { id: review.productId }, data: {
          rating: left._count._all ? Math.round(left._avg.rating * 10) / 10 : null, reviewCount: left._count._all } });
      }
    }
    if (orderId) {
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (accountIds.length) await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
