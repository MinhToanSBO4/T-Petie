const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const cookie = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');

async function main() {
  const csrf = await fetch(new URL('/api/auth/csrf', base));
  const login = await fetch(new URL('/api/auth/callback/credentials', base), { method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie(csrf) },
    body: new URLSearchParams({ csrfToken: (await csrf.json()).csrfToken, email: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_INITIAL_PASSWORD, callbackUrl: new URL('/admin', base).toString(), json: 'true' }) });
  const sessionCookie = [cookie(csrf), cookie(login)].filter(Boolean).join('; ');
  for (const path of ['/admin', '/admin/orders', '/admin/settings']) {
    const samples = [];
    for (let i = 0; i < 2; i++) {
      const start = performance.now();
      const response = await fetch(new URL(path, base), { headers: { cookie: sessionCookie } });
      await response.arrayBuffer();
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      samples.push(Math.round(performance.now() - start));
    }
    console.log(`${path}: first ${samples[0]}ms, warm ${samples[1]}ms`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
