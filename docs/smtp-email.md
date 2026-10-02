# Transactional email operations

The storefront uses Nodemailer SMTP for customer verification/reset and a PostgreSQL outbox for order notifications. SMTP modules remain server-only. Owner-supplied credentials are configured in ignored `.env.local`; commit only `.env.example` placeholders.

## Configuration

| Variable | Value / purpose |
| --- | --- |
| SMTP_HOST | Provider hostname, e.g. smtp.gmail.com |
| SMTP_PORT | 465 for implicit TLS, 587 for STARTTLS |
| SMTP_SECURE | true for 465; false for 587 (TLS upgrade required) |
| SMTP_USER | SMTP account login |
| SMTP_PASSWORD | Provider app password, server secret |
| MAIL_FROM_ADDRESS | Authorized mailbox or sender alias |
| MAIL_FROM_NAME | Display name; default `<brand> · No Reply` |
| MAIL_BRAND_NAME | Subject/template brand; default T'Petie |
| MAIL_REPLY_TO | Optional monitored support mailbox |
| MAIL_SITE_URL | Canonical origin, localhost for development, real HTTPS origin in production |

The current Gmail mailbox uses a No Reply display name. To use a literal `noreply@your-domain`, configure a provider-authorized mailbox or alias first, then change MAIL_FROM_ADDRESS. [Nodemailer transport documentation](https://nodemailer.com/smtp).

Production environment checks require complete SMTP credentials. Preview/local environments may omit SMTP, but verification-dependent requests fail explicitly instead of bypassing verification. Add the server variables to the hosting provider environment and set MAIL_SITE_URL to the public HTTPS domain. Restart the local server after changing environment variables.

## Commands

- `npm run email:verify`: verify SMTP connection/authentication; sends no message.
- `npm run email:preview`: regenerate HTML/text previews in `docs/email-previews` with fictional data.
- `npm run email:test`: migrate a newly generated `smtp_test_<random>` schema, run actual token/order/outbox transactions with fake delivery, then drop only that isolated schema. Requires schema creation privileges. Never sends email.
- `node scripts/check-email-pages.cjs`: start a temporary production server on a separate port, check security headers/forms/POST-only consumption, then stop it. Requires a completed local build.
- `npm test`: includes pure email configuration, template and retry policy tests.
- `node scripts/dev-sync.cjs`: repository local migration workflow; migration is additive and leaves legacy users unrestricted.

## Account lifecycle

Password registration creates an active customer with emailVerificationRequired=true and no emailVerified date. It does not log the customer in. The verification screen reports whether SMTP accepted the registration email and offers resend. Legacy users and staff keep their existing access; verified Google customers satisfy ownership checks.

Security links use random 32-byte tokens and store SHA-256 digests only. Verification lasts 24 hours; reset lasts 30 minutes. Opening a link renders a form and does not consume it. Only a same-origin POST changes the account. Replacement and consumption serialize on the user row, and mutation/token deletion share one transaction. Reset replaces the password with bcrypt cost 12 and invalidates existing sessions through the existing credential fingerprint (other instances may retain the 15-second snapshot cache briefly).

Forgot-password returns the same generic response for unknown, staff and eligible accounts, including SMTP rejection. Public recovery cannot reset staff/admin, blocked or deleted users. IP and normalized-email limits apply. Security pages have no-referrer/no-store policies and suppress analytics.

## Outbox

Receipt/status jobs are inserted in the same transaction as order creation or status history. Customers may supply an optional normalized order email. Orders without email still work and create no mail job. Multi-step changes send the final state once. Shop status notifications wait past the 30-second undo window; undo cancels unsent jobs and enqueues a correction for a state already accepted or being sent.

Workers claim one due job using `FOR UPDATE SKIP LOCKED` with a 60-second lease. Each SMTP send has a 20-second wall-clock deadline that destroys the actual socket, stable Message-ID and sanitized error code. At most five attempts are made, with exponential backoff starting at one minute. Expired leases recover, including failed final-attempt leases. Workers stop claiming when their runtime budget cannot cover another send; maintenance bounds auto-completion to five orders and reserves time for one send.

Dispatch runs after mutation with `waitUntil`, during authenticated back-office order requests, and in `/api/cron/maintenance`. Daily cron is a fallback; quiet periods can delay retries. Auto-completion may enqueue while rendering pages but never sends mail during a build. Completed/failed/cancelled jobs and payloads are removed after 30 days; expired account tokens are removed by maintenance.

An SMTP acceptance is not proof of inbox delivery. A crash between SMTP acceptance and recording sent status may cause a duplicate: delivery is at least once. Check the provider spam/reputation settings when messages are accepted but not received.

## Troubleshooting

Inspect email_jobs.status, attempts, nextAttemptAt, leaseUntil and errorCode. EAUTH means authentication failed; ETIMEDOUT/ECONNECTION/EDNS/ESOCKET indicate transport failures. Never print raw provider errors, credentials or authentication tokens. Correct configuration and run connection verification before enabling retries. A failed job requires a deliberate operational requeue after investigating; do not blindly reset all jobs.
