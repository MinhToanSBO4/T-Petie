import 'server-only';
import nodemailer from 'nodemailer';
import net from 'node:net';
import tls from 'node:tls';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { readMailConfig, normalizeEmail } from '@/lib/email/config';
import { renderEmail, type EmailPayload } from '@/lib/email/templates';

export function smtpTransport() {
  const config = readMailConfig(process.env);
  let socket: net.Socket | undefined;
  const options: SMTPTransport.Options = {
    host: config.host, port: config.port, secure: config.secure, requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000, dnsTimeout: 5000,
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
    // Retain the actual socket: nonpooled Nodemailer transport.close() does not abort
    // an active send. Destroying this socket also tears down a STARTTLS wrapper.
    getSocket(_options, callback) {
      let returned = false;
      const finish = (error: Error | null) => {
        if (returned) return;
        returned = true;
        callback(error, error ? undefined : { connection: socket, secured: config.secure });
      };
      socket = config.secure
        ? tls.connect({ host: config.host, port: config.port, servername: config.host,
            rejectUnauthorized: true, minVersion: 'TLSv1.2' }, () => finish(null))
        : net.connect({ host: config.host, port: config.port }, () => finish(null));
      socket.once('error', (error) => finish(error));
      socket.setTimeout(5000, () => { if (!returned) socket?.destroy(Object.assign(new Error('SMTP_TIMEOUT'), { code: 'ETIMEDOUT' })); });
    },
  };
  const transport = nodemailer.createTransport(options);
  const cancel = () => { socket?.destroy(); transport.close(); };
  return { config, transport, cancel };
}

export async function sendEmail(to: string, payload: EmailPayload, messageId?: string) {
  if (!normalizeEmail(to)) throw new Error('INVALID_RECIPIENT');
  const { config, transport, cancel } = smtpTransport();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      transport.sendMail({ from: { name: config.fromName, address: config.fromAddress },
        to, replyTo: config.replyTo || undefined, ...renderEmail(config, payload), messageId,
        // Thư tự động: hộp thư không gửi trả lời tự động (vắng mặt, chuyển tiếp) về địa chỉ no-reply.
        headers: { 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'All' } }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { cancel(); reject(Object.assign(new Error('SMTP_TIMEOUT'), { code: 'ETIMEDOUT' })); }, 15000); }),
    ]);
    if (!result.accepted?.length) throw new Error('SMTP_REJECTED');
  } finally { clearTimeout(timer); cancel(); }
}

export function mailErrorCode(error: unknown) {
  const code = (error as { code?: string })?.code;
  return ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'EDNS', 'ESOCKET', 'EENVELOPE', 'EMESSAGE'].includes(code || '') ? code! : 'EMAIL_FAILED';
}
