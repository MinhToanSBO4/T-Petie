import test from 'node:test';
import assert from 'node:assert/strict';
import deployEnv from '../scripts/lib/deploy-env.cjs';

const { checkDeployEnvironment } = deployEnv;
const production = {
  CONNECTION_STRING: 'postgresql://postgres.ref:pw@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?schema=tpetie_app&pgbouncer=true',
  DIRECT_URL: 'postgresql://postgres.ref:pw@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?schema=tpetie_app',
  NEXTAUTH_URL: 'https://tpetie.vn',
  NEXTAUTH_SECRET: 'x'.repeat(44),
  CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret',
  CRON_SECRET: 'c'.repeat(32),
  NEXT_PUBLIC_GA4_ID: 'G-ABC123XYZ9',
  GOOGLE_CLIENT_ID: '123-abc.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'GOCSPX-secret',
};
const check = (env, options = { production: true, vercel: true }) => checkDeployEnvironment(env, options);

test('a complete production configuration passes without warnings', () => {
  assert.deepEqual(check(production), { errors: [], warnings: [] });
});

test('account credentials in the environment are rejected', () => {
  assert.equal(check({ ...production, ADMIN_INITIAL_PASSWORD: 'secret-password-123' }).errors.length, 1);
  assert.equal(check({ ...production, STAFF_USERNAME: 'team' }, { production: false }).errors.length, 1);
});

test('production requires migration, auth, media and cron settings', () => {
  const { DIRECT_URL, CRON_SECRET, CLOUDINARY_API_SECRET, ...partial } = production;
  assert.equal(check({ ...partial, NEXTAUTH_URL: 'http://localhost:3000' }).errors.length, 4);
  assert.equal(check({ ...production, DIRECT_URL: production.CONNECTION_STRING }).errors.length, 1);
  assert.equal(check({ ...production, DIRECT_URL: production.DIRECT_URL.replace('tpetie_app', 'public') }).errors.length, 1);
});

test('legacy CLOUD_* names are accepted and session pooler on Vercel only warns', () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, ...rest } = production;
  const result = check({ ...rest, CLOUD_NAME: 'demo', CLOUD_API_KEY: 'k', CLOUD_API_SECRET: 's',
    CONNECTION_STRING: production.DIRECT_URL });
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 1);
});

test('local development needs only the database and session secret', () => {
  const result = check({ CONNECTION_STRING: production.DIRECT_URL, NEXTAUTH_SECRET: 'local-secret' }, { production: false });
  assert.equal(result.errors.length, 0);
});

test('an invalid GA4 measurement ID only warns', () => {
  assert.deepEqual(check({ ...production, NEXT_PUBLIC_GA4_ID: 'UA-12345-1' }).errors, []);
  assert.equal(check({ ...production, NEXT_PUBLIC_GA4_ID: 'UA-12345-1' }).warnings.length, 1);
  const { NEXT_PUBLIC_GA4_ID, ...withoutAnalytics } = production;
  assert.deepEqual(check(withoutAnalytics), { errors: [], warnings: [] });
});

test('a production build without Google sign-in warns that the Google button is hidden', () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ...withoutGoogle } = production;
  assert.match(check(withoutGoogle).warnings.join(' '), /Google/);
  assert.match(check({ ...production, GOOGLE_CLIENT_ID: 'abc' }).warnings.join(' '), /googleusercontent/);
});
