const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const tls = require('node:tls');
require('./helpers/server-loader.cjs');

test('SMTP deadline destroys the active socket even when the server keeps it alive', async () => {
  const sockets = new Set();
  let closed = false, messageStarted = false;
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    let buffered = '', dataMode = false, dripper;
    socket.on('close', () => { closed = true; clearInterval(dripper); sockets.delete(socket); });
    socket.write('220 fake-smtp\r\n');
    socket.on('data', (chunk) => {
      buffered += chunk.toString();
      if (dataMode) {
        if (buffered.includes('\r\n.\r\n') && !dripper) {
          messageStarted = true;
          // Keep the socket active while never acknowledging the message.
          dripper = setInterval(() => socket.write('250-waiting\r\n'), 500);
        }
        return;
      }
      let at;
      while ((at = buffered.indexOf('\r\n')) >= 0) {
        const command = buffered.slice(0, at); buffered = buffered.slice(at + 2);
        if (command.startsWith('EHLO')) socket.write('250-fake\r\n250 AUTH PLAIN\r\n');
        else if (command.startsWith('AUTH')) socket.write('235 authenticated\r\n');
        else if (command.startsWith('MAIL') || command.startsWith('RCPT')) socket.write('250 OK\r\n');
        else if (command === 'DATA') { dataMode = true; socket.write('354 send data\r\n'); }
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const original = tls.connect;
  const previous = { ...process.env };
  try {
    Object.assign(process.env, { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(server.address().port), SMTP_SECURE: 'true', SMTP_USER: 'fake', SMTP_PASSWORD: 'fake-only', MAIL_FROM_ADDRESS: 'mail@example.invalid', MAIL_SITE_URL: 'http://localhost:3000' });
    // Replace only the TLS handshake at the network boundary. The production SMTP transport,
    // MIME generation, live socket, deadline and cancellation are exercised unchanged.
    tls.connect = (options, callback) => net.connect({ host: options.host, port: options.port }, callback);
    const { sendEmail } = require('../src/server/email/transport.ts');
    const started = Date.now();
    await assert.rejects(sendEmail('recipient@example.invalid', { kind: 'reset', token: 'fake-token' }), (error) => error.code === 'ETIMEDOUT');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.ok(messageStarted, 'Test must reach SMTP DATA before timing out');
    assert.ok(closed, 'Active SMTP socket must close at the deadline');
    assert.ok(Date.now() - started < 23000, 'Operation must be bounded');
  } finally {
    tls.connect = original;
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
});
