import test from 'node:test';
import assert from 'node:assert/strict';
import {
  googleLinkUpdate, googleNoticeKind, googleSignInVerdict, verifiedEmailFromIdToken,
} from '../src/lib/auth-google.ts';
import { authErrorMessage } from '../src/lib/auth-errors.ts';

const customer = { id: 'user-1', role: 'user', status: 'active' };

function idToken(claims) {
  const part = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'RS256' })}.${part(claims)}.signature`;
}

test('a Google email that matches a password customer is linked instead of failing with OAuthAccountNotLinked', () => {
  assert.equal(googleSignInVerdict({ emailVerified: true, stored: customer, userId: 'google-sub-123' }), 'link');
  assert.equal(googleSignInVerdict({ emailVerified: true, stored: null, userId: 'google-sub-123' }), 'allow');
  assert.equal(googleSignInVerdict({ emailVerified: true, stored: customer, userId: 'user-1' }), 'allow');
});

test('unverified Google emails and blocked accounts are refused', () => {
  for (const emailVerified of [false, undefined, 'true']) {
    assert.equal(googleSignInVerdict({ emailVerified, stored: null, userId: 'sub' }), 'deny', String(emailVerified));
  }
  assert.equal(googleSignInVerdict({ emailVerified: true, stored: { ...customer, status: 'blocked' }, userId: 'sub' }), 'deny');
  assert.equal(googleSignInVerdict({ emailVerified: true, stored: { ...customer, status: 'blocked' }, userId: 'user-1' }), 'deny');
});

test('admin and staff accounts are never linked by email; they keep signing in with a password', () => {
  for (const role of ['admin', 'staff']) {
    assert.equal(googleSignInVerdict({ emailVerified: true, stored: { ...customer, role }, userId: 'sub' }), 'staff-password-only');
    // Đã liên kết từ trước (ví dụ khách được nâng lên nhân viên) thì vẫn đăng nhập Google như cũ.
    assert.equal(googleSignInVerdict({ emailVerified: true, stored: { ...customer, role }, userId: 'user-1' }), 'allow');
  }
  assert.match(authErrorMessage('GoogleStaffAccount'), /mật khẩu/);
  assert.match(authErrorMessage('OAuthAccountNotLinked'), /Đăng nhập với Google/);
});

test('the verified email is read from the Google ID token', () => {
  assert.equal(verifiedEmailFromIdToken(idToken({ email: 'Me.Be@Gmail.com', email_verified: true, name: 'Nguyễn Thị Lan' })), 'me.be@gmail.com');
  assert.equal(verifiedEmailFromIdToken(idToken({ email: 'me@gmail.com', email_verified: false })), null);
  assert.equal(verifiedEmailFromIdToken(idToken({ email_verified: true })), null);
  for (const broken of [undefined, null, 42, '', 'not-a-token', 'a.%%%.c']) {
    assert.equal(verifiedEmailFromIdToken(broken), null, String(broken));
  }
});

test('linking removes a password set before anyone proved the email, and marks the email verified', () => {
  const now = new Date('2026-10-02T08:00:00Z');
  const preRegistered = { email: 'me@gmail.com', emailVerified: null, password: '$2a$12$hash' };
  assert.deepEqual(googleLinkUpdate(preRegistered, 'me@gmail.com', now), { emailVerified: now, password: null });
  assert.deepEqual(googleLinkUpdate({ ...preRegistered, email: 'Me@Gmail.com ' }, 'me@gmail.com', now), { emailVerified: now, password: null });
  // Tài khoản mới tạo từ Google: không có mật khẩu, chỉ ghi nhận email đã xác minh.
  assert.deepEqual(googleLinkUpdate({ ...preRegistered, password: null }, 'me@gmail.com', now), { emailVerified: now });
  // Email đã xác minh từ trước: mật khẩu do chính chủ đặt, giữ nguyên.
  assert.equal(googleLinkUpdate({ ...preRegistered, emailVerified: new Date('2026-01-01') }, 'me@gmail.com', now), null);
  // Gắn Google khi đang đăng nhập một tài khoản khác email: Google không chứng minh được email của tài khoản đó.
  assert.equal(googleLinkUpdate({ ...preRegistered, email: 'other@shop.vn' }, 'me@gmail.com', now), null);
  assert.equal(googleLinkUpdate(preRegistered, null, now), null);
  assert.equal(googleLinkUpdate({ ...preRegistered, email: null }, 'me@gmail.com', now), null);
});

test('the notice after a Google sign-in tells the customer what happened to the account', () => {
  assert.equal(googleNoticeKind({ linked: true, passwordRemoved: true, isNewUser: true }), 'google-linked-password-removed');
  assert.equal(googleNoticeKind({ linked: true, passwordRemoved: false, isNewUser: true }), 'google-linked');
  assert.equal(googleNoticeKind({ linked: false, passwordRemoved: false, isNewUser: true }), 'google-signed-up');
  assert.equal(googleNoticeKind({ linked: false, passwordRemoved: false, isNewUser: false }), 'google-signed-in');
  assert.equal(googleNoticeKind({ linked: false, passwordRemoved: false, isNewUser: undefined }), 'google-signed-in');
});
