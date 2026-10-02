/**
 * Kiểm tra luồng Đơn mua và đánh giá đã mua hàng trên server local đang chạy:
 * - /orders yêu cầu đăng nhập; khách chỉ thấy đơn của mình, lọc đúng theo tab.
 * - Khách hủy đơn chờ xác nhận (tồn kho được hoàn), xác nhận "Đã nhận được hàng" khi đơn đang giao.
 * - Chỉ món thuộc đơn đã hoàn tất của chính khách mới đánh giá được; mỗi món một lần; sửa đúng một lần.
 * - Đánh giá hiển thị ngay: điểm sao sản phẩm cập nhật và đánh giá hiện trong API công khai.
 * Dữ liệu thử (tài khoản, đơn, đánh giá, ảnh) được dọn trong finally.
 */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes, randomUUID } = require('node:crypto');
const zlib = require('node:zlib');
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
      password, callbackUrl: new URL('/', base).toString(), json: 'true' }),
  });
  return [cookies(csrf), cookies(response)].filter(Boolean).join('; ');
}

async function request(path, method = 'GET', cookie = '', body, headers = {}) {
  const isForm = body instanceof FormData;
  const response = await fetch(new URL(path, base), { method, cache: 'no-store', redirect: 'manual',
    headers: { cookie, origin: base.origin, ...(body && !isForm ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch { /* trang HTML */ }
  return { status: response.status, text, data };
}

/** Ảnh PNG nhỏ hợp lệ để thử tải ảnh kèm đánh giá (không cần thư viện ảnh). */
function makePng(size = 8) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(type), data])));
    return Buffer.concat([length, Buffer.from(type), data, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 2; // 8 bit, RGB
  const rows = Buffer.concat(Array.from({ length: size }, () => Buffer.concat([Buffer.from([0]),
    Buffer.from(Array.from({ length: size }, () => [245, 166, 35]).flat())])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

async function makeAccount(role, suffix, ids) {
  const username = `buy${role}${suffix}${ids.length}`;
  const password = randomBytes(24).toString('base64url');
  const user = await prisma.user.create({ data: { username, email: `${username}@example.invalid`,
    name: `Mẹ Kiểm Tra ${ids.length}`, password: await bcrypt.hash(password, 12), role, status: 'active' } });
  ids.push(user.id);
  return { cookie: await login(username, password), id: user.id };
}

async function main() {
  const suffix = Date.now().toString(36);
  const accountIds = [];
  const orderIds = [];
  let reviewId;
  let productBefore;
  let productId;
  let variantStock;
  let variantId;
  try {
    const variant = await prisma.productVariant.findFirst({ where: { isActive: true, stock: { gte: 2 }, product: { isActive: true } },
      include: { product: { select: { id: true, name: true, rating: true, reviewCount: true } } }, orderBy: { stock: 'desc' } });
    assert(variant, 'Need an active product size with at least 2 in stock.');
    variantId = variant.id;
    variantStock = variant.stock;
    productId = variant.product.id;
    productBefore = { rating: variant.product.rating, reviewCount: variant.product.reviewCount };
    const product = variant.product;
    const admin = await makeAccount('admin', suffix, accountIds);
    const buyer = await makeAccount('user', suffix, accountIds);
    const stranger = await makeAccount('user', suffix, accountIds);

    // 1. Trang Đơn mua: chưa đăng nhập thấy lời mời đăng nhập, không thấy dữ liệu.
    const anonymous = await request('/orders');
    assert(anonymous.status === 200 && anonymous.text.includes('Đăng nhập để xem đơn mua'), 'Orders page did not ask a guest to sign in.');

    // 2. Đơn đang giao của khách (tạo thẳng trong DB, không trừ kho) và một đơn đặt thật qua API thanh toán.
    const shipping = await prisma.order.create({ data: {
      orderCode: `TP-BUY-${suffix.toUpperCase()}`, userId: buyer.id, customerName: 'Mẹ Kiểm Tra', customerPhone: '0911111111',
      shippingAddress: '1 Đường Thử', city: 'Hà Nội', district: 'Ba Đình', subtotal: variant.price, totalAmount: variant.price,
      orderStatus: 'SHIPPING',
      items: { create: { productId: product.id, variantId: variant.id, productName: product.name, sku: variant.sku,
        size: variant.size, quantity: 1, unitPrice: variant.price, totalPrice: variant.price } },
      statusEvents: { create: [{ status: 'PENDING' }, { status: 'CONFIRMED' }, { status: 'PROCESSING' }, { status: 'SHIPPING' }] },
    }, include: { items: true } });
    orderIds.push(shipping.id);
    const itemId = shipping.items[0].id;

    const checkout = await request('/api/checkout', 'POST', buyer.cookie, {
      fullName: 'Mẹ Kiểm Tra', phone: '0911111111', address: '1 Đường Thử', city: 'Hà Nội', district: 'Ba Đình',
      items: [{ productId: product.id, selectedSize: variant.size, quantity: 1 }],
    }, { 'idempotency-key': randomUUID() });
    assert(checkout.status === 201 && checkout.data.orderId, `Checkout failed: ${checkout.status} ${checkout.data.message || ''}`);
    const pendingCode = checkout.data.orderId;
    const pendingOrder = await prisma.order.findUnique({ where: { orderCode: pendingCode }, select: { id: true, userId: true } });
    orderIds.push(pendingOrder.id);
    assert(pendingOrder.userId === buyer.id, 'Order placed while signed in is not linked to the account.');
    const afterCheckout = await prisma.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } });
    assert(afterCheckout.stock === variantStock - 1, 'Checkout did not reserve stock.');

    const list = await request('/orders', 'GET', buyer.cookie);
    assert(list.status === 200 && list.text.includes(shipping.orderCode) && list.text.includes(pendingCode), 'Orders page is missing the buyer\'s orders.');
    const shippingTab = await request('/orders?tab=shipping', 'GET', buyer.cookie);
    assert(shippingTab.text.includes(shipping.orderCode) && !shippingTab.text.includes(pendingCode), 'Shipping tab is not filtered.');
    const strangerList = await request('/orders', 'GET', stranger.cookie);
    assert(!strangerList.text.includes(shipping.orderCode), 'Another customer could see the order list.');
    // Trang dựng theo kiểu streaming nên mã HTTP có thể là 200; điều cần bảo đảm là không lộ thông tin đơn.
    const strangerDetail = await request(`/orders/${shipping.orderCode}`, 'GET', stranger.cookie);
    assert(strangerDetail.text.includes('Không tìm thấy đơn hàng') && !strangerDetail.text.includes('0911111111')
      && !strangerDetail.text.includes('1 Đường Thử'), 'Another customer could open the order detail page.');
    const strangerApi = await request(`/api/orders/${shipping.orderCode}`, 'GET', stranger.cookie);
    assert(strangerApi.status === 404, 'Another customer could read the order through the API.');
    const ownDetail = await request(`/orders/${shipping.orderCode}`, 'GET', buyer.cookie);
    assert(ownDetail.status === 200 && ownDetail.text.includes('Hành trình đơn hàng') && ownDetail.text.includes('Đã nhận được hàng'),
      'Order detail lacks the timeline or the receipt button.');
    const lookup = await request(`/api/orders/${shipping.orderCode}?phone=0911111111`);
    assert(lookup.status === 200 && Array.isArray(lookup.data.order.timeline), 'Guest lookup by phone lost the timeline.');

    // 3. Chưa nhận hàng thì chưa đánh giá; người khác không đánh giá hộ được.
    const early = await request('/api/reviews', 'POST', buyer.cookie, { orderItemId: itemId, rating: 5 });
    assert(early.status === 403, `Review before delivery was not blocked: ${early.status}`);
    const foreign = await request('/api/reviews', 'POST', stranger.cookie, { orderItemId: itemId, rating: 1, content: 'Không phải đơn của tôi' });
    assert(foreign.status === 404, 'A customer reviewed someone else\'s purchase.');

    // 4. Hủy đơn chờ xác nhận: tồn kho trả lại; hủy lần hai và "đã nhận" đơn đã hủy đều bị chặn.
    const strangerCancel = await request(`/api/orders/${pendingCode}/status`, 'POST', stranger.cookie, { action: 'cancel' });
    assert(strangerCancel.status === 404, 'A customer could cancel someone else\'s order.');
    const cancel = await request(`/api/orders/${pendingCode}/status`, 'POST', buyer.cookie, { action: 'cancel' });
    assert(cancel.status === 200, `Customer cancel failed: ${cancel.status} ${cancel.data.error || ''}`);
    const restored = await prisma.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } });
    assert(restored.stock === variantStock, 'Cancelling did not return stock.');
    const again = await request(`/api/orders/${pendingCode}/status`, 'POST', buyer.cookie, { action: 'cancel' });
    assert(again.status === 409, 'A cancelled order was cancelled twice.');
    const wrongStep = await request(`/api/orders/${pendingCode}/status`, 'POST', buyer.cookie, { action: 'received' });
    assert(wrongStep.status === 409, 'A cancelled order was marked as received.');
    const bogus = await request(`/api/orders/${pendingCode}/status`, 'POST', buyer.cookie, { action: 'toString' });
    assert(bogus.status === 400, 'An unknown action was accepted.');

    // 5. Khách xác nhận đã nhận hàng → đơn hoàn tất, có mốc hoàn tất và lịch sử.
    const received = await request(`/api/orders/${shipping.orderCode}/status`, 'POST', buyer.cookie, { action: 'received' });
    assert(received.status === 200, `Receipt confirmation failed: ${received.status} ${received.data.error || ''}`);
    const completed = await prisma.order.findUnique({ where: { id: shipping.id }, include: { statusEvents: true } });
    assert(completed.orderStatus === 'COMPLETED' && completed.completedAt, 'Order was not completed with a completion time.');
    assert(completed.statusEvents.some((event) => event.status === 'COMPLETED'), 'Completion is missing from the order history.');
    const eligibility = await request(`/api/reviews/eligibility?productId=${product.id}`, 'GET', buyer.cookie);
    assert(eligibility.data.targets?.some((target) => target.orderItemId === itemId), 'Product page would not offer the review button.');
    const toReview = await request('/orders?tab=to-review', 'GET', buyer.cookie);
    assert(toReview.text.includes(shipping.orderCode), 'Completed order missing from the to-review tab.');

    // 6. Gửi đánh giá kèm ảnh (nếu có Cloudinary), chặn gửi trùng.
    const marker = `Đánh giá đã mua ${suffix}`;
    const hasCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME);
    let created;
    if (hasCloudinary) {
      const form = new FormData();
      form.set('orderItemId', itemId); form.set('rating', '4'); form.set('content', marker);
      form.set('sizeFit', 'fit'); form.set('isAnonymous', 'true');
      form.append('images', new File([makePng()], 'be-mac.png', { type: 'image/png' }));
      created = await request('/api/reviews', 'POST', buyer.cookie, form);
    } else {
      created = await request('/api/reviews', 'POST', buyer.cookie, { orderItemId: itemId, rating: 4, content: marker, sizeFit: 'fit', isAnonymous: true });
    }
    assert(created.status === 201, `Verified review failed: ${created.status} ${created.data.error || ''}`);
    reviewId = created.data.id;
    const fake = new FormData();
    fake.set('orderItemId', itemId); fake.set('rating', '5');
    fake.append('images', new File(['<svg onload=alert(1)>'], 'x.png', { type: 'image/png' }));
    const disguised = await request('/api/reviews', 'POST', buyer.cookie, fake);
    assert(disguised.status === 400 || disguised.status === 409, 'A non-image file disguised as PNG was accepted.');
    const duplicate = await request('/api/reviews', 'POST', buyer.cookie, { orderItemId: itemId, rating: 5 });
    assert(duplicate.status === 409, 'The same purchased item was reviewed twice.');
    const stored = await prisma.productReview.findUnique({ where: { id: reviewId } });
    assert(stored.orderItemId === itemId && stored.variantLabel === variant.size && !stored.isHidden, 'Review is not linked to the purchase or was not published.');
    if (hasCloudinary) assert(stored.imageUrls.length === 1 && stored.imageUrls[0].includes('/tpetie/reviews/'), 'Review photo was not stored.');

    // 7. Hiển thị ngay, có điểm sao và tên đã che.
    const rated = await prisma.product.findUnique({ where: { id: product.id }, select: { rating: true, reviewCount: true } });
    assert(rated.reviewCount === productBefore.reviewCount + 1 && rated.rating, 'Product rating was not refreshed after the review was submitted.');
    let publicList;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      publicList = await request(`/api/reviews?productId=${product.id}`);
      if (publicList.text.includes(marker)) break;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    const shown = publicList.data.reviews?.find((review) => review.id === reviewId);
    assert(shown && shown.verified && shown.name.includes('*****') && shown.sizeFit === 'fit', 'Published review is missing, unverified or not masked.');
    assert(publicList.data.summary.total >= 1, 'Review summary did not count the published review.');
    const mediaFilter = await request(`/api/reviews?productId=${product.id}&filter=media`);
    if (hasCloudinary) assert(mediaFilter.data.reviews.some((review) => review.id === reviewId), 'Photo filter missed the review with a photo.');

    // 8. Sửa một lần (vẫn hiển thị, điểm sao tính lại), lần hai bị chặn.
    const edited = await request(`/api/reviews/${reviewId}`, 'PATCH', buyer.cookie, { rating: 5, content: `${marker} (đã sửa)`, keepImages: stored.imageUrls });
    assert(edited.status === 200, `Edit failed: ${edited.status} ${edited.data.error || ''}`);
    const afterEdit = await prisma.productReview.findUnique({ where: { id: reviewId } });
    assert(afterEdit.editCount === 1 && !afterEdit.isHidden && afterEdit.imageUrls.length === stored.imageUrls.length, 'Edit hid the review or lost photos.');
    const rerated = await prisma.product.findUnique({ where: { id: product.id }, select: { reviewCount: true } });
    assert(rerated.reviewCount === productBefore.reviewCount + 1, 'Rating stopped counting the edited review.');
    const secondEdit = await request(`/api/reviews/${reviewId}`, 'PATCH', buyer.cookie, { rating: 1 });
    assert(secondEdit.status === 409, 'A review was edited twice.');
    const strangerEdit = await request(`/api/reviews/${reviewId}`, 'PATCH', stranger.cookie, { rating: 1 });
    assert(strangerEdit.status === 404, 'Another customer edited the review.');
    const doneTab = await request('/orders?tab=to-review', 'GET', buyer.cookie);
    assert(!doneTab.text.includes(shipping.orderCode), 'A fully reviewed order stayed in the to-review tab.');

    console.log(`Purchase flow verified: orders tabs, ownership, cancel/receipt, verified review${hasCloudinary ? ' with photo' : ''}, moderation, rating and single edit.`);
  } finally {
    if (reviewId) {
      const review = await prisma.productReview.findUnique({ where: { id: reviewId }, select: { imageUrls: true } });
      if (review) {
        await prisma.productReview.delete({ where: { id: reviewId } });
        await deleteFromCloudinary(review.imageUrls).catch(() => {});
      }
    }
    // Trả điểm sao và tồn kho của sản phẩm thử về đúng như trước khi chạy.
    if (productId && productBefore) await prisma.product.update({ where: { id: productId }, data: productBefore });
    if (variantId && variantStock !== undefined) await prisma.productVariant.update({ where: { id: variantId }, data: { stock: variantStock } });
    if (orderIds.length) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (accountIds.length) await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.$disconnect();
  }
}

/** Xóa ảnh đánh giá thử khỏi Cloudinary (cùng cách máy chủ xóa ảnh). */
async function deleteFromCloudinary(urls) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;
  if (!cloud || !key || !secret) return;
  for (const url of urls) {
    const match = /\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(url);
    if (!match) continue;
    await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ public_id: match[1] }) });
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
