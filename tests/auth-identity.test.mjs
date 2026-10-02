import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLoginIdentifier } from '../src/lib/auth-identity.ts';
import { newPasswordProblem, normalizePhone, parseAccountProfile } from '../src/lib/account/account-input.ts';
import { areaOf, landingPath, pathInArea } from '../src/lib/admin/back-office.ts';

test('accepts a case insensitive username', () => {
  assert.deepEqual(parseLoginIdentifier(' SuperAdmin '), { username: 'superadmin' });
});

test('accepts an email address', () => {
  assert.deepEqual(parseLoginIdentifier(' MOTHER@EXAMPLE.COM '), { email: 'mother@example.com' });
});

test('rejects malformed identifiers', () => {
  assert.equal(parseLoginIdentifier('a'), null);
  assert.equal(parseLoginIdentifier('someone@'), null);
  assert.equal(parseLoginIdentifier('name with spaces'), null);
});

test('login only returns to pages inside the website', async () => {
  const { safeCallbackPath } = await import('../src/lib/auth-identity.ts');
  assert.equal(safeCallbackPath('/orders?tab=to-review'), '/orders?tab=to-review');
  assert.equal(safeCallbackPath('/products/vay-hoa#reviews'), '/products/vay-hoa#reviews');
  for (const unsafe of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/a b', '', null]) {
    assert.equal(safeCallbackPath(unsafe), null, `${unsafe} must be rejected`);
  }
});

test('staff always land in /staff and admins in /admin, whatever page sent them to the login form', () => {
  assert.equal(landingPath('staff', null), '/staff');
  assert.equal(landingPath('staff', '/admin/products'), '/staff/products');
  assert.equal(landingPath('staff', '/admin/orders?tab=CONFIRMED'), '/staff/orders?tab=CONFIRMED');
  for (const adminOnly of ['/admin', '/admin/', '/admin?range=7d', '/admin/exports', '/admin/staff', '/admin/customers']) {
    assert.equal(landingPath('staff', adminOnly), '/staff', adminOnly);
  }
  assert.equal(landingPath('staff', '/staff/feedback'), '/staff/feedback');
  assert.equal(landingPath('staff', '/'), '/staff');
  assert.equal(landingPath('staff', '/products/vay-hoa'), '/staff');
  assert.equal(landingPath('admin', null), '/admin');
  assert.equal(landingPath('admin', '/staff'), '/admin');
  assert.equal(landingPath('admin', '/staff/orders'), '/admin/orders');
  assert.equal(landingPath('admin', '/admin/settings'), '/admin/settings');
  assert.equal(landingPath('user', '/orders?tab=to-review'), '/orders?tab=to-review');
  assert.equal(landingPath('user', null), '/');
});

test('back-office areas are matched by whole path segments', () => {
  assert.equal(areaOf('/staff'), 'staff');
  assert.equal(areaOf('/admin/staff'), 'admin');
  assert.equal(areaOf('/staffing'), null);
  assert.equal(areaOf('/administrator'), null);
  assert.equal(pathInArea('admin', '/staff/account'), '/admin/account');
  assert.equal(pathInArea('staff', '/admin/account'), '/staff/account');
});

test('staff and admins edit their own profile with a login email and an optional Vietnamese mobile number', () => {
  assert.deepEqual(parseAccountProfile({ name: '  Lan   Anh ', email: ' Lan@Shop.VN ', phone: '+84 912 345 678' }),
    { name: 'Lan Anh', email: 'lan@shop.vn', phone: '0912345678' });
  assert.equal(parseAccountProfile({ name: 'Lan', email: 'lan@shop.vn', phone: '' }).phone, null);
  assert.equal(normalizePhone('0912.345.678'), '0912345678');
  for (const phone of ['0212345678', '091234567', '12345', 'abc']) {
    assert.throws(() => parseAccountProfile({ name: 'Lan', email: 'lan@shop.vn', phone }), /10 số/, phone);
  }
  assert.throws(() => parseAccountProfile({ name: 'Lan', email: '', phone: '' }), /Email/);
  assert.throws(() => parseAccountProfile({ name: 'L', email: 'lan@shop.vn' }), /Họ tên/);
  assert.throws(() => parseAccountProfile(['lan@shop.vn']));
});

test('a new password must be long enough and differ from the current one', () => {
  assert.equal(newPasswordProblem('mat-khau-moi-2026', 'mat-khau-cu-2025'), null);
  assert.equal(newPasswordProblem('8-ky-tu!', 'x'), null);
  assert.match(newPasswordProblem('7kytu!!', 'x'), /ít nhất 8/);
  assert.match(newPasswordProblem('x'.repeat(129)), /tối đa 128/);
  assert.match(newPasswordProblem('giong-het-mat-khau', 'giong-het-mat-khau'), /khác/);
  assert.match(newPasswordProblem(undefined), /ít nhất 8/);
});
