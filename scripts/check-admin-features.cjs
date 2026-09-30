/**
 * Kiểm tra các chức năng quản trị mới qua API thật:
 * sửa sản phẩm, sửa/thêm biến thể, thời hạn và xóa mã giảm giá, phân quyền admin/staff.
 * Script tự tạo tài khoản tạm và khôi phục dữ liệu sau khi chạy.
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
  const cookie = [cookies(csrf), cookies(response)].filter(Boolean).join('; ');
  const session = await fetch(new URL('/api/auth/session', base), { headers: { cookie } });
  if (!(await session.json()).user) throw new Error(`Could not authenticate ${username}.`);
  return cookie;
}

async function request(path, method = 'GET', cookie = '', body) {
  const response = await fetch(new URL(path, base), {
    method, headers: { cookie, origin: base.origin, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function assert(condition, message) { if (!condition) throw new Error(message); }

async function main() {
  const suffix = Date.now().toString(36);
  const accountIds = [];
  const couponCode = `CHECK${suffix.toUpperCase()}`.slice(0, 30);
  const variantSize = `Check-${suffix}`;
  let cookie; let staffCookie; let productId; let variantId; let originalName; let originalPrice;

  try {
    const makeAccount = async (role) => {
      const username = `check${role}${suffix}`;
      const password = randomBytes(32).toString('base64url');
      const user = await prisma.user.create({ data: { username, email: `${username}@example.invalid`,
        name: 'Feature check', password: await bcrypt.hash(password, 12), role, status: 'active' } });
      accountIds.push(user.id);
      return login(username, password);
    };
    cookie = await makeAccount('admin');
    staffCookie = await makeAccount('staff');

    const list = await request('/api/admin/products', 'GET', cookie);
    assert(list.status === 200 && list.data.products?.length > 0, 'Admin product list unavailable.');
    const product = list.data.products[0];
    productId = product.id;
    variantId = product.variants[0]?.id;
    originalName = product.name;
    originalPrice = product.variants[0]?.price;
    assert(typeof originalPrice === 'number', 'Product has no variant to test.');
    assert(Array.isArray(list.data.collections), 'Collection options missing for product editor.');

    // Sửa thông tin sản phẩm rồi khôi phục.
    const marker = `${originalName} [kiểm tra ${suffix}]`;
    const renamed = await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { product: { name: marker } });
    assert(renamed.status === 200, `Product rename failed: ${renamed.status} ${renamed.data.error || ''}`);
    const afterRename = await request('/api/admin/products', 'GET', cookie);
    assert(afterRename.data.products.find((row) => row.id === productId)?.name === marker, 'Renamed product not stored.');
    const restored = await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { product: { name: originalName } });
    assert(restored.status === 200, 'Failed to restore product name.');

    // Sửa giá biến thể rồi khôi phục.
    const repriced = await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { variantId, price: originalPrice + 1000 });
    assert(repriced.status === 200, `Variant price update failed: ${repriced.status}`);
    const afterPrice = await request('/api/admin/products', 'GET', cookie);
    const variants = afterPrice.data.products.find((row) => row.id === productId).variants;
    assert(variants.find((row) => row.id === variantId).price === originalPrice + 1000, 'Variant price not stored.');
    await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { variantId, price: originalPrice });

    // Thêm size mới rồi dọn.
    const created = await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { newVariant: { size: variantSize, price: originalPrice, stock: 0 } });
    assert(created.status === 201, `Variant create failed: ${created.status} ${created.data.error || ''}`);
    const duplicate = await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { newVariant: { size: variantSize, price: originalPrice, stock: 0 } });
    assert(duplicate.status === 409, 'Duplicate size was accepted.');

    // Mã giảm giá: đặt thời hạn và giới hạn lượt, sau đó xóa.
    const coupon = await request('/api/admin/commerce', 'PATCH', cookie, { kind: 'coupon', code: couponCode, type: 'FIXED',
      value: 5000, minSubtotal: 0, active: true, requiresLogin: false, usageLimit: 5,
      startsAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() });
    assert(coupon.status === 200, `Coupon with schedule failed: ${coupon.status} ${coupon.data.error || ''}`);
    const commerce = await request('/api/admin/commerce', 'GET', cookie);
    const saved = commerce.data.coupons.find((row) => row.code === couponCode);
    assert(saved?.usageLimit === 5 && saved?.startsAt && saved?.expiresAt, 'Coupon schedule not stored.');
    const removed = await request(`/api/admin/commerce?code=${couponCode}`, 'DELETE', cookie);
    assert(removed.status === 200, `Coupon delete failed: ${removed.status} ${removed.data.error || ''}`);

    // Phân quyền: nhân viên sửa được sản phẩm nhưng không xóa được mã giảm giá và không tạo được sản phẩm.
    const staffPatch = await request(`/api/admin/products/${productId}`, 'PATCH', staffCookie, { variantId, stock: 0 });
    assert(staffPatch.status === 200, `Staff stock update failed: ${staffPatch.status}`);
    await request(`/api/admin/products/${productId}`, 'PATCH', staffCookie, { variantId, stock: variants.find((row) => row.id === variantId).stock });
    const staffDeleteCoupon = await request('/api/admin/commerce?code=MEMBERVIP', 'DELETE', staffCookie);
    assert(staffDeleteCoupon.status === 403, 'Staff was allowed to delete a coupon.');
    const staffCreateProduct = await request('/api/admin/products', 'POST', staffCookie, { name: 'X', sku: 'X-1', slug: 'x-1', price: 1, size: 'S', stock: 1 });
    assert(staffCreateProduct.status === 403, 'Staff was allowed to create a product.');
    const staffCustomersPage = await request('/api/admin/users', 'GET', staffCookie);
    assert(staffCustomersPage.status === 403, 'Staff was allowed to list customer accounts.');

    console.log('Admin feature checks passed: product edit, variant price/size, coupon schedule/delete, role boundaries.');
  } finally {
    if (productId) await prisma.productVariant.deleteMany({ where: { productId, size: variantSize } });
    await prisma.coupon.deleteMany({ where: { code: couponCode } });
    if (accountIds.length) await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
