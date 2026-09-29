const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';

function cookies(response) {
  return response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
}

async function main() {
  for (const path of ['/', '/bo-suu-tap', '/sale', '/api/products', '/api/collections', '/dang-nhap']) {
    const response = await fetch(new URL(path, base));
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    if (path === '/api/products') {
      const data = await response.json();
      if (data.total !== 40 || data.products.length === 0) throw new Error('Product catalog is incomplete');
      console.log(`${path}: HTTP ${response.status}; total=${data.total}`);
    } else if (path === '/api/collections') {
      const data = await response.json();
      if (data.collections.length !== 4) throw new Error('Collections are incomplete');
      console.log(`${path}: HTTP ${response.status}; total=${data.collections.length}`);
    } else {
      console.log(`${path}: HTTP ${response.status}`);
    }
  }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_INITIAL_PASSWORD) return;
  const csrfResponse = await fetch(new URL('/api/auth/csrf', base));
  const { csrfToken } = await csrfResponse.json();
  const body = new URLSearchParams({
    csrfToken,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_INITIAL_PASSWORD,
    callbackUrl: new URL('/admin', base).toString(),
    json: 'true',
  });
  const loginResponse = await fetch(new URL('/api/auth/callback/credentials', base), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookies(csrfResponse) },
    body,
    redirect: 'manual',
  });
  const sessionCookies = [cookies(csrfResponse), cookies(loginResponse)].filter(Boolean).join('; ');
  const sessionResponse = await fetch(new URL('/api/auth/session', base), {
    headers: { cookie: sessionCookies },
  });
  const session = await sessionResponse.json();
  if (session?.user?.role !== 'admin') throw new Error(`Admin login smoke test failed (HTTP ${loginResponse.status})`);
  console.log('Admin credentials login: OK');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
