/**
 * Kiểm tra trang tổng quan và các chỉnh sửa bảo mật của khu quản trị qua server thật:
 * - Số liệu trên trang khớp với số tự tính lại từ database (không dùng lại SQL của trang).
 * - Đổi trạng thái đơn làm mới số liệu ngay; chuyển trạng thái sai bị chặn.
 * - Phân quyền admin/nhân viên/khách, API xuất file không lộ đường dẫn lưu trữ,
 *   chặn xóa ảnh đang dùng, phân trang chịu được tham số bất thường.
 * Script tự tạo tài khoản, đơn hàng, ảnh và tiến trình xuất tạm; mọi thứ được xóa sau khi chạy.
 */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const base = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000');
const cookies = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const vnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
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
  return { status: response.status, location: response.headers.get('location') || '', text, data };
}

/**
 * Trang bị chặn phải chuyển hướng tới `target` mà không lộ nội dung. Có loading.tsx ở gốc nên Next có thể
 * đã gửi khung trang (HTTP 200) rồi mới chuyển hướng trong luồng dữ liệu (NEXT_REDIRECT + meta refresh).
 */
function assertRedirect(response, target, label) {
  const redirected = (response.status === 307 && response.location.includes(target))
    || (response.status === 200 && response.text.includes(`NEXT_REDIRECT;replace;${target}`));
  assert(redirected, `${label}: expected redirect to ${target}, got ${response.status} ${response.location}`);
  for (const secret of ['Doanh thu hoàn tất', 'Đơn hàng gần đây', 'Cần chú ý']) {
    assert(!response.text.includes(secret), `${label}: page content leaked (${secret})`);
  }
}

/** Mốc 00:00 giờ Việt Nam của ngày cách hôm nay `daysAgo` ngày, tính độc lập với mã nguồn trang. */
function vnMidnight(daysAgo) {
  const vn = new Date(Date.now() + 7 * 3600e3);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() - daysAgo) - 7 * 3600e3);
}

