/**
 * Kiểm tra vòng đời bộ sưu tập do nhân viên quản lý, qua server thật (`npm run dev` đang chạy):
 * tạo → hiện ở /collections và trang riêng → sửa nội dung/ảnh (0, 1, 2, nhiều ảnh lookbook) → dữ liệu sai bị chặn
 * → ẩn (trang riêng trả 404) → hiện lại → xóa. Mọi dữ liệu tạm được xóa sau khi chạy.
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

/**
 * Trang "không tìm thấy": có loading.tsx ở gốc nên Next có thể đã gửi khung trang (HTTP 200) rồi mới báo không tìm thấy
 * trong luồng dữ liệu (NEXT_NOT_FOUND, kèm noindex nên không bị Google lập chỉ mục).
 */
const isNotFound = (page) => page.status === 404 || (page.status === 200 && page.text.includes('NEXT_NOT_FOUND'));

/** Trang công khai được dựng lại sau khi lưu: thử vài lần cho tới khi đúng điều kiện. */
async function waitForPage(path, condition, label) {
  let page;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    page = await request(path);
    if (condition(page)) return page;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${label} (HTTP ${page.status})`);
}

async function main() {
  const suffix = randomBytes(4).toString('hex');
  const slug = `bst-kiem-tra-${suffix}`;
  const accountIds = []; let collectionId;
  try {
    const username = `bst${suffix}`;
    const password = randomBytes(24).toString('base64url');
    const user = await prisma.user.create({ data: { username, email: `${username}@example.invalid`, name: 'Collection check',
      password: await bcrypt.hash(password, 12), role: 'staff', status: 'active' } });
    accountIds.push(user.id);
    const staff = await login(username, password);

    const sample = await prisma.collection.findFirst({ where: { lookbookUrls: { isEmpty: false } } });
    assert(sample, 'An existing collection with lookbook images is needed for valid image URLs.');
    const looks = sample.lookbookUrls;
    const input = { title: `BST kiểm tra ${suffix}`, slug, bannerUrl: sample.bannerUrl, subtitle: '', story: '',
      season: '', badge: '', lookbookUrls: [], themeColor: '#fff8ee', accentColor: '#ffffff', sortOrder: 997,
      isActive: true, showInMenu: false, showOnHome: false };

    // --- Tạo bằng tài khoản nhân viên, chưa có ảnh lookbook ---
    const created = await request('/api/admin/collections', 'POST', staff, input);
    assert(created.status === 201, `Staff could not create a collection: ${created.status} ${created.text}`);
    collectionId = created.data.id;
    await waitForPage('/collections', (page) => page.text.includes(input.title), 'New collection missing from /collections');
    await waitForPage(`/collections/${slug}`, (page) => !isNotFound(page) && page.text.includes(input.title), 'New collection page missing');
    console.log('✔ Create: staff created a collection; it shows on /collections and its own page (no lookbook yet)');

    // --- Sửa nội dung và số ảnh lookbook khác nhau ---
    for (const count of [1, 2, Math.min(7, looks.length)]) {
      const edited = { ...input, title: `BST đã sửa ${count} ${suffix}`, story: `Câu chuyện ${count} ${suffix}`,
        season: 'Mùa kiểm tra', badge: 'Kiểm tra', lookbookUrls: looks.slice(0, count) };
      const saved = await request(`/api/admin/collections/${collectionId}`, 'PATCH', staff, edited);
      assert(saved.status === 200, `Edit with ${count} lookbook images failed: ${saved.status} ${saved.text}`);
      const detail = await waitForPage(`/collections/${slug}`, (page) => page.text.includes(edited.title), `Edited title (${count} images) not shown`);
      assert(detail.text.includes(edited.story), 'Edited story not shown on the collection page.');
      const shown = (detail.text.match(/Xem ảnh lookbook \d+ của/g) || []).length;
      assert(shown === count, `Expected ${count} lookbook images on the page, found ${shown}.`);
      await waitForPage('/collections', (page) => page.text.includes(edited.title), 'Edited title missing from /collections');
    }
    console.log('✔ Edit: title, story, season, badge and 1/2/many lookbook images update both pages');

    // --- Dữ liệu sai bị chặn ---
    const renamed = await request(`/api/admin/collections/${collectionId}`, 'PATCH', staff, { ...input, slug: `${slug}-moi` });
    assert(renamed.status === 400, `Slug change was accepted: ${renamed.status}`);
    const badColor = await request(`/api/admin/collections/${collectionId}`, 'PATCH', staff, { ...input, accentColor: 'red' });
    assert(badColor.status === 400, `Invalid colour accepted: ${badColor.status}`);
    const outside = await request(`/api/admin/collections/${collectionId}`, 'PATCH', staff,
      { ...input, bannerUrl: 'https://example.com/banner.jpg' });
    assert(outside.status === 400, `Banner outside Cloudinary accepted: ${outside.status}`);
    const duplicate = await request('/api/admin/collections', 'POST', staff, input);
    assert(duplicate.status === 409, `Duplicate slug accepted: ${duplicate.status}`);
    const anonymous = await request(`/api/admin/collections/${collectionId}`, 'PATCH', '', input);
    assert(anonymous.status === 403, `Anonymous edit accepted: ${anonymous.status}`);
    console.log('✔ Validation: slug change, bad colour, outside image, duplicate slug and anonymous edit rejected');

    // --- Ẩn rồi hiện lại ---
    const hidden = await request(`/api/admin/collections/${collectionId}`, 'PATCH', staff, { ...input, isActive: false });
    assert(hidden.status === 200, `Hide failed: ${hidden.status}`);
    await waitForPage(`/collections/${slug}`, isNotFound, 'Hidden collection page still reachable');
    await waitForPage('/collections', (page) => !page.text.includes(input.title), 'Hidden collection still listed');
    const shownAgain = await request(`/api/admin/collections/${collectionId}`, 'PATCH', staff, input);
    assert(shownAgain.status === 200, `Show again failed: ${shownAgain.status}`);
    await waitForPage(`/collections/${slug}`, (page) => !isNotFound(page) && page.text.includes(input.title), 'Re-activated collection page missing');
    console.log('✔ Visibility: hidden collection disappears (404), shown again comes back');

    // --- Xóa (chưa có sản phẩm nên xóa hẳn) ---
    const removed = await request(`/api/admin/collections/${collectionId}`, 'DELETE', staff);
    assert(removed.status === 200 && removed.data.archived === false, `Delete failed: ${removed.status} ${removed.text}`);
    collectionId = null;
    await waitForPage(`/collections/${slug}`, isNotFound, 'Deleted collection page still reachable');
    console.log('✔ Delete: empty collection removed and its page returns 404');
  } finally {
    if (collectionId) await prisma.collection.deleteMany({ where: { id: collectionId } });
    await prisma.collection.deleteMany({ where: { slug } });
    if (accountIds.length) await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
    console.log('Temporary account and collection removed');
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error('✖', error.message); process.exitCode = 1; });
