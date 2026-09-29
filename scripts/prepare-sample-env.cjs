const fs = require('node:fs');
const crypto = require('node:crypto');

const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  const password = Buffer.concat(chunks).toString('utf8').trim();
  if (password.length < 12) throw new Error('Admin sample password must have at least 12 characters.');
  const file = '.env.local';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const set = (key, value) => {
    const index = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (index === -1) lines.push(`${key}=${value}`);
    else lines[index] = `${key}=${value}`;
  };
  const existing = (key) => lines.find((line) => line.startsWith(`${key}=`))?.slice(key.length + 1);
  set('ADMIN_USERNAME', 'superadmin');
  set('ADMIN_INITIAL_PASSWORD', password);
  set('STAFF_USERNAME', 'nhanvien');
  set('STAFF_EMAIL', 'nhanvien@tpetie.local');
  if (!existing('STAFF_INITIAL_PASSWORD')) set('STAFF_INITIAL_PASSWORD', crypto.randomBytes(24).toString('hex'));
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Sample account credentials updated in ignored .env.local.');
});