async function main() {
  const suffix = randomBytes(4).toString('hex');
  const accountIds = []; const orderIds = []; const mediaIds = []; let exportJobId;
  try {
    const makeAccount = async (role) => {
      const username = `dash${role}${suffix}`;
      const password = randomBytes(24).toString('base64url');
      const user = await prisma.user.create({ data: { username, email: `${username}@example.invalid`,
        name: `Dashboard check ${role}`, password: await bcrypt.hash(password, 12), role, status: 'active' } });
      accountIds.push(user.id);
      return login(username, password);
    };
    const admin = await makeAccount('admin');
    const staff = await makeAccount('staff');
    const customer = await makeAccount('user');

    // --- Phân quyền trang tổng quan ---
    assertRedirect(await request('/admin'), '/login', 'Anonymous /admin');
    assertRedirect(await request('/staff'), '/login', 'Anonymous /staff');
    assertRedirect(await request('/admin', 'GET', staff), '/staff', 'Staff /admin');
    assertRedirect(await request('/admin/orders', 'GET', staff), '/staff/orders', 'Staff /admin/orders');
    assertRedirect(await request('/admin/exports', 'GET', staff), '/staff', 'Staff /admin/exports');
    assertRedirect(await request('/staff/orders', 'GET', admin), '/admin/orders', 'Admin /staff/orders');
    assertRedirect(await request('/admin', 'GET', customer), '/dashboard', 'Customer /admin');
    assertRedirect(await request('/staff', 'GET', customer), '/dashboard', 'Customer /staff');
    const staffOrders = await request('/api/admin/orders', 'GET', staff);
    assert(staffOrders.status === 200, `Staff cannot list orders: ${staffOrders.status}`);
    for (const path of ['/api/admin/export', '/api/admin/commerce', '/api/admin/users']) {
      const denied = await request(path, 'GET', staff);
      assert(denied.status === 403, `Staff reached ${path}: ${denied.status}`);
    }
    console.log('✔ Role boundaries: anonymous → login, staff → /staff, admin → /admin, customer → account; staff blocked from admin-only APIs');

    // --- Tạo đơn tạm trong kỳ này và kỳ trước với số tiền biết trước ---
    const variant = await prisma.productVariant.findFirst({ where: { isActive: true, product: { isActive: true } },
      include: { product: true } });
    assert(variant, 'No active variant to attach test orders to');
    const makeOrder = async (status, total, createdAt, source) => {
      const order = await prisma.order.create({ data: {
        orderCode: `DASH${suffix}${orderIds.length}`.toUpperCase(), customerName: 'Kiểm thử tổng quan',
        customerPhone: '0900000000', shippingAddress: 'Kiểm thử', city: 'Hà Nội', district: 'Cầu Giấy',
        subtotal: BigInt(total), totalAmount: BigInt(total), orderStatus: status, source, createdAt,
        items: { create: [{ productId: variant.productId, variantId: variant.id, productName: variant.product.name,
          sku: variant.sku, size: variant.size, quantity: 2, unitPrice: BigInt(total / 2), totalPrice: BigInt(total) }] },
      } });
      orderIds.push(order.id);
      return order;
    };
    const hourAgo = new Date(Date.now() - 3600e3);
    await makeOrder('COMPLETED', 1_234_000, hourAgo, `Kiểm thử ${suffix}`);
    await makeOrder('COMPLETED', 566_000, new Date(vnMidnight(2).getTime() + 3600e3), `Kiểm thử ${suffix}`);
    const pending = await makeOrder('PENDING', 300_000, hourAgo, null);
    await makeOrder('CANCELLED', 999_000, hourAgo, null);
    await makeOrder('COMPLETED', 900_000, new Date(Date.now() - 8 * 86400e3), null); // kỳ trước

    // Chuyển trạng thái hợp lệ qua API: đồng thời xóa cache số liệu tổng quan.
    const confirm = await request(`/api/admin/orders/${pending.orderCode}`, 'PATCH', admin, { status: 'CONFIRMED' });
    assert(confirm.status === 200, `Confirm order: ${confirm.status} ${confirm.text}`);
    const invalid = await request(`/api/admin/orders/${pending.orderCode}`, 'PATCH', admin, { status: 'COMPLETED' });
    assert(invalid.status === 409 && invalid.data?.error === 'Chuyển trạng thái không hợp lệ', `Invalid transition: ${invalid.status} ${invalid.text}`);
    const missing = await request('/api/admin/orders/KHONG-TON-TAI', 'PATCH', admin, { status: 'CONFIRMED' });
    assert(missing.status === 409, `Unknown order: ${missing.status}`);
    const staffPatch = await request(`/api/admin/orders/${pending.orderCode}`, 'PATCH', staff, { status: 'PROCESSING' });
    assert(staffPatch.status === 200, `Staff could not process the order: ${staffPatch.status} ${staffPatch.text}`);
    const staffStep = await prisma.orderStatusEvent.findFirst({ where: { orderId: pending.id, status: 'PROCESSING' } });
    assert(staffStep?.actor === 'staff', `Staff step recorded as ${staffStep?.actor}`);
    console.log('✔ Order status: valid transition saved, skipping steps rejected, staff processes orders (logged as staff)');

    // --- Tự tính số liệu 7 ngày từ database, độc lập với truy vấn của trang ---
    const from = vnMidnight(6);
    const rows = await prisma.order.findMany({ where: { createdAt: { gte: from } }, include: { items: true } });
    const completed = rows.filter((row) => row.orderStatus === 'COMPLETED');
    const revenue = completed.reduce((sum, row) => sum + Number(row.totalAmount), 0);
    const ordersCount = rows.filter((row) => row.orderStatus !== 'CANCELLED').length;
    const average = completed.length ? revenue / completed.length : 0;
    const pendingNow = await prisma.order.count({ where: { orderStatus: 'PENDING' } });
    const lowStock = await prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 }, product: { isActive: true } } });

    const page = await request('/admin?range=7d', 'GET', admin);
    assert(page.status === 200, `Dashboard HTTP ${page.status}`);
    // React chèn <!-- --> giữa các đoạn chữ liền nhau; bỏ đi để so khớp đúng câu người dùng thấy.
    const html = page.text.replace(/<!-- -->/g, '');
    for (const [label, expected] of [['revenue', vnd(revenue)], ['orders', `>${ordersCount.toLocaleString('vi-VN')}<`],
      ['average order', vnd(average)], ['pending', `${pendingNow} đơn chờ xử lý`], ['low stock', `${lowStock} size sắp hết hàng`],
      ['source', `Kiểm thử ${suffix}`], ['top product', escapeHtml(variant.product.name)], ['recent order', pending.orderCode]]) {
      assert(html.includes(expected), `Dashboard ${label} should show ${JSON.stringify(expected)}`);
    }
    assert(!html.includes('PostgreSQL') && !html.includes('thanh điều hướng bên trái'), 'Removed helper text is still on the page');
    console.log(`✔ Dashboard 7d matches database: revenue ${vnd(revenue)}, ${ordersCount} orders, avg ${vnd(average)}, ${pendingNow} pending, ${lowStock} low-stock sizes`);

    for (const range of ['30d', '90d', '12m', 'bogus']) {
      const other = await request(`/admin?range=${range}`, 'GET', admin);
      assert(other.status === 200 && other.text.includes('Tổng quan'), `Dashboard range ${range}: ${other.status}`);
    }
    console.log('✔ All range presets render (unknown value falls back safely)');

    // --- Xuất dữ liệu: danh sách và chi tiết không kèm đường dẫn file ---
    const job = await prisma.exportJob.create({ data: { status: 'completed', fileName: `check-${suffix}.xlsx`,
      fileUrl: `https://res.cloudinary.com/demo/raw/upload/check-${suffix}.xlsx`, orderCount: 0, completedAt: new Date() } });
    exportJobId = job.id;
    const list = await request('/api/admin/export', 'GET', admin);
    const listed = list.data?.jobs?.find((entry) => entry.id === job.id);
    assert(list.status === 200 && listed && !('fileUrl' in listed) && !list.text.includes(job.fileUrl), 'Export list leaks fileUrl');
    const detail = await request(`/api/admin/export/${job.id}`, 'GET', admin);
    assert(detail.status === 200 && detail.data?.job && !('fileUrl' in detail.data.job), 'Export detail leaks fileUrl');
    console.log('✔ Export API no longer exposes the storage URL of customer data');

    // --- Chặn xóa ảnh đang được dùng; ảnh không dùng vẫn xóa được ---
    // Chỉ thử trên bản ghi do script tự tạo (publicId rỗng nên không bao giờ gọi xóa trên Cloudinary);
    // ảnh sản phẩm nào đã có bản ghi thư viện thật thì bỏ qua để không đụng dữ liệu thật.
    const images = await prisma.productImage.findMany({ select: { url: true }, take: 100 });
    const known = new Set((await prisma.mediaAsset.findMany({ where: { url: { in: images.map((image) => image.url) } },
      select: { url: true } })).map((asset) => asset.url));
    const usedImage = images.find((image) => !known.has(image.url));
    if (usedImage) {
      const inUse = await prisma.mediaAsset.create({ data: { url: usedImage.url, publicId: null, folder: 'check' } });
      mediaIds.push(inUse.id);
      const blocked = await request(`/api/admin/media/${inUse.id}`, 'DELETE', staff);
      assert(blocked.status === 409 && /đang được dùng/.test(blocked.data?.error || ''), `In-use image delete: ${blocked.status} ${blocked.text}`);
      assert(await prisma.mediaAsset.count({ where: { id: inUse.id } }) === 1, 'In-use image record was deleted');
    }
    const unused = await prisma.mediaAsset.create({ data: { url: `https://res.cloudinary.com/demo/image/upload/check-${suffix}.png`,
      publicId: null, folder: 'check' } });
    mediaIds.push(unused.id);
    const removed = await request(`/api/admin/media/${unused.id}`, 'DELETE', staff);
    assert(removed.status === 200 && await prisma.mediaAsset.count({ where: { id: unused.id } }) === 0, `Unused image delete: ${removed.status}`);
    console.log('✔ Media: in-use image protected, unused image deleted');

    // --- Phân trang với tham số bất thường không còn lỗi 500 ---
    for (const query of ['page=99999999', 'limit=2.5', 'page=-1&limit=abc']) {
      const response = await request(`/api/admin/orders?${query}`, 'GET', admin);
      assert(response.status === 200, `Orders ?${query}: HTTP ${response.status}`);
    }
    console.log('✔ Pagination tolerates huge, fractional and invalid parameters');

    // --- Thông tin liên hệ: sửa qua quản trị thì footer và trang chính sách đổi theo ---
    const contentList = await request('/api/admin/site-content', 'GET', admin);
    const originalContact = contentList.data?.content?.contact_info ?? contentList.data?.contact_info;
    assert(originalContact?.hotline, `contact_info missing from admin content: ${contentList.status}`);
    const badPhone = await request('/api/admin/site-content/contact_info', 'PUT', staff, { ...originalContact, hotline: 'gọi tôi' });
    assert(badPhone.status === 400, `Invalid hotline accepted: ${badPhone.status}`);
    const marker = `09${suffix.replace(/\D/g, '').padEnd(8, '7').slice(0, 8)}`;
    try {
      const saved = await request('/api/admin/site-content/contact_info', 'PUT', staff, { ...originalContact, hotline: marker });
      assert(saved.status === 200, `Contact save: ${saved.status} ${saved.text}`);
      const home = await request('/');
      const privacy = await request('/privacy-policy');
      assert(home.text.includes(`tel:${marker}`), 'Footer does not show the updated hotline');
      assert(privacy.text.includes(`tel:${marker}`), 'Privacy page does not show the updated hotline');
    } finally {
      const restored = await request('/api/admin/site-content/contact_info', 'PUT', admin, originalContact);
      assert(restored.status === 200, `Could not restore contact info: ${restored.status}`);
    }
    const homeAfter = await request('/');
    assert(homeAfter.text.includes(`tel:${originalContact.hotline.replace(/[^\d+]/g, '')}`), 'Original hotline not restored on footer');
    console.log('✔ Contact info: edited in admin → footer + privacy page updated; bad phone rejected; original restored');

    // --- Giao diện hồng cho quản trị, cửa hàng giữ màu cũ; SEO riêng từng trang ---
    assert(page.text.includes('admin-theme'), 'Admin pages are not wrapped in the pink theme');
    assert(!homeAfter.text.includes('admin-theme'), 'Storefront picked up the admin theme');
    const product = await prisma.product.findFirst({ where: { isActive: true }, select: { slug: true, name: true } });
    const productPage = await request(`/products/${product.slug}`);
    const expectedTitle = `<title>${escapeHtml(`${product.name} | T'Petie`)}</title>`;
    assert(productPage.text.includes(expectedTitle),
      `Product page title should be ${expectedTitle}, got ${(productPage.text.match(/<title>[^<]*<\/title>/) || [''])[0]}`);
    console.log('✔ Pink admin theme scoped to admin; product pages have their own <title>');

    // --- Hồ sơ khách: tên rỗng bị từ chối ---
    const blank = await request('/api/user/profile', 'PATCH', customer, { name: '   ' });
    assert(blank.status === 400, `Blank profile name: ${blank.status}`);
    const renamed = await request('/api/user/profile', 'PATCH', customer, { name: 'Khách kiểm thử' });
    assert(renamed.status === 200, `Profile rename: ${renamed.status} ${renamed.text}`);
    console.log('✔ Profile: blank name rejected, valid update saved (looked up by account id)');
  } finally {
    if (orderIds.length) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (mediaIds.length) await prisma.mediaAsset.deleteMany({ where: { id: { in: mediaIds } } });
    if (exportJobId) await prisma.exportJob.deleteMany({ where: { id: exportJobId } });
    if (accountIds.length) await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
    console.log('Temporary accounts, orders, media and export job removed');
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error('✖', error.message); process.exitCode = 1; });
