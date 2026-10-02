/**
 * Kiểm tra các chức năng quản trị mới qua API thật:
 * sửa sản phẩm, sửa/thêm biến thể, thứ tự ảnh, tải nhiều ảnh một lần,
 * thời hạn và xóa mã giảm giá, phân quyền admin/staff.
 * Script tự tạo tài khoản tạm và khôi phục dữ liệu sau khi chạy.
 */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const zlib = require('node:zlib');
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

// --- Ảnh PNG thật, dựng tại chỗ, để kiểm tra tải nhiều ảnh và giữ đúng thứ tự. ---
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let k = 0; k < 8; k += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value;
  }
  return table;
})();

function crc32(buffer) {
  let value = -1;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** PNG đặc một màu với kích thước cho trước; chiều rộng/cao dùng để nhận diện ảnh sau khi tải lên. */
function makePng(width, height) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * (width * 3 + 1) + 1 + x * 3;
      raw[pixel] = 200; raw[pixel + 1] = 120; raw[pixel + 2] = 80;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2; // 8 bit mỗi kênh, ảnh màu RGB
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}

async function uploadImages(cookie, files) {
  const form = new FormData();
  for (const file of files) form.append('file', new File([file.buffer], file.name, { type: 'image/png' }));
  const response = await fetch(new URL('/api/admin/media', base), {
    method: 'POST', headers: { cookie, origin: base.origin }, body: form,
  });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}

async function destroyCloudinary(publicId) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;
  if (!cloud || !key || !secret) return;
  await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ public_id: publicId }),
  }).catch(() => {});
}

