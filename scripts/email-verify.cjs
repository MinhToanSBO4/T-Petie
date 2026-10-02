const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
require('../tests/helpers/server-loader.cjs');
const { smtpTransport, mailErrorCode } = require('../src/server/email/transport.ts');
(async () => {
  let transport, cancel, timer;
  try {
    ({ transport, cancel } = smtpTransport());
    await Promise.race([transport.verify(), new Promise((_, reject) => { timer = setTimeout(() => { cancel(); reject(Object.assign(new Error('SMTP_TIMEOUT'), { code: 'ETIMEDOUT' })); }, 20000); })]);
    console.log('SMTP connection and authentication verified. No email was sent.');
  } catch (error) {
    console.error(`SMTP verification failed: ${mailErrorCode(error)}`);
    process.exitCode = 1;
  } finally { clearTimeout(timer); cancel?.(); }
})();
