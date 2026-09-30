const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('node:crypto');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const cookie = (response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');

async function main() {
  const email = `local-check-${randomBytes(5).toString('hex')}@example.invalid`;
  const password = randomBytes(18).toString('base64url');
  let created = false;
  try {
    const register = await fetch(new URL('/api/auth/register', base), { method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: base },
      body: JSON.stringify({ name: 'Khách kiểm thử', email, password }) });
    const result = await register.json();
    if (register.status !== 201) throw new Error(`Registration failed: HTTP ${register.status} ${result.error || ''}`);
    created = true;
    const csrf = await fetch(new URL('/api/auth/csrf', base));
    const login = await fetch(new URL('/api/auth/callback/credentials', base), { method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie(csrf) },
      body: new URLSearchParams({ csrfToken: (await csrf.json()).csrfToken, email, password,
        callbackUrl: new URL('/dashboard', base).toString(), json: 'true' }) });
    const sessionCookie = [cookie(csrf), cookie(login)].filter(Boolean).join('; ');
    const session = await fetch(new URL('/api/auth/session', base), { headers: { cookie: sessionCookie } });
    const before = await session.json();
    if (before.user?.role !== 'user' || before.user?.points !== 0) throw new Error('Customer session or initial points invalid');
    const profile = await fetch(new URL('/api/user/profile', base), { method: 'PATCH',
      headers: { 'Content-Type': 'application/json', cookie: sessionCookie, origin: base },
      body: JSON.stringify({ babyProfile: { name: 'Bé An', birthDate: '2024-01-02', weight: 11, height: 80,
        gender: 'girl', recommendedSize: 'Size 2' } }) });
    if (!profile.ok) throw new Error(`Baby profile save failed: HTTP ${profile.status}`);
    const refreshed = await fetch(new URL('/api/auth/session', base), { headers: { cookie: sessionCookie } });
    const after = await refreshed.json();
    if (after.user?.babyProfile?.name !== 'Bé An' || after.user?.babyProfile?.weight !== 11) throw new Error('Saved baby data did not return in session');
    const invalid = await fetch(new URL('/api/user/profile', base), { method: 'PATCH',
      headers: { 'Content-Type': 'application/json', cookie: sessionCookie, origin: base },
      body: JSON.stringify({ babyProfile: { birthDate: 'invalid' } }) });
    if (invalid.status !== 400) throw new Error('Invalid baby date was accepted');
    console.log('Customer registration, login, zero initial points, saved baby profile, and session refresh passed');
  } finally {
    if (created) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) { await prisma.user.delete({ where: { id: user.id } }); console.log('Temporary customer removed from database'); }
    }
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
