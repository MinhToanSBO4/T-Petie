import type { MailConfig } from './config';

export type EmailPayload = { kind: 'verification' | 'reset'; name?: string | null; token: string } | {
  kind: 'receipt' | 'status'; orderCode: string; name: string; status: string; note?: string | null;
  date: string; address: string; registered: boolean;
  items: { name: string; size: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number; shippingFee: number; discount: number; total: number;
};

type Config = Pick<MailConfig, 'brand' | 'siteUrl' | 'replyTo'>;

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const formatDate = (iso: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));

const COLOR = { page: '#f7f1e8', card: '#ffffff', ink: '#2f2924', muted: '#6b6259', line: '#ece3d6', brand: '#9b713d', soft: '#faf5ee' };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Tên, màu và câu thông báo theo trạng thái đơn. */
const STATUS: Record<string, { label: string; color: string; message: string }> = {
  PENDING: { label: 'Chờ xác nhận', color: '#b7791f', message: 'Cảm ơn bạn đã đặt hàng! Shop sẽ liên hệ xác nhận đơn trong thời gian sớm nhất.' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2b6cb0', message: 'Shop đã xác nhận đơn hàng và đang chuẩn bị hàng cho bé.' },
  PROCESSING: { label: 'Đang chuẩn bị hàng', color: '#6b46c1', message: 'Đơn hàng đang được đóng gói cẩn thận và sẽ sớm được gửi đi.' },
  SHIPPING: { label: 'Đang giao hàng', color: '#2c7a7b', message: 'Đơn hàng đã được giao cho đơn vị vận chuyển. Bạn để ý điện thoại để nhận hàng nhé.' },
  COMPLETED: { label: 'Giao hàng thành công', color: '#2f855a', message: 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã tin chọn shop! Bạn có thể đánh giá sản phẩm trong mục Đơn mua.' },
  CANCELLED: { label: 'Đã hủy', color: '#c53030', message: 'Đơn hàng của bạn đã được hủy. Nếu đã thanh toán trước, shop sẽ liên hệ để hoàn tiền.' },
};

function button(url: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px"><tr><td align="center" bgcolor="${COLOR.brand}" style="border-radius:10px">`
    + `<a href="${escape(url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${escape(label)}</a>`
    + `</td></tr></table>`;
}

function orderSummary(payload: Extract<EmailPayload, { orderCode: string }>) {
  const status = STATUS[payload.status];
  const rows = payload.items.map((item) => `<tr>
    <td style="padding:12px 0;border-bottom:1px solid ${COLOR.line};font-size:14px;color:${COLOR.ink}">${escape(item.name)}<br><span style="font-size:12px;color:${COLOR.muted}">Size ${escape(item.size)} · ${escape(money(item.unitPrice))} × ${item.quantity}</span></td>
    <td align="right" style="padding:12px 0;border-bottom:1px solid ${COLOR.line};font-size:14px;color:${COLOR.ink};white-space:nowrap">${escape(money(item.totalPrice))}</td>
  </tr>`).join('');
  const line = (label: string, value: string, strong = false) => `<tr><td style="padding:4px 0;font-size:${strong ? 16 : 14}px;color:${strong ? COLOR.ink : COLOR.muted};${strong ? 'font-weight:700;' : ''}">${label}</td><td align="right" style="padding:4px 0;font-size:${strong ? 16 : 14}px;color:${COLOR.ink};${strong ? 'font-weight:700;' : ''}white-space:nowrap">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background:${COLOR.soft};border-radius:12px"><tr><td style="padding:16px 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:13px;color:${COLOR.muted}">Mã đơn hàng<br><strong style="font-size:16px;color:${COLOR.ink}">${escape(payload.orderCode)}</strong></td>
        <td align="right" style="font-size:13px;color:${COLOR.muted}">Ngày đặt<br><span style="color:${COLOR.ink}">${escape(formatDate(payload.date))}</span></td>
      </tr></table>
      ${status ? `<p style="margin:14px 0 0"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${status.color};color:#ffffff;font-size:12px;font-weight:700">${escape(status.label)}</span></p>` : ''}
    </td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">${rows}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">
      ${line('Tạm tính', escape(money(payload.subtotal)))}
      ${line('Phí vận chuyển', payload.shippingFee ? escape(money(payload.shippingFee)) : 'Miễn phí')}
      ${payload.discount ? line('Giảm giá', `-${escape(money(payload.discount))}`) : ''}
      <tr><td colspan="2" style="padding-top:8px;border-top:1px solid ${COLOR.line}"></td></tr>
      ${line('Tổng thanh toán', escape(money(payload.total)), true)}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr>
      <td style="padding:16px 20px;border:1px solid ${COLOR.line};border-radius:12px;font-size:14px;line-height:1.6;color:${COLOR.ink}">
        <strong>Giao tới</strong><br>${escape(payload.name)}<br><span style="color:${COLOR.muted}">${escape(payload.address)}</span><br>
        <span style="font-size:13px;color:${COLOR.muted}">Thanh toán khi nhận hàng (COD). Vui lòng kiểm tra hàng trước khi thanh toán cho nhân viên giao hàng.</span>
      </td></tr></table>`;
}

function orderText(payload: Extract<EmailPayload, { orderCode: string }>) {
  return [
    `Mã đơn: ${payload.orderCode} · Ngày đặt: ${formatDate(payload.date)}`,
    `Trạng thái: ${STATUS[payload.status]?.label || payload.status}`,
    '',
    ...payload.items.map((i) => `- ${i.name} · Size ${i.size} · ${i.quantity} x ${money(i.unitPrice)} = ${money(i.totalPrice)}`),
    '',
    `Tạm tính: ${money(payload.subtotal)}`,
    `Phí vận chuyển: ${payload.shippingFee ? money(payload.shippingFee) : 'Miễn phí'}`,
    ...(payload.discount ? [`Giảm giá: -${money(payload.discount)}`] : []),
    `Tổng thanh toán: ${money(payload.total)}`,
    '',
    `Giao tới: ${payload.name}, ${payload.address}`,
    'Thanh toán khi nhận hàng (COD).',
  ].join('\n');
}

export function renderEmail(config: Config, payload: EmailPayload) {
  const greeting = `Xin chào ${payload.name || 'bạn'},`;
  let subject: string, title: string, intro: string, url: string, action: string, body = '', textBody = '', notice = '';

  if ('token' in payload) {
    const verification = payload.kind === 'verification';
    url = `${config.siteUrl}/${verification ? 'verify-email' : 'reset-password'}?token=${encodeURIComponent(payload.token)}`;
    if (verification) {
      subject = `Xác thực email tài khoản ${config.brand}`;
      title = 'Xác thực địa chỉ email của bạn';
      intro = `Cảm ơn bạn đã đăng ký tài khoản tại ${config.brand}. Bấm nút bên dưới để xác thực email và bắt đầu đặt hàng. Liên kết có hiệu lực trong 24 giờ.`;
      action = 'Xác thực email';
    } else {
      subject = `Đặt lại mật khẩu tài khoản ${config.brand}`;
      title = 'Yêu cầu đặt lại mật khẩu';
      intro = 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm nút bên dưới để tạo mật khẩu mới. Liên kết có hiệu lực trong 30 phút và chỉ dùng được một lần.';
      action = 'Đặt mật khẩu mới';
    }
    notice = 'Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email; tài khoản của bạn vẫn an toàn. Không chia sẻ liên kết này với bất kỳ ai.';
  } else {
    const status = STATUS[payload.status];
    if (payload.kind === 'receipt') {
      subject = `${config.brand} đã nhận đơn hàng #${payload.orderCode}`;
      title = 'Cảm ơn bạn đã đặt hàng!';
      intro = STATUS.PENDING.message;
    } else {
      subject = `Đơn hàng #${payload.orderCode}: ${status?.label || payload.status}`;
      title = status ? `Đơn hàng ${status.label.toLowerCase()}` : 'Cập nhật đơn hàng';
      intro = status?.message || 'Đơn hàng của bạn vừa được cập nhật.';
    }
    if (payload.note) intro += ` Ghi chú từ shop: ${payload.note}`;
    url = payload.registered ? `${config.siteUrl}/orders/${encodeURIComponent(payload.orderCode)}` : `${config.siteUrl}/order-lookup`;
    action = payload.registered ? 'Xem chi tiết đơn hàng' : 'Tra cứu đơn hàng';
    body = orderSummary(payload);
    textBody = orderText(payload);
    if (!payload.registered) notice = `Tra cứu đơn bằng mã ${payload.orderCode} và số điện thoại đặt hàng.`;
  }

  const support = config.replyTo
    ? `Cần hỗ trợ? Liên hệ <a href="mailto:${escape(config.replyTo)}" style="color:${COLOR.brand}">${escape(config.replyTo)}</a>.`
    : `Cần hỗ trợ? Nhắn tin cho shop qua website <a href="${escape(config.siteUrl)}" style="color:${COLOR.brand}">${escape(new URL(config.siteUrl).host)}</a>.`;
  const footerText = `Đây là email tự động từ hệ thống ${config.brand}, vui lòng không trả lời email này.`;
  const year = new Date().getFullYear();

  const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:${COLOR.page};font-family:${FONT};color:${COLOR.ink};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.page}"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
    <tr><td align="center" style="padding:0 0 20px"><a href="${escape(config.siteUrl)}" style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:1px;color:${COLOR.brand};text-decoration:none">${escape(config.brand)}</a></td></tr>
    <tr><td style="background:${COLOR.card};border-radius:16px;border-top:4px solid ${COLOR.brand};padding:36px 32px">
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:${COLOR.ink}">${escape(title)}</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.7">${escape(greeting)}</p>
      <p style="margin:0;font-size:15px;line-height:1.7">${escape(intro)}</p>
      ${body}
      ${button(url, action)}
      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${COLOR.muted};word-break:break-all">Nếu nút không hoạt động, sao chép liên kết sau vào trình duyệt:<br><a href="${escape(url)}" style="color:${COLOR.brand}">${escape(url)}</a></p>
      ${notice ? `<p style="margin:20px 0 0;padding:14px 16px;background:${COLOR.soft};border-radius:10px;font-size:13px;line-height:1.6;color:${COLOR.muted}">${escape(notice)}</p>` : ''}
    </td></tr>
    <tr><td align="center" style="padding:24px 24px 0;font-size:12px;line-height:1.7;color:${COLOR.muted}">
      ${escape(footerText)}<br>${support}<br>© ${year} ${escape(config.brand)}. Mọi quyền được bảo lưu.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    greeting, '', intro, '',
    ...(textBody ? [textBody, ''] : []),
    `${action}: ${url}`, '',
    ...(notice ? [notice, ''] : []),
    '—',
    footerText,
    config.replyTo ? `Cần hỗ trợ? Liên hệ ${config.replyTo}.` : `Website: ${config.siteUrl}`,
  ].join('\n');

  return { subject, html, text };
}
