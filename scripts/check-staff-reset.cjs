const { loadEnvConfig } = require('@next/env');
const { loginCredentials } = require('./lib/test-login.cjs');
loadEnvConfig(process.cwd());

const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const cookie = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');

async function main() {
  const adminLogin = await loginCredentials('admin');
  const staffAccount = await loginCredentials('staff');
  const csrfResponse = await fetch(new URL('/api/auth/csrf', base));
  const { csrfToken } = await csrfResponse.json();
  const login = await fetch(new URL('/api/auth/callback/credentials', base), {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie(csrfResponse) },
    body: new URLSearchParams({ csrfToken, email: adminLogin.username, password: adminLogin.password, callbackUrl: new URL('/admin', base).toString(), json: 'true' }),
  });
  const sessionCookie = [cookie(csrfResponse), cookie(login)].filter(Boolean).join('; ');
  const usersResponse = await fetch(new URL('/api/admin/users', base), { headers: { cookie: sessionCookie } });
  if (!usersResponse.ok) throw new Error(`Admin user listing failed: HTTP ${usersResponse.status}`);
  const users = await usersResponse.json();
  const staff = (users.items || users.users || []).find((user) => user.username === staffAccount.username);
  if (!staff) throw new Error('Sample staff account was not found');
  const staffCsrf = await fetch(new URL('/api/auth/csrf', base));
  const staffLogin = await fetch(new URL('/api/auth/callback/credentials', base), {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie(staffCsrf) },
    body: new URLSearchParams({ csrfToken: (await staffCsrf.json()).csrfToken, email: staffAccount.username, password: staffAccount.password, callbackUrl: new URL('/', base).toString(), json: 'true' }),
  });
  const staffCookie = [cookie(staffCsrf), cookie(staffLogin)].filter(Boolean).join('; ');
  const before = await fetch(new URL('/api/auth/session', base), { headers: { cookie: staffCookie } });
  if ((await before.json()).user?.status !== 'active') throw new Error('Staff baseline session was not active');
  let didReset = false;
  try {
    const reset = await fetch(new URL(`/api/admin/users/${staff.id}`, base), {
      method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sessionCookie, origin: base },
      body: JSON.stringify({ resetPassword: true }),
    });
    const result = await reset.json();
    if (!reset.ok || !result.temporaryPassword) throw new Error(`Reset failed: HTTP ${reset.status} ${result.error || ''}`);
    didReset = true;
    const after = await fetch(new URL('/api/auth/session', base), { headers: { cookie: staffCookie } });
    if ((await after.json()).user?.status !== 'blocked') throw new Error('Old staff session was not invalidated');
    console.log('One-click reset: HTTP 200; previous staff session blocked');
  } finally {
    if (didReset) {
      const restore = await fetch(new URL(`/api/admin/users/${staff.id}`, base), {
        method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sessionCookie, origin: base },
        body: JSON.stringify({ password: staffAccount.password }),
      });
      if (!restore.ok) throw new Error(`Could not restore sample staff password: HTTP ${restore.status}`);
      console.log('Sample staff password restored');
    }
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
