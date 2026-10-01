const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const base = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000');
const cookies = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');

async function login(username, password) {
  if (!username || !password) throw new Error('Set account username and initial password in the local environment.');
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

/** Trang chủ là ISR: lần tải đầu sau khi ghi có thể còn bản cũ nên chờ tối đa vài giây. */
async function waitForHomepage(marker, expected = true) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const html = await fetch(base, { cache: 'no-store' }).then((response) => response.text());
    if (html.includes(marker) === expected) return true;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return false;
}

async function main() {
  const suffix = Date.now().toString(36);
  const slug = `content-check-${suffix}`;
  let collectionId; let testimonialId; let cookie; let staffCookie; let sectionsBefore; const accountIds = [];
  try {
    const anonymous = await request('/api/admin/collections');
    assert(anonymous.status === 403, 'Collection administration allowed anonymous access.');
    const makeAccount = async (role) => {
      const username = `check${role}${suffix}`;
      const password = randomBytes(32).toString('base64url');
      const user = await prisma.user.create({ data: { username, email: `${username}@example.invalid`,
        name: 'Content check', password: await bcrypt.hash(password, 12), role, status: 'active' } });
      accountIds.push(user.id);
      return login(username, password);
    };
    cookie = await makeAccount('admin');
    staffCookie = await makeAccount('staff');
    const initial = await request('/api/admin/collections', 'GET', cookie);
    assert(initial.status === 200 && Array.isArray(initial.data.items), 'Admin collections unavailable.');
    const sample = initial.data.items.find((item) => item.bannerUrl);
    assert(sample, 'A stored collection is needed to provide a valid banner for the test.');
    const staffCollections = await request('/api/admin/collections', 'GET', staffCookie);
    assert(staffCollections.status === 200, 'Staff collection access failed.');
    const collection = { title: `Content check ${suffix}`, slug, bannerUrl: sample.bannerUrl,
      subtitle: '', story: '', season: '', badge: '', lookbookUrls: [], themeColor: '#fff8ee',
      accentColor: '#d97706', sortOrder: 998, isActive: true, showInMenu: true, showOnHome: true };
    const created = await request('/api/admin/collections', 'POST', cookie, collection);
    assert(created.status === 201, `Collection create failed: ${created.status} ${created.data.error || ''}`);
    collectionId = created.data.id;
    let publicCollections = await request('/api/collections');
    assert(publicCollections.data.collections.some((item) => item.id === slug && item.showInMenu), 'New menu collection missing from public API.');
    assert(await waitForHomepage(collection.title), 'New collection missing from homepage.');
    const updated = await request(`/api/admin/collections/${collectionId}`, 'PATCH', cookie,
      { ...collection, showInMenu: false, showOnHome: false });
    assert(updated.status === 200, `Collection update failed: ${updated.status} ${updated.data.error || ''}`);
    publicCollections = await request('/api/collections');
    assert(publicCollections.data.collections.some((item) => item.id === slug && !item.showInMenu), 'Updated menu setting missing from public API.');
    assert(await waitForHomepage(collection.title, false), 'Hidden collection still appeared on homepage.');

    // Feedback dạng ảnh chụp màn hình: ảnh phải nằm trong thư viện, công bố cần khách đồng ý.
    const asset = await prisma.mediaAsset.findFirst({ orderBy: { createdAt: 'desc' } });
    assert(asset, 'A media library image is needed to create screenshot feedback.');
    const caption = `Content check ${suffix}`;
    const draft = { items: [{ imageUrl: asset.url, caption }], sortOrder: 0, consentConfirmed: false, isPublished: false };
    const invalid = await request('/api/admin/testimonials', 'POST', cookie, { ...draft, isPublished: true });
    assert(invalid.status === 400, 'A feedback without consent was published.');
    const outside = await request('/api/admin/testimonials', 'POST', cookie,
      { ...draft, items: [{ imageUrl: `https://res.cloudinary.com/demo/image/upload/${suffix}.png` }] });
    assert(outside.status === 400, 'Feedback accepted an image outside the media library.');
    const testimonial = await request('/api/admin/testimonials', 'POST', staffCookie, draft);
    assert(testimonial.status === 201 && testimonial.data.count === 1,
      `Feedback create failed: ${testimonial.status} ${testimonial.data.error || ''}`);
    testimonialId = (await prisma.customerTestimonial.findFirst({ where: { caption }, select: { id: true } }))?.id;
    assert(testimonialId, 'Created feedback not stored.');
    assert(await waitForHomepage(testimonialId, false), 'Unpublished feedback appeared on homepage.');
    const published = await request(`/api/admin/testimonials/${testimonialId}`, 'PATCH', staffCookie,
      { imageUrl: asset.url, caption, productId: '', sortOrder: 0, consentConfirmed: true, isPublished: true });
    assert(published.status === 200, `Feedback publish failed: ${published.status} ${published.data.error || ''}`);
    assert(await waitForHomepage(testimonialId), 'Published feedback missing from homepage story rail.');
    const album = await fetch(new URL('/feedback', base), { cache: 'no-store' }).then((response) => response.text());
    assert(album.includes(testimonialId), 'Published feedback missing from the /feedback album.');
    const inUse = await request(`/api/admin/media/${asset.id}`, 'DELETE', cookie);
    assert(inUse.status === 409 && /feedback/.test(inUse.data.error || ''), 'An image used by feedback could be deleted.');

    // Cấu hình nội dung website: admin sửa tiêu đề khối trang chủ và thấy thay đổi trên trang chủ.
    const siteContent = await request('/api/admin/site-content', 'GET', cookie);
    assert(siteContent.status === 200 && siteContent.data.content, 'Admin site content unavailable.');
    sectionsBefore = siteContent.data.content.home_sections;
    assert(sectionsBefore && sectionsBefore.collections, 'Home sections content is not seeded.');
    const marker = `Kiểm tra nội dung ${suffix}`;
    const updatedSections = await request('/api/admin/site-content/home_sections', 'PUT', cookie,
      { ...sectionsBefore, collections: { ...sectionsBefore.collections, eyebrow: marker } });
    assert(updatedSections.status === 200, `Site content update failed: ${updatedSections.status} ${updatedSections.data.error || ''}`);
    assert(await waitForHomepage(marker), 'Updated home section content missing from homepage.');
    const staffContent = await request('/api/admin/site-content', 'GET', staffCookie);
    assert(staffContent.status === 200, 'Staff site content access failed.');
    const anonymousContent = await request('/api/admin/site-content');
    assert(anonymousContent.status === 403, 'Site content administration allowed anonymous access.');
    const restored = await request('/api/admin/site-content/home_sections', 'PUT', cookie, sectionsBefore);
    assert(restored.status === 200, 'Failed to restore home section content.');
    sectionsBefore = undefined;

    console.log('Collection menu configuration, screenshot feedback publishing (story rail + album) and site content configuration verified through authenticated APIs and pages.');
  } finally {
    if (sectionsBefore && cookie) {
      await request('/api/admin/site-content/home_sections', 'PUT', cookie, sectionsBefore).catch(() => {});
    }
    if (testimonialId) {
      const deleted = staffCookie && await request(`/api/admin/testimonials/${testimonialId}`, 'DELETE', staffCookie);
      if (!deleted || deleted.status !== 200) await prisma.customerTestimonial.deleteMany({ where: { id: testimonialId } });
    }
    if (collectionId) {
      const deleted = cookie && await request(`/api/admin/collections/${collectionId}`, 'DELETE', cookie);
      if (!deleted || deleted.status !== 200 || deleted.data.archived) {
        await prisma.collection.deleteMany({ where: { id: collectionId } });
      }
    }
    if (accountIds.length) await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
