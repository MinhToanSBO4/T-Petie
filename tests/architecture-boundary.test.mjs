import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (match) => match.slice(1));

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}

test('browser code cannot import backend services, Prisma or database credentials', () => {
  const browserDirectories = ['client', 'components', 'context', 'hooks'];
  const browserFiles = browserDirectories.flatMap((directory) => files(join(root, directory)));
  const clientPages = files(join(root, 'app')).filter((file) =>
    /^\s*['"]use client['"]/.test(readFileSync(file, 'utf8')));
  for (const file of [...browserFiles, ...clientPages]) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /(?:from\s*|import\s*\(|require\s*\()['"](?:@\/server(?:\/|['"])|@prisma\/client|@\/server\/db)/,
      `${relative(root, file)} imports backend code`);
    assert.doesNotMatch(source, /process\.env\.(?:CONNECTION_STRING|DATABASE_URL)/,
      `${relative(root, file)} reads a database credential`);
  }
});

test('backend database entrypoints are marked server-only', () => {
  for (const filename of [
    'db/client.ts', 'auth/options.ts', 'auth/session.ts', 'catalog/queries.ts',
    'security/rate-limit.ts', 'orders/create-order.ts', 'orders/quote-order.ts',
    'orders/customer-orders.ts', 'orders/order-status.ts', 'reviews/submit-review.ts', 'reviews/review-request.ts',
    'auth/user-snapshot.ts', 'auth/google-link.ts', 'db/sql.ts',
  ]) {
    const source = readFileSync(join(root, 'server', filename), 'utf8');
    assert.match(source, /^import 'server-only';/, `${filename} must stay on the server`);
  }
});
