const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';

function cookies(response) {
  return response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
}

async function main() {
  for (const path of ['/', '/collections', '/sale', '/api/products', '/api/collections', '/login']) {
    const response = await fetch(new URL(path, base));
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    if (path === '/api/products') {
      const data = await response.json();
      if (!Number.isInteger(data.total) || data.total < 1 || data.products.length === 0) throw new Error('Product catalog is incomplete');
      console.log(`${path}: HTTP ${response.status}; total=${data.total}`);
    } else if (path === '/api/collections') {
      const data = await response.json();
      if (data.collections.length < 1) throw new Error('Collections are incomplete');
      console.log(`${path}: HTTP ${response.status}; total=${data.collections.length}`);
    } else {
      console.log(`${path}: HTTP ${response.status}`);
    }
  }

  for (const account of [
    { username: process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL, password: process.env.ADMIN_INITIAL_PASSWORD, role: 'admin' },
    { username: process.env.STAFF_USERNAME, password: process.env.STAFF_INITIAL_PASSWORD, role: 'staff' },
  ]) {
    if (!account.username || !account.password) continue;
    const csrfResponse = await fetch(new URL('/api/auth/csrf', base));
    const { csrfToken } = await csrfResponse.json();
    const body = new URLSearchParams({
      csrfToken, email: account.username, password: account.password,
      callbackUrl: new URL(account.role === 'admin' ? '/admin' : '/admin/products', base).toString(), json: 'true',
    });
    const loginResponse = await fetch(new URL('/api/auth/callback/credentials', base), {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookies(csrfResponse) }, body, redirect: 'manual',
    });
    const sessionCookies = [cookies(csrfResponse), cookies(loginResponse)].filter(Boolean).join('; ');
    const sessionResponse = await fetch(new URL('/api/auth/session', base), { headers: { cookie: sessionCookies } });
    const session = await sessionResponse.json();
    if (session?.user?.role !== account.role) throw new Error(`${account.role} login smoke test failed (HTTP ${loginResponse.status})`);
    if (account.role === 'admin') {
      const staffPage = await fetch(new URL('/admin/staff', base), { headers: { cookie: sessionCookies } });
      if (!staffPage.ok) throw new Error(`Admin staff page: HTTP ${staffPage.status}`);
    } else {
      const staffPage = await fetch(new URL('/admin/staff', base), { headers: { cookie: sessionCookies }, redirect: 'manual' });
      const usersApi = await fetch(new URL('/api/admin/users', base), { headers: { cookie: sessionCookies } });
      const staffHtml = await staffPage.text();
      if (staffHtml.includes('Thêm nhân viên') || usersApi.status !== 403) {
        throw new Error(`Staff access check failed: page=${staffPage.status}, api=${usersApi.status}, url=${staffPage.url}`);
      }
    }
    console.log(`${account.role} username login: OK`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
