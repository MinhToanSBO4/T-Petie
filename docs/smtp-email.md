# Transactional email operations

The storefront uses Nodemailer SMTP for customer verification/reset and a PostgreSQL outbox for order notifications. SMTP modules remain server-only. Credentials live in the single ignored `.env` file locally and in Vercel Environment Variables in production; commit only `.env.example` placeholders.

## Configuration

| Variable | Value / purpose |
| --- | --- |
| SMTP_HOST | Provider hostname, e.g. smtp.gmail.com |
| SMTP_PORT | Optional, default 465 (implicit TLS); 587 for STARTTLS |
| SMTP_SECURE | Optional, derived from the port (true for 465, false for 587) |
| SMTP_USER | SMTP account login |
| SMTP_PASSWORD | Provider app password, server secret (spaces from Gmail are ignored) |
| MAIL_FROM_ADDRESS | Optional, default SMTP_USER; must be an authorized mailbox or alias |
| MAIL_FROM_NAME | Display name; default `<brand> · No-Reply` |
| MAIL_BRAND_NAME | Subject/template brand; default T'Petie |
| MAIL_REPLY_TO | Optional monitored support mailbox |
| MAIL_SITE_URL | Optional, default NEXTAUTH_URL (then VERCEL_PROJECT_PRODUCTION_URL) |

The current Gmail mailbox uses a No Reply display name. To use a literal `noreply@your-domain`, configure a provider-authorized mailbox or alias first, then change MAIL_FROM_ADDRESS. [Nodemailer transport documentation](https://nodemailer.com/smtp).

Production builds require SMTP_HOST, SMTP_USER and SMTP_PASSWORD. Preview/local environments may omit SMTP, but verification-dependent requests fail explicitly instead of bypassing verification. Add the server variables to the hosting provider environment and make sure NEXTAUTH_URL (or MAIL_SITE_URL) is the public HTTPS domain. Restart the local server after changing environment variables.

## Commands

- `npm run email:verify`: verify SMTP connection/authentication; sends no message.
- `npm run email:preview`: regenerate HTML/text previews in `docs/email-previews` with fictional data.
- `npm run email:test`: migrate a newly generated `smtp_test_<random>` schema, run actual token/order/outbox transactions with fake delivery, then drop only that isolated schema. Requires schema creation privileges. Never sends email.
- `node scripts/check-email-pages.cjs`: start a temporary production server on a separate port, check security headers/forms/POST-only consumption, then stop it. Requires a completed local build.
- `npm test`: includes pure email configuration, template and retry policy tests.
- `node scripts/dev-sync.cjs`: repository local migration workflow; migration is additive and leaves legacy users unrestricted.

## Account lifecycle

Password registration creates an active customer with emailVerificationRequired=true and no emailVerified date, then signs the customer in. Unverified customers can browse, use the cart and manage their account, but cannot place orders: `/api/checkout` returns 403 `EMAIL_UNVERIFIED` (checked against the database), and the storefront opens a verification dialog at every checkout entry point with "open inbox", "I have verified" and a resend button with a countdown. Resend is limited to one email per account every 60 seconds (derived from the current token) and 5 per hour per account, plus 10 per 10 minutes per IP; the API returns `retryAfter` seconds and the UI counts down from it. A tab that comes back into view re-checks the status, and the verification page broadcasts success to other open tabs. Legacy users and staff keep their existing access; verified Google customers satisfy ownership checks.

Security links use random 32-byte tokens and store SHA-256 digests only. Verification lasts 24 hours; reset lasts 30 minutes. Opening a verification link verifies automatically via a same-origin POST from the page (a scanner that only fetches the GET URL consumes nothing); reset links render a form and only the submitted POST changes the password. Passwords need at least 8 characters. Replacement and consumption serialize on the user row, and mutation/token deletion share one transaction. Reset replaces the password with bcrypt cost 12 and invalidates existing sessions through the existing credential fingerprint (other instances may retain the 15-second snapshot cache briefly).

Forgot-password returns the same generic response for unknown, staff and eligible accounts, including SMTP rejection. Public recovery cannot reset staff/admin, blocked or deleted users. IP and normalized-email limits apply. Security pages have no-referrer/no-store policies and suppress analytics.

## Outbox

Receipt/status jobs are inserted in the same transaction as order creation or status history. Customers may supply an optional normalized order email. Orders without email still work and create no mail job. Multi-step changes send the final state once. Shop status notifications wait past the 30-second undo window; undo cancels unsent jobs and enqueues a correction for a state already accepted or being sent.

Workers claim one due job using `FOR UPDATE SKIP LOCKED` with a 60-second lease. Each SMTP send has a 15-second wall-clock deadline that destroys the actual socket, stable Message-ID and sanitized error code. At most five attempts are made, with exponential backoff starting at one minute. Expired leases recover, including failed final-attempt leases. A dispatch drains due jobs (up to 25 per request, 50 in maintenance) until its 50-second budget, inside the 60-second maxDuration, cannot cover another send.

Delivery does not depend on a frequent scheduler. Four layers, cheapest first:

1. **Event-driven:** every order creation, status change, undo and auto-completion dispatches after the response with `waitUntil`.
2. **In-run retry:** backoff is 30 s, 2 min, 10 min, 1 h (five attempts). After a transient failure the same run waits for the next due retry when it fits in the time budget, so short SMTP blips heal in seconds. The extra query only runs after a failure.
3. **Traffic piggyback:** `/api/products` and `/api/quote` call `kickEmailOutbox()`, at most once per 2 minutes per server instance, after the response. An empty queue costs one indexed query.
4. **Schedulers:** Vercel Cron runs `/api/cron/maintenance` daily (also expires/purges/redacts). `.github/workflows/email-outbox.yml` calls `/api/cron/email` hourly as a backstop for quiet periods (about 720 short runs a month, free on a public repository). It needs the repository secret `CRON_SECRET` (same value as Vercel) and the repository variable `SITE_URL`. GitHub only runs schedules from the default branch and disables them after 60 days without repository activity, which is why it is a backstop and not the primary path.

Auto-completion may enqueue while rendering pages but never sends mail during a build.

Data minimisation: a job's payload (name, address, items) is cleared as soon as the job is sent or fails permanently. Jobs still pending after 3 days are marked `failed`/`EXPIRED` instead of sending an outdated status. Sent/failed/cancelled rows are deleted after 30 days. Deleting a customer account cancels that account's unsent jobs and redacts recipient and payload of all its jobs in the same transaction, together with its account tokens.

## Response time

No customer request waits for SMTP. Order emails go through the outbox after the response. Account emails (verification, resend, password reset) are issued with a few database queries, then sent in the background with `waitUntil`: transient failures are retried twice (after 2 s and 5 s); on final failure the new link is deleted so the resend button works immediately. The raw link exists only in memory for that send; the database stores its SHA-256 digest.

An SMTP acceptance is not proof of inbox delivery. A crash between SMTP acceptance and recording sent status may cause a duplicate: delivery is at least once. Check the provider spam/reputation settings when messages are accepted but not received.

## Troubleshooting

Inspect email_jobs.status, attempts, nextAttemptAt, leaseUntil and errorCode. EAUTH means authentication failed; ETIMEDOUT/ECONNECTION/EDNS/ESOCKET indicate transport failures. Never print raw provider errors, credentials or authentication tokens. Correct configuration and run connection verification before enabling retries. A failed job requires a deliberate operational requeue after investigating; do not blindly reset all jobs.
