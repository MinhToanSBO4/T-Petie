import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { readMailConfig, normalizeEmail } from '../src/lib/email/config.ts';
import { renderEmail } from '../src/lib/email/templates.ts';
import { createAccountToken, tokenDigest, tokenPurpose, eligibleCustomer, requiresEmailVerification, tokenExpired } from '../src/lib/email/tokens.ts';
import { retryEmailJob } from '../src/lib/email/outbox-policy.ts';

const env = { SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'user', SMTP_PASSWORD: 'test-only', MAIL_FROM_ADDRESS: 'mail@example.com', MAIL_BRAND_NAME: 'Little & Co', MAIL_SITE_URL: 'https://shop.example.com' };
test('SMTP configuration requires credentials, safe origin and TLS mode', () => {
  assert.throws(() => readMailConfig({}), /SMTP_HOST/);
  assert.throws(() => readMailConfig({ ...env, MAIL_SITE_URL: 'javascript:alert(1)' }));
  assert.throws(() => readMailConfig({ ...env, SMTP_SECURE: 'maybe' }));
  assert.equal(readMailConfig(env).fromName, 'Little & Co · No-Reply');
  assert.equal(readMailConfig({ ...env, SMTP_PORT: '587', SMTP_SECURE: 'false' }).secure, false);
  // Tối thiểu 3 biến: cổng 465/SSL, địa chỉ gửi = SMTP_USER, liên kết theo NEXTAUTH_URL.
  const minimal = readMailConfig({ SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'Shop@Gmail.com', SMTP_PASSWORD: 'abcd efgh ijkl mnop', NEXTAUTH_URL: 'https://shop.example.com' });
  assert.deepEqual([minimal.port, minimal.secure, minimal.fromAddress, minimal.password, minimal.siteUrl],
    [465, true, 'shop@gmail.com', 'abcdefghijklmnop', 'https://shop.example.com']);
  assert.equal(normalizeEmail(' A@Example.COM '), 'a@example.com');
  assert.equal(normalizeEmail('a@example.com\r\nBcc: x@y.com'), null);
});
test('account tokens are random, hashed, isolated by purpose and expire at boundary', () => {
  const first = createAccountToken();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, createAccountToken());
  assert.notEqual(tokenDigest(first), first);
  assert.equal(tokenPurpose('verify:u1', 'reset'), null);
  assert.equal(tokenPurpose('verify:u1', 'verify'), 'u1');
  assert.equal(tokenExpired(new Date(1000), new Date(1000)), true);
  assert.equal(tokenExpired(new Date(1001), new Date(1000)), false);
});
test('only active customers recover and legacy or privileged users keep existing access', () => {
  assert.equal(eligibleCustomer({ role: 'admin', status: 'active', deletedAt: null }), false);
  assert.equal(eligibleCustomer({ role: 'user', status: 'blocked', deletedAt: null }), false);
  assert.equal(eligibleCustomer({ role: 'user', status: 'active', deletedAt: new Date() }), false);
  assert.equal(eligibleCustomer({ role: 'user', status: 'active', deletedAt: null }), true);
  assert.equal(requiresEmailVerification({ role: 'user', emailVerificationRequired: false, emailVerified: null }), false);
  assert.equal(requiresEmailVerification({ role: 'admin', emailVerificationRequired: true, emailVerified: null }), false);
  assert.equal(requiresEmailVerification({ role: 'user', emailVerificationRequired: true, emailVerified: null }), true);
});
test('security emails escape HTML and provide matching text and expiration', () => {
  const config = readMailConfig(env);
  const result = renderEmail(config, { kind: 'verification', name: '<script>bad</script>', token: 'a'.repeat(64) });
  assert.ok(result.html.includes('&lt;script&gt;'));
  assert.ok(!result.html.includes('<script>'));
  assert.ok(result.html.includes('Little &amp; Co'));
  assert.ok(result.text.includes('24 giờ'));
  assert.ok(result.text.includes('https://shop.example.com/verify-email?token='));
  assert.ok(renderEmail(config, { kind: 'reset', token: 'b'.repeat(64) }).text.includes('30 phút'));
});
test('order mail includes VND totals, item sizes and tracking without phone in URLs', () => {
  const result = renderEmail(readMailConfig(env), { kind: 'receipt', orderCode: 'TP-123', name: 'Mẹ', status: 'PENDING', date: '2026-10-02T15:00:00Z', address: 'Hà Nội', items: [{ name: '<Áo>', size: '2', quantity: 2, unitPrice: 100000, totalPrice: 200000 }], subtotal: 200000, shippingFee: 25000, discount: 10000, total: 215000, registered: false });
  assert.ok(result.html.includes('&lt;Áo&gt;'));
  assert.match(result.text, /215[.\s]000/);
  assert.ok(result.text.includes('Size 2'));
  assert.ok(result.text.includes('/order-lookup'));
  assert.ok(!result.text.includes('?phone='));
});
test('failed emails back off and stop after the fifth attempt', () => {
  assert.deepEqual(retryEmailJob(1, 0), { status: 'pending', nextAttemptAt: new Date(30_000) });
  assert.deepEqual(retryEmailJob(2, 0), { status: 'pending', nextAttemptAt: new Date(120_000) });
  assert.deepEqual(retryEmailJob(4, 0), { status: 'pending', nextAttemptAt: new Date(3_600_000) });
  assert.equal(retryEmailJob(5, 0).status, 'failed');
});
test('rendered Clarity bootstrap skips security pages and still runs on the storefront', () => {
  const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
  const template = layout.match(/\{`([\s\S]*?)`\}/)[1];
  const script = vm.runInNewContext('`' + template + '`', { clarityId: 'test-project' });
  for (const [pathname, expected] of [['/verify-email', 0], ['/reset-password', 0], ['/forgot-password', 0], ['/', 1]]) {
    let inserted = 0;
    vm.runInNewContext(script, { window: {}, document: { location: { pathname }, createElement: () => ({}),
      getElementsByTagName: () => [{ parentNode: { insertBefore: () => { inserted++; } } }] } });
    assert.equal(inserted, expected);
  }
});
