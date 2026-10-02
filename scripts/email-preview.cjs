require('../tests/helpers/server-loader.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { renderEmail } = require('../src/lib/email/templates.ts');
const config = { brand: "T'Petie", siteUrl: 'https://shop.example.com' };
const order = { orderCode: 'TP-PREVIEW', name: 'Mẹ An', status: 'SHIPPING', date: '2026-10-02T15:00:00Z', address: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội', registered: false,
  items: [{ name: 'Váy organic dịu ngọt', size: '2 (10–12kg)', quantity: 2, unitPrice: 250000, totalPrice: 500000 }], subtotal: 500000, shippingFee: 25000, discount: 50000, total: 475000 };
const directory = path.join(process.cwd(), 'docs', 'email-previews');
fs.mkdirSync(directory, { recursive: true });
for (const kind of ['verification', 'reset', 'receipt', 'status']) {
  const mail = renderEmail(config, kind === 'verification' || kind === 'reset' ? { kind, name: 'Mẹ An', token: 'preview-only' } : { ...order, kind, status: kind === 'receipt' ? 'PENDING' : 'SHIPPING' });
  fs.writeFileSync(path.join(directory, `${kind}.html`), mail.html);
  fs.writeFileSync(path.join(directory, `${kind}.txt`), mail.text);
}
console.log('Four email previews written to docs/email-previews (fictional customer data).');