async function main() {
  const suffix = Date.now().toString(36);
  const accountIds = [];
  const couponCode = `CHECK${suffix.toUpperCase()}`.slice(0, 30);
  const variantSize = `Check-${suffix}`;
  const uploadedPublicIds = [];
  let cookie; let staffCookie; let productId; let variantId;
  let originalName; let originalPrice; let originalStock; let originalImages;

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

    const list = await request('/api/admin/products?limit=50', 'GET', cookie);
    assert(list.status === 200 && list.data.items?.length > 0, 'Admin product list unavailable.');
    // Chọn sản phẩm có ít nhất hai ảnh để kiểm tra được thứ tự ảnh.
    const product = list.data.items.find((row) => row.images?.length >= 2) || list.data.items[0];
    productId = product.id;
    variantId = product.variants[0]?.id;
    originalName = product.name;
    originalPrice = product.variants[0]?.price;
    originalStock = product.variants[0]?.stock;
    originalImages = product.images.map((image) => image.url);
    assert(typeof originalPrice === 'number', 'Product has no variant to test.');
    assert(originalImages.length >= 2, 'No product with two or more images to test image order.');
    assert(Array.isArray(list.data.collections), 'Collection options missing for product editor.');

    // Sửa thông tin sản phẩm rồi khôi phục.
    const marker = `${originalName} [kiểm tra ${suffix}]`;
    const renamed = await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { product: { name: marker } });
    assert(renamed.status === 200, `Product rename failed: ${renamed.status} ${renamed.data.error || ''}`);
    const afterRename = await request('/api/admin/products', 'GET', cookie);
    assert(afterRename.data.items.find((row) => row.id === productId)?.name === marker, 'Renamed product not stored.');
    const restored = await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { product: { name: originalName } });
    assert(restored.status === 200, 'Failed to restore product name.');

    // Sửa giá và tồn của một size trong cùng một yêu cầu rồi khôi phục.
    const repriced = await request(`/api/admin/products/${productId}`, 'PATCH', cookie,
      { variants: [{ id: variantId, price: originalPrice + 1000, stock: originalStock, expectedStock: originalStock }] });
    assert(repriced.status === 200, `Variant price update failed: ${repriced.status} ${repriced.data.error || ''}`);
    const afterPrice = await request('/api/admin/products', 'GET', cookie);
    const variants = afterPrice.data.items.find((row) => row.id === productId).variants;
    assert(variants.find((row) => row.id === variantId).price === originalPrice + 1000, 'Variant price not stored.');
    await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { variants: [{ id: variantId, price: originalPrice }] });

    // Thêm size mới rồi dọn; trùng size bị từ chối.
    const created = await request(`/api/admin/products/${productId}`, 'PATCH', cookie,
      { newVariants: [{ size: variantSize, price: originalPrice, stock: 0 }] });
    assert(created.status === 200, `Variant create failed: ${created.status} ${created.data.error || ''}`);
    const duplicate = await request(`/api/admin/products/${productId}`, 'PATCH', cookie,
      { newVariants: [{ size: variantSize, price: originalPrice, stock: 0 }] });
    assert(duplicate.status === 400 && /đã tồn tại/.test(duplicate.data.error || ''), 'Duplicate size was accepted.');

    // Thứ tự ảnh: đổi chỗ hai ảnh đầu rồi khôi phục; đổi thứ tự nghĩa là sortOrder và ảnh chính đổi theo.
    const swapped = [...originalImages];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const reordered = await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { images: swapped });
    assert(reordered.status === 200, `Image reorder failed: ${reordered.status} ${reordered.data.error || ''}`);
    const rows = await prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
    assert(rows.map((row) => row.url).join('|') === swapped.join('|'), 'Image order not stored.');
    assert(rows[0].isPrimary && !rows[1].isPrimary, 'Primary image did not follow the new order.');
    // Gửi danh sách ảnh không đổi: không thêm, không xóa, giữ nguyên thứ tự gốc.
    const kept = await request(`/api/admin/products/${productId}`, 'PATCH', cookie, { images: originalImages });
    assert(kept.status === 200, `Image list save failed: ${kept.status} ${kept.data.error || ''}`);
    const restoredImages = await prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
    assert(restoredImages.map((row) => row.url).join('|') === originalImages.join('|'), 'Original image order not restored.');

    // Tải nhiều ảnh trong một yêu cầu: kết quả trả về đúng thứ tự tệp gửi lên.
    const upload = await uploadImages(cookie, [
      { name: 'check-1x1.png', buffer: makePng(1, 1) },
      { name: 'check-3x2.png', buffer: makePng(3, 2) },
    ]);
    assert(upload.status === 201 && upload.data.assets?.length === 2,
      `Multi image upload failed: ${upload.status} ${upload.data.error || ''}`);
    const [first, second] = upload.data.assets;
    uploadedPublicIds.push(first.publicId, second.publicId);
    assert(first.width === 1 && first.height === 1, 'First uploaded image is not the first file sent.');
    assert(second.width === 3 && second.height === 2, 'Uploaded images lost their order.');
    assert(upload.data.asset?.publicId === first.publicId, 'Single asset shortcut no longer matches the first file.');

    // Mã giảm giá: đặt thời hạn và giới hạn lượt, sau đó xóa.
    const coupon = await request('/api/admin/coupons', 'PATCH', cookie, { code: couponCode, type: 'FIXED',
      value: 5000, minSubtotal: 0, active: true, requiresLogin: false, usageLimit: 5,
      startsAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() });
    assert(coupon.status === 200, `Coupon with schedule failed: ${coupon.status} ${coupon.data.error || ''}`);
    const couponList = await request('/api/admin/coupons?q=' + couponCode, 'GET', cookie);
    const saved = couponList.data.items.find((row) => row.code === couponCode);
    assert(saved?.usageLimit === 5 && saved?.startsAt && saved?.expiresAt, 'Coupon schedule not stored.');
    const removed = await request(`/api/admin/coupons?code=${couponCode}`, 'DELETE', cookie);
    assert(removed.status === 200, `Coupon delete failed: ${removed.status} ${removed.data.error || ''}`);

    // Phân quyền: nhân viên sửa được sản phẩm nhưng không xóa được mã giảm giá và không tạo được sản phẩm.
    const staffPatch = await request(`/api/admin/products/${productId}`, 'PATCH', staffCookie,
      { variants: [{ id: variantId, stock: originalStock, expectedStock: originalStock }] });
    assert(staffPatch.status === 200, `Staff stock update failed: ${staffPatch.status} ${staffPatch.data.error || ''}`);
    const staffDeleteCoupon = await request('/api/admin/coupons?code=MEMBERVIP', 'DELETE', staffCookie);
    assert(staffDeleteCoupon.status === 403, 'Staff was allowed to delete a coupon.');
    const staffCreateProduct = await request('/api/admin/products', 'POST', staffCookie, { name: 'X', sku: 'X-1', slug: 'x-1', price: 1, size: 'S', stock: 1 });
    assert(staffCreateProduct.status === 403, 'Staff was allowed to create a product.');
    const staffCustomersPage = await request('/api/admin/users', 'GET', staffCookie);
    assert(staffCustomersPage.status === 403, 'Staff was allowed to list customer accounts.');

    console.log('Admin feature checks passed: product edit, variant price/stock/size, image order, multi upload, coupon schedule/delete, role boundaries.');
  } finally {
    // Khôi phục sản phẩm thử trước khi xóa tài khoản tạm.
    if (productId && originalName) {
      await request(`/api/admin/products/${productId}`, 'PATCH', cookie || '', { product: { name: originalName },
        variants: variantId ? [{ id: variantId, price: originalPrice, stock: originalStock, expectedStock: originalStock }] : [],
        ...(originalImages ? { images: originalImages } : {}) }).catch(() => {});
    }
    if (productId) await prisma.productVariant.deleteMany({ where: { productId, size: variantSize } });
    if (uploadedPublicIds.length) {
      await prisma.mediaAsset.deleteMany({ where: { publicId: { in: uploadedPublicIds } } });
      for (const publicId of uploadedPublicIds) await destroyCloudinary(publicId);
    }
    await prisma.coupon.deleteMany({ where: { code: couponCode } });
    if (accountIds.length) await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
