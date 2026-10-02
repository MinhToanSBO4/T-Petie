const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
loadEnvConfig(process.cwd());

async function main() {
  const schema = `smtp_test_${randomBytes(6).toString('hex')}`;
  assert.match(schema, /^smtp_test_[a-f0-9]{12}$/);
  const admin = new PrismaClient();
  let db;
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const connection = new URL(process.env.CONNECTION_STRING);
    const direct = new URL(process.env.DIRECT_URL || process.env.CONNECTION_STRING);
    connection.searchParams.set('schema', schema); direct.searchParams.set('schema', schema);
    process.env.CONNECTION_STRING = connection.href; process.env.DIRECT_URL = direct.href;
    const migration = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { env: process.env, encoding: 'utf8' });
    assert.equal(migration.status, 0, 'Isolated schema migrations failed');
    require('../tests/helpers/server-loader.cjs');
    db = require('../src/server/db/client.ts').prisma;
    const transport = require('../src/server/email/transport.ts');
    const mails = [];
    transport.sendEmail = async (to, payload) => { mails.push({ to, payload }); };
    const tokens = require('../src/server/auth/email-tokens.ts');
    // Liên kết mới chỉ được phát hành sau thời gian chờ gửi lại: lùi thời điểm phát hành của liên kết hiện có.
    const skipCooldown = (purpose, id) => db.verificationToken.updateMany({ where: { identifier: `${purpose}:${id}` },
      data: { expires: new Date(Date.now() + tokens.TOKEN_TTL_MINUTES[purpose] * 60_000 - (tokens.RESEND_COOLDOWN_SECONDS + 1) * 1000) } });
    const settle = () => new Promise((resolve) => setTimeout(resolve, 100));
    const { tokenDigest } = require('../src/lib/email/tokens.ts');
    const { credentialFingerprint } = require('../src/server/security/password-reset.ts');
    const outbox = require('../src/server/email/outbox.ts');
    outbox.scheduleEmailDispatch = () => {};
    const orders = require('../src/server/orders/order-status.ts');
    const { createOrder } = require('../src/server/orders/create-order.ts');
    const bcrypt = require('bcryptjs');
    const user = await db.user.create({ data: { email: 'customer@example.invalid', role: 'user', password: await bcrypt.hash('old-password-123', 12), emailVerificationRequired: true } });
    assert.deepEqual(await tokens.issueAccountEmail({ email: user.email }, 'verify'), { status: 'queued' });
    const first = mails.at(-1).payload.token;
    const stored = await db.verificationToken.findUnique({ where: { token: tokenDigest(first) } });
    assert.ok(stored); assert.notEqual(stored.token, first);
    const blockedByCooldown = await tokens.issueAccountEmail({ email: user.email }, 'verify');
    assert.equal(blockedByCooldown.status, 'cooldown'); assert.ok(blockedByCooldown.retryAfter > 0 && blockedByCooldown.retryAfter <= 60);
    await skipCooldown('verify', user.id);
    await tokens.issueAccountEmail({ id: user.id }, 'verify');
    const replacement = mails.at(-1).payload.token;
    await assert.rejects(tokens.consumeAccountToken(first, 'verify'), tokens.InvalidAccountToken);
    await assert.rejects(tokens.consumeAccountToken(replacement, 'reset', 'new-password-123'), tokens.InvalidAccountToken);
    const race = await Promise.allSettled([tokens.consumeAccountToken(replacement, 'verify'), tokens.consumeAccountToken(replacement, 'verify')]);
    assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
    assert.ok((await db.user.findUnique({ where: { id: user.id } })).emailVerified);
    await assert.rejects(tokens.consumeAccountToken(replacement, 'verify'), tokens.InvalidAccountToken);
    console.log('PASS: hashed token storage, resend cooldown, replacement, purpose isolation, concurrent consumption and reuse');

    await tokens.issueAccountEmail({ email: user.email }, 'reset');
    let reset = mails.at(-1).payload.token;
    await db.verificationToken.update({ where: { token: tokenDigest(reset) }, data: { expires: new Date(0) } });
    await assert.rejects(tokens.consumeAccountToken(reset, 'reset', 'new-password-123'), tokens.InvalidAccountToken);
    await skipCooldown('reset', user.id);
    await tokens.issueAccountEmail({ email: user.email }, 'reset'); reset = mails.at(-1).payload.token;
    const before = credentialFingerprint(user.password, 'test-secret');
    await tokens.consumeAccountToken(reset, 'reset', 'new-password-123');
    const updated = await db.user.findUnique({ where: { id: user.id } });
    assert.ok(await bcrypt.compare('new-password-123', updated.password));
    assert.notEqual(before, credentialFingerprint(updated.password, 'test-secret'));
    await assert.rejects(tokens.consumeAccountToken(reset, 'reset', 'new-password-123'), tokens.InvalidAccountToken);
    const staff = await db.user.create({ data: { email: 'staff@example.invalid', role: 'admin' } });
    const blocked = await db.user.create({ data: { email: 'blocked@example.invalid', status: 'blocked' } });
    assert.deepEqual(await tokens.issueAccountEmail({ email: staff.email }, 'reset'), { status: 'skipped' });
    assert.deepEqual(await tokens.issueAccountEmail({ email: blocked.email }, 'reset'), { status: 'skipped' });
    assert.deepEqual(await tokens.issueAccountEmail({ email: 'unknown@example.invalid' }, 'reset'), { status: 'skipped' });
    console.log('PASS: expiry, password reset/session invalidation and privileged/blocked restrictions');

    const { POST } = require('../src/app/api/auth/email/[action]/route.ts');
    const request = (email, action = 'forgot', origin = 'http://localhost:3000') => POST(new Request(`http://localhost:3000/api/auth/email/${action}`, { method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.12' }, body: JSON.stringify({ email }) }), { params: { action } });
    const known = await request(user.email), unknown = await request('missing@example.invalid'), privileged = await request(staff.email);
    assert.equal(known.status, unknown.status); assert.equal(known.status, privileged.status);
    assert.deepEqual(await known.json(), await unknown.json());
    assert.equal((await request(user.email, 'forgot', 'https://evil.example')).status, 403);
    for (let i = 0; i < 4; i++) await request(user.email);
    const limited = await request(user.email);
    assert.equal(limited.status, 429); assert.ok((await limited.json()).retryAfter > 0);
    console.log('PASS: indistinguishable public recovery response, origin and per-email rate limits');

    const authorize = require('../src/server/auth/options.ts').authOptions.providers.find((p) => p.id === 'credentials').options.authorize;
    const login = (email, password) => authorize({ email, password }, { headers: { 'x-forwarded-for': '192.0.2.22' } });
    const register = require('../src/app/api/auth/register/route.ts').POST;
    const signup = (email) => register(new Request('http://localhost:3000/api/auth/register', { method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'New customer', email, password: 'strong-password-123' }) }));
    assert.equal((await signup('bad<@example.com')).status, 400);
    transport.sendEmail = async () => { throw Object.assign(new Error('Fake SMTP outage'), { code: 'EAUTH' }); };
    const started = Date.now();
    const registration = await signup('new@example.invalid');
    assert.equal(registration.status, 201);
    assert.ok(Date.now() - started < 5000, 'Registration must not wait for SMTP');
    await settle();
    const newcomer = await db.user.findUnique({ where: { email: 'new@example.invalid' } });
    // Gửi thất bại hẳn (EAUTH không thử lại): liên kết bị hủy nên khách bấm gửi lại được ngay, không phải chờ.
    assert.equal(await db.verificationToken.count({ where: { identifier: `verify:${newcomer.id}` } }), 0);
    // Chưa xác thực vẫn đăng nhập được; đặt hàng bị chặn ở api/checkout.
    assert.ok(await login('new@example.invalid', 'strong-password-123'));
    assert.equal(await login('new@example.invalid', 'wrong-password'), null);
    assert.deepEqual(await tokens.emailVerificationState(newcomer.id), { email: 'new@example.invalid', verified: false });
    transport.sendEmail = async (to, payload) => { mails.push({ to, payload }); };
    assert.deepEqual(await tokens.issueAccountEmail({ email: 'new@example.invalid' }, 'verify'), { status: 'queued' });
    await tokens.consumeAccountToken(mails.at(-1).payload.token, 'verify');
    assert.equal((await tokens.emailVerificationState(newcomer.id)).verified, true);
    const legacy = await db.user.create({ data: { email: 'legacy@example.invalid', password: await bcrypt.hash('legacy-password-123', 12) } });
    assert.ok(await login(legacy.email, 'legacy-password-123'));
    const googleOnly = await db.user.create({ data: { email: 'google@example.invalid', emailVerified: new Date() } });
    await tokens.issueAccountEmail({ email: googleOnly.email }, 'reset');
    await tokens.consumeAccountToken(mails.at(-1).payload.token, 'reset', 'google-password-123');
    assert.ok(await login(googleOnly.email, 'google-password-123'));
    console.log('PASS: registration never waits for SMTP, failed link is released, unverified login allowed, legacy access and Google-only password setup');

    const { verifyByGoogleSignIn } = require('../src/server/auth/google-link.ts');
    const idToken = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
    const linked = await db.user.create({ data: { email: 'linked@example.invalid', role: 'user', emailVerificationRequired: true } });
    await tokens.issueAccountEmail({ id: linked.id }, 'verify');
    assert.equal(await verifyByGoogleSignIn(linked.id, idToken({ email: 'linked@example.invalid', email_verified: false })), null);
    assert.equal(await verifyByGoogleSignIn(linked.id, idToken({ email: 'other@example.invalid', email_verified: true })), null);
    assert.equal((await tokens.emailVerificationState(linked.id)).verified, false);
    assert.deepEqual(await verifyByGoogleSignIn(linked.id, idToken({ email: 'Linked@example.invalid', email_verified: true })), { passwordRemoved: false });
    assert.equal((await tokens.emailVerificationState(linked.id)).verified, true);
    assert.equal(await db.verificationToken.count({ where: { identifier: `verify:${linked.id}` } }), 0);
    assert.equal(await verifyByGoogleSignIn(linked.id, idToken({ email: 'linked@example.invalid', email_verified: true })), null);
    console.log('PASS: Google sign-in verifies a linked account only for the same Google-verified email');

    const product = await db.product.create({ data: { sku: 'SMTP-TEST', slug: 'smtp-test', name: 'Áo <test>', basePrice: 100000n,
      variants: { create: { sku: 'SMTP-TEST-2', size: '2', price: 100000n, stock: 10 } } }, include: { variants: true } });
    await db.commerceSetting.upsert({ where: { id: 'default' }, create: { id: 'default', shippingFee: 25000n, freeShippingThreshold: 500000n }, update: { shippingFee: 25000n, freeShippingThreshold: 500000n } });
    const input = { fullName: 'Mẹ thử', phone: '0900000000', address: '12 Test', city: 'Hà Nội', district: 'Test', email: user.email,
      items: [{ productId: product.id, selectedSize: '2', quantity: 1 }] };
    const receipt = await createOrder(input, user.id, 'test-idempotency-key-12345');
    await createOrder(input, user.id, 'test-idempotency-key-12345');
    assert.equal(await db.emailJob.count(), 1);
    assert.equal((await db.productVariant.findUnique({ where: { id: product.variants[0].id } })).stock, 9);
    await assert.rejects(db.$transaction(async (tx) => {
      const fake = await tx.order.create({ data: { orderCode: 'ROLLBACK', customerName: 'Test', customerPhone: '0900000000', customerEmail: user.email, shippingAddress: 'Test', city: 'Test', district: 'Test', subtotal: 0n, totalAmount: 0n } });
      await outbox.enqueueOrderEmail(tx, fake.id, `receipt:${fake.id}`, 'receipt', 'PENDING');
      throw new Error('Intentional rollback');
    }));
    assert.equal(await db.order.count({ where: { orderCode: 'ROLLBACK' } }), 0);
    assert.equal(await db.emailJob.count(), 1);
    const seen = [];
    const deliver = async (_to, _payload, id) => { seen.push(id); await new Promise((r) => setTimeout(r, 30)); };
    await Promise.all([outbox.dispatchEmailJobs(1, deliver), outbox.dispatchEmailJobs(1, deliver)]);
    assert.equal(seen.length, 1); assert.equal(await db.emailJob.count({ where: { status: 'sent' } }), 1);
    console.log('PASS: checkout idempotency, transactional rollback and concurrent outbox claims');

    await orders.bulkChangeOrderStatus([receipt.orderId], 'SHIPPING', { actor: 'admin', jump: true });
    let job = await db.emailJob.findFirst({ where: { kind: 'status' } });
    assert.equal(job.payload.status, 'SHIPPING'); assert.ok(job.nextAttemptAt > new Date());
    assert.equal(await db.emailJob.count({ where: { kind: 'status' } }), 1);
    await orders.undoOrderStatus(receipt.orderId, 'SHIPPING', 'PENDING');
    assert.equal((await db.emailJob.findUnique({ where: { id: job.id } })).status, 'cancelled');
    await orders.changeOrderStatus(receipt.orderId, 'SHIPPING', { actor: 'admin', jump: true });
    job = await db.emailJob.findFirst({ where: { status: 'pending' } });
    await db.emailJob.update({ where: { id: job.id }, data: { nextAttemptAt: new Date(0) } });
    await outbox.dispatchEmailJobs(1, async () => { throw Object.assign(new Error('secret must not persist'), { code: 'EAUTH' }); });
    const failed = await db.emailJob.findUnique({ where: { id: job.id } });
    assert.equal(failed.status, 'pending'); assert.equal(failed.errorCode, 'EAUTH'); assert.equal(failed.attempts, 1);
    await db.emailJob.update({ where: { id: job.id }, data: { status: 'processing', leaseUntil: new Date(0), leaseOwner: 'dead-worker' } });
    await outbox.dispatchEmailJobs(1, deliver);
    assert.equal((await db.emailJob.findUnique({ where: { id: job.id } })).status, 'sent');
    await orders.undoOrderStatus(receipt.orderId, 'SHIPPING', 'PENDING');
    assert.equal(await db.emailJob.count({ where: { eventKey: `undo:${job.eventId}` } }), 1);
    console.log('PASS: final-state jump/bulk mail, undo cancellation/correction, sanitized SMTP failure and lease recovery');

    // A claimed send may still be in flight during undo. It must cause a delayed correction.
    await db.emailJob.updateMany({ where: { status: 'pending' }, data: { status: 'cancelled' } });
    await orders.changeOrderStatus(receipt.orderId, 'SHIPPING', { actor: 'admin', jump: true });
    const inFlight = await db.emailJob.findFirst({ where: { status: 'pending' } });
    await db.emailJob.update({ where: { id: inFlight.id }, data: { nextAttemptAt: new Date(0) } });
    let signal, finishSend;
    const sending = new Promise((resolve) => { signal = resolve; });
    const release = new Promise((resolve) => { finishSend = resolve; });
    const worker = outbox.dispatchEmailJobs(1, async () => { signal(); await release; });
    await sending;
    await orders.undoOrderStatus(receipt.orderId, 'SHIPPING', 'PENDING');
    const correction = await db.emailJob.findUnique({ where: { eventKey: `undo:${inFlight.eventId}` } });
    assert.ok(correction); assert.ok(correction.nextAttemptAt > new Date());
    finishSend(); await worker;
    assert.equal((await db.emailJob.findUnique({ where: { id: inFlight.id } })).status, 'cancelled');
    assert.equal(await outbox.dispatchEmailJobs(1, deliver, Date.now() + 1000), 0);
    console.log('PASS: undo during live send enqueues ordered correction; exhausted runtime budget claims no new job');

    // Auto-complete only our isolated order and preserve atomic event enqueue.
    await orders.changeOrderStatus(receipt.orderId, 'SHIPPING', { actor: 'system', jump: true });
    const order = await db.order.findUnique({ where: { orderCode: receipt.orderId } });
    await db.orderStatusEvent.updateMany({ where: { orderId: order.id, status: 'SHIPPING' }, data: { createdAt: new Date(Date.now() - 10 * 86400000) } });
    assert.equal(await orders.autoCompleteShippedOrders(new Date(), { force: true }), 1);
    assert.equal(await db.emailJob.count({ where: { orderId: order.id, payload: { path: ['status'], equals: 'COMPLETED' } } }), 1);
    await db.emailJob.updateMany({ where: { status: 'pending' }, data: { status: 'cancelled' } });
    const exhaust = await db.emailJob.create({ data: { eventKey: 'exhaust', orderId: order.id, recipient: user.email, kind: 'status', payload: job.payload } });
    for (let i = 0; i < 6; i++) {
      await db.emailJob.update({ where: { id: exhaust.id }, data: { nextAttemptAt: new Date(0) } });
      await outbox.dispatchEmailJobs(1, async () => { throw new Error('SMTP unavailable'); });
    }
    const exhausted = await db.emailJob.findUnique({ where: { id: exhaust.id } });
    assert.equal(exhausted.status, 'failed'); assert.equal(exhausted.attempts, 5);
    console.log('PASS: auto-completion enqueue and maximum five delivery attempts');

    assert.deepEqual((await db.emailJob.findFirst({ where: { status: 'sent' } })).payload, {});
    assert.deepEqual(exhausted.payload, {});
    const queued = await db.emailJob.create({ data: { eventKey: 'forget-me', orderId: order.id, recipient: user.email, kind: 'status', payload: { status: 'SHIPPING' } } });
    await db.$transaction((tx) => outbox.forgetUserEmailJobs(tx, user.id));
    const forgotten = await db.emailJob.findUnique({ where: { id: queued.id } });
    assert.equal(forgotten.status, 'cancelled'); assert.equal(forgotten.recipient, 'redacted'); assert.deepEqual(forgotten.payload, {});
    assert.equal(await db.emailJob.count({ where: { orderId: order.id, recipient: { not: 'redacted' } } }), 0);
    await db.emailJob.update({ where: { id: queued.id }, data: { status: 'pending', createdAt: new Date(Date.now() - 4 * 86400000) } });
    assert.equal((await outbox.purgeEmailJobs()).expired, 1);
    assert.equal((await db.emailJob.findUnique({ where: { id: queued.id } })).errorCode, 'EXPIRED');
    console.log('PASS: payload cleared after delivery, deleted-account redaction and stale-job expiry');
    console.log('Email flow checks passed. No real emails sent.');
  } finally {
    await db?.$disconnect();
    // The exact isolated schema is generated above and validated before any SQL identifier interpolation.
    assert.match(schema, /^smtp_test_[a-f0-9]{12}$/);
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
  }
}
main().catch((error) => { console.error('Email flow checks failed:', error instanceof assert.AssertionError ? error.message : error.code || error.name); process.exitCode = 1; });
