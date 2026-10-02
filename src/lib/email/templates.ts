import type { MailConfig } from './config';

export type EmailPayload = { kind: 'verification' | 'reset'; name?: string | null; token: string } | {
  kind: 'receipt' | 'status'; orderCode: string; name: string; status: string; note?: string | null;
  date: string; address: string; registered: boolean;
  items: { name: string; size: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number; shippingFee: number; discount: number; total: number;
};
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const labels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị', SHIPPING: 'Đang giao hàng', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy' };

export function renderEmail(config: Pick<MailConfig, 'brand' | 'siteUrl' | 'replyTo'>, payload: EmailPayload) {
  let title: string, message: string, url: string, action: string, content = '', detail = '';
  const greeting = `Xin chào ${payload.name || 'bạn'},`;
  if ('token' in payload) {
    const verification = payload.kind === 'verification';
    title = verification ? 'Xác thực tài khoản của bạn' : 'Đặt lại mật khẩu';
    message = verification ? `Cảm ơn bạn đã đăng ký tại ${config.brand}. Vui lòng xác thực email để bắt đầu mua sắm. Liên kết có hiệu lực trong 24 giờ.` : 'Bạn đã yêu cầu đặt lại mật khẩu. Liên kết có hiệu lực trong 30 phút và chỉ sử dụng được một lần.';
    url = `${config.siteUrl}/${verification ? 'verify-email' : 'reset-password'}?token=${encodeURIComponent(payload.token)}`;
    action = verification ? 'Xác thực email' : 'Đặt lại mật khẩu';
    detail = 'Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email. Không chia sẻ liên kết này với người khác.';
  } else {
    title = payload.kind === 'receipt' ? `Đã nhận đơn hàng ${payload.orderCode}` : `Cập nhật đơn hàng ${payload.orderCode}`;
    message = `Trạng thái: ${labels[payload.status] || payload.status}.${payload.note ? ` ${payload.note}` : ''}`;
    url = payload.registered ? `${config.siteUrl}/orders/${encodeURIComponent(payload.orderCode)}` : `${config.siteUrl}/order-lookup`;
    action = 'Theo dõi đơn hàng';
    const date = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(payload.date));
    content = `<p style="color:#6b6259">Đơn ${escape(payload.orderCode)} · ${escape(date)}</p><table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;font-size:14px"><tr style="background:#faf5ee"><th align="left">Sản phẩm</th><th>SL</th><th align="right">Thành tiền</th></tr>${payload.items.map((item) => `<tr><td style="border-bottom:1px solid #eee">${escape(item.name)}<br><span style="color:#6b6259">Size ${escape(item.size)} · ${escape(money(item.unitPrice))}</span></td><td align="center">${item.quantity}</td><td align="right">${escape(money(item.totalPrice))}</td></tr>`).join('')}</table><table width="100%" cellpadding="6" style="margin-top:16px;font-size:14px"><tr><td>Tạm tính</td><td align="right">${escape(money(payload.subtotal))}</td></tr><tr><td>Phí vận chuyển</td><td align="right">${escape(money(payload.shippingFee))}</td></tr><tr><td>Giảm giá</td><td align="right">-${escape(money(payload.discount))}</td></tr><tr style="background:#faf5ee;font-size:18px;font-weight:bold"><td>Tổng thanh toán</td><td align="right">${escape(money(payload.total))}</td></tr></table><p><strong>Thông tin giao hàng</strong><br>${escape(payload.name)}<br>${escape(payload.address)}</p><p>Thanh toán khi nhận hàng (COD). Vui lòng kiểm tra đơn trước khi thanh toán cho người giao hàng.</p>`;
    detail = `Đơn ${payload.orderCode} · ${date}\n${payload.items.map((i) => `${i.name} · Size ${i.size} · ${i.quantity} x ${money(i.unitPrice)} = ${money(i.totalPrice)}`).join('\n')}\nTạm tính: ${money(payload.subtotal)}\nPhí vận chuyển: ${money(payload.shippingFee)}\nGiảm giá: ${money(payload.discount)}\nTổng thanh toán: ${money(payload.total)}\nGiao tới: ${payload.name}, ${payload.address}\nThanh toán khi nhận hàng (COD).`;
  }
  const footer = `Email tự động từ ${config.brand}. ${config.replyTo ? `Cần hỗ trợ? Liên hệ ${config.replyTo}.` : 'Vui lòng không trả lời email này.'}`;
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#faf5ee;font-family:Arial,Helvetica,sans-serif;color:#302a25"><div style="display:none;max-height:0;overflow:hidden">${escape(title)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px"><tr><td style="padding:28px 32px;background:#f3e5cf;font-size:26px;font-weight:bold;letter-spacing:1px">${escape(config.brand)}</td></tr><tr><td style="padding:32px;line-height:1.7"><h1 style="font-size:23px;line-height:1.35;margin:0 0 24px">${escape(title)}</h1><p>${escape(greeting)}</p><p>${escape(message)}</p>${content}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:#9b713d;border-radius:8px"><a href="${escape(url)}" style="display:inline-block;padding:14px 24px;color:white;text-decoration:none;font-weight:bold">${escape(action)}</a></td></tr></table><p style="font-size:12px;color:#6b6259;word-break:break-all">Nếu nút không hoạt động, mở liên kết:<br><a href="${escape(url)}" style="color:#9b713d">${escape(url)}</a></p>${payload.kind === 'verification' || payload.kind === 'reset' ? `<p style="font-size:13px;color:#6b6259">${escape(detail)}</p>` : ''}</td></tr><tr><td style="padding:24px 32px;border-top:1px solid #eee;font-size:12px;color:#6b6259">${escape(footer)}</td></tr></table></td></tr></table></body></html>`;
  return { subject: `${config.brand} | ${title}`, html, text: `${greeting}\n\n${message}\n\n${detail}\n\n${action}: ${url}\n\n${footer}` };
}
