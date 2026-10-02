const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const net = require('node:net');
async function main() {
  const portProbe = net.createServer();
  await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', String(port)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', () => {}); server.stderr.on('data', () => {});
  try {
    const base = `http://localhost:${port}`;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { if ((await fetch(`${base}/api/auth/csrf`)).ok) break; } catch {}
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    for (const path of ['/verify-email?token=' + 'a'.repeat(64), '/reset-password?token=' + 'b'.repeat(64), '/forgot-password']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
      assert.ok(response.headers.get('cache-control').includes('no-store'));
      assert.ok(response.headers.get('content-security-policy').includes("connect-src 'self'"));
      const html = await response.text();
      assert.ok(html.includes('<form'));
      assert.ok(html.includes('noindex'));
      console.log(`PASS: ${path.split('?')[0]} renders form with private security headers`);
    }
    const cross = await fetch(`${base}/api/auth/email/verify`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ token: 'a'.repeat(64) }) });
    assert.equal(cross.status, 403);
    const get = await fetch(`${base}/api/auth/email/verify`);
    assert.equal(get.status, 405);
    console.log('PASS: mail scanners cannot consume via GET and cross-origin POST is rejected');
  } finally { server.kill(); }
}
main().catch((error) => { console.error('Email page checks failed:', error.message); process.exitCode = 1; });
