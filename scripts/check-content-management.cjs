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

async function main() {
  const suffix = Date.now().toString(36);
  const slug = `content-check-${suffix}`;
  const quote = `Content management verification ${suffix}: service was excellent and the clothes fit beautifully.`;
  let collectionId; let testimonialId; let cookie; let staffCookie; const accountIds = [];
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
    assert(initial.status === 200 && Array.isArray(initial.data.collections), 'Admin collections unavailable.');
    const sample = initial.data.collections.find((item) => item.bannerUrl);
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
    let homepage = await fetch(base, { cache: 'no-store' }).then((response) => response.text());
    assert(homepage.includes(collection.title), 'New collection missing from homepage.');
    const updated = await request(`/api/admin/collections/${collectionId}`, 'PATCH', cookie,
      { ...collection, showInMenu: false, showOnHome: false });
    assert(updated.status === 200, `Collection update failed: ${updated.status} ${updated.data.error || ''}`);
    publicCollections = await request('/api/collections');
    assert(publicCollections.data.collections.some((item) => item.id === slug && !item.showInMenu), 'Updated menu setting missing from public API.');
    homepage = await fetch(base, { cache: 'no-store' }).then((response) => response.text());
    assert(!homepage.includes(collection.title), 'Hidden collection still appeared on homepage.');

    const draft = { customerName: 'Content check', quote, location: '', rating: 5, sortOrder: 998,
      consentConfirmed: false, isPublished: false };
    const invalid = await request('/api/admin/testimonials', 'POST', cookie, { ...draft, isPublished: true });
    assert(invalid.status === 400, 'A testimonial without consent was published.');
    const testimonial = await request('/api/admin/testimonials', 'POST', staffCookie, draft);
    assert(testimonial.status === 201, `Testimonial create failed: ${testimonial.status} ${testimonial.data.error || ''}`);
    testimonialId = testimonial.data.id;
    homepage = await fetch(base, { cache: 'no-store' }).then((response) => response.text());
    assert(!homepage.includes(quote), 'Unpublished testimonial appeared on homepage.');
    const published = await request(`/api/admin/testimonials/${testimonialId}`, 'PATCH', staffCookie,
      { ...draft, consentConfirmed: true, isPublished: true });
    assert(published.status === 200, `Testimonial publish failed: ${published.status} ${published.data.error || ''}`);
    homepage = await fetch(base, { cache: 'no-store' }).then((response) => response.text());
    assert(homepage.includes(quote), 'Published testimonial missing from homepage.');

    console.log('Collection menu configuration and testimonial publishing verified through authenticated APIs and homepage.');
  } finally {
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
