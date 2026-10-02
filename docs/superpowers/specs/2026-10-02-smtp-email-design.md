# SMTP Email and Account Verification

Status: approved by the owner and implemented. Verification results are recorded in the implementation plan.

## Purpose and scope

Add transactional email to the existing T'Petie storefront for first-time customer registration, forgotten passwords, order receipts and order status updates. Configure transport credentials, the sender and the brand through environment variables. Customer-facing messages remain in Vietnamese; engineering documentation remains in English.

The SMTP account supplied by the owner will be configured only in a Git-ignored local environment file. Its password must not appear in this document, examples, source code, test fixtures, logs or commits.

## Current implementation

- Registration creates an active customer account and immediately signs it in through `AuthContext`. There is no customer forgotten-password flow.
- `User.emailVerified` and NextAuth's `VerificationToken` table already exist. Google sign-in verifies email ownership and removes passwords set before that ownership was established.
- Changing a password already invalidates existing sessions through a password fingerprint and the shared user snapshot cache.
- Orders already have an optional `customerEmail`, but checkout does not currently collect or populate it.
- Creation, customer actions, bulk back-office actions, undo and automatic completion share server-side order services. Some status changes use atomic SQL statements.
- Vercel maintenance runs daily, so a retry mechanism cannot promise minute-by-minute delivery using that cron alone.

## Approach

Use Nodemailer SMTP from server-only modules. Use one shared email layout with dedicated templates for verification, password reset, order receipt and status update.

Authentication emails are sent during the request with bounded transport timeouts. An order email outbox is written atomically with order changes and dispatched after commit. SMTP downtime must not roll back a valid order or its stock changes.

Alternatives considered:

| Approach | Benefit | Limitation |
| --- | --- | --- |
| Direct SMTP for every event | Least infrastructure | Orders can lose notifications after a process interruption; retries are difficult |
| SMTP with a database outbox for order events (recommended) | Fits Prisma and preserves unsent order notifications | Requires a migration and bounded retry processing |
| External email service and managed queue | Better operational tooling at larger scale | Adds a service beyond the requested SMTP configuration |

## Registration and verification

1. Add `User.emailVerificationRequired`, defaulting to `false`, to distinguish new registrations from existing customers without inventing verification dates for legacy users.
2. New password registrations set it to `true` and leave `emailVerified` unset. Registration no longer creates a logged-in session.
3. Send an email containing a verification link valid for 24 hours. Display an inbox confirmation screen and a resend action.
4. Credentials sign-in rejects an unverified account that requires verification, after checking its password. The login form offers the verification/resend flow.
5. A GET request renders the verification screen; a same-origin POST consumes the token. Mail scanners opening a link must not consume it.
6. Verification atomically consumes a valid token, sets `emailVerified` and invalidates the cached user snapshot. The customer then signs in normally.
7. Existing customer accounts retain their current access. Admin and staff accounts keep their current password sign-in. Google-verified accounts satisfy verification through the existing OAuth rules.
8. An SMTP failure after registration leaves the account pending and offers resend; it must not report that an email was delivered when it was not.

## Forgotten passwords

- Add customer-facing forgot-password and reset-password screens, linked from login.
- The request endpoint returns the same generic result for an unknown email, an eligible customer and an ineligible account. It must not expose whether an account exists.
- Reset links expire after 30 minutes and are usable once. Issuing a new link replaces the previous link for that purpose.
- A reset form submits the token and the new password; opening the link does not change any account data.
- Use the existing 12–128-character customer password policy and bcrypt cost 12.
- Successful reset atomically consumes the token, changes the password, invalidates outstanding reset tokens and cached snapshots, and establishes email ownership. Existing sessions become invalid under the current fingerprint mechanism.
- Admin/staff password recovery stays with existing administrative procedures; public reset endpoints cannot reset privileged accounts.
- Google-only customers can use this ownership-verified flow to set a password; blocked or deleted accounts remain ineligible.

## Token safety

- Generate 32 random bytes and store only a SHA-256 digest in `VerificationToken`, with purpose-specific identifiers containing the user ID.
- Verification and password reset tokens cannot be used interchangeably.
- Token consumption and its account update share a transaction. Simultaneous submissions allow one successful mutation.
- Resend/reset requests are rate limited per IP and normalized email, using the existing database-backed limiter.
- Enforce request size, input validation and origin checks. Invalid/expired links show a recovery action without exposing account internals.
- Links use the configured canonical origin, never an incoming Host header. Authentication pages suppress referrers and analytics that could expose URL tokens.
- SMTP and token errors are sanitized; logs contain neither credentials nor raw tokens.

## Order notifications

- Add an optional email field to checkout and prefill it from the signed-in customer's account. Validate and normalize it server-side, then snapshot it into `Order.customerEmail`.
- A guest can still place a COD order without email. Such an order has no email notification. Account customers can explicitly choose the address for this order.
- Receipt: order code, date/time in Vietnam, purchased products and sizes, quantities, prices, discounts, shipping, total in VND, recipient, address, COD instructions and a tracking button.
- Updates: confirmation, preparation, shipment, completion and cancellation, with the current status and relevant cancellation reason. A multi-step action sends one message for its final state.
- Customer actions, bulk actions and automatic completion use the same notification rules. Notification keys derive from durable events, so a retried checkout or request does not enqueue the same event twice.
- Back-office changes defer dispatch through the existing undo window. Undo cancels the associated unsent notification; a state already communicated requires a correction message when reversed.
- Tracking links must preserve the existing access checks: signed-in customers use their order page; guests open order lookup without exposing phone numbers in URLs.

## Outbox and delivery

Add a mapped Prisma email-job model with a unique event key, order/event references, recipient snapshot, template kind and payload, state, attempt count, next attempt time, lease expiration, sanitized error code and timestamps.

- Insert receipt jobs in the order-creation transaction. Insert update jobs with the corresponding atomic status mutation, including the raw-SQL and auto-completion paths.
- Workers claim a limited batch atomically using leases; concurrent function instances cannot intentionally send the same job concurrently.
- Use bounded exponential retry with at most five attempts. Renew or size leases to cover the bounded SMTP timeout. Clear expired leases so interrupted jobs recover.
- Dispatch after request commit using Vercel `waitUntil`; process due jobs again through maintenance and a bounded authenticated back-office request hook. Do not send email while generating pages at build time.
- The daily cron is a fallback, so quiet periods can delay retries until maintenance. No immediate-retry guarantee is claimed.
- Mark accepted messages sent; distinguish SMTP acceptance from delivery to an inbox. SMTP is at-least-once: a process interruption after SMTP acceptance but before saving completion can still cause a duplicate. Use stable Message-ID values to help diagnostics, without claiming exactly-once delivery.
- Retain job metadata briefly for operations and purge old payloads containing customer information during maintenance.

## Configuration

| Variable | Purpose | Initial local value |
| --- | --- | --- |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | Transport port | `465` |
| `SMTP_SECURE` | TLS from connection start | `true` |
| `SMTP_USER` | SMTP login | Owner-supplied Gmail address |
| `SMTP_PASSWORD` | App password | Owner-supplied value; local secret only |
| `MAIL_FROM_ADDRESS` | Authorized sender mailbox | Same Gmail address initially |
| `MAIL_FROM_NAME` | Displayed sender name | `T'Petie · No Reply` |
| `MAIL_BRAND_NAME` | Brand in subjects and templates | `T'Petie` |
| `MAIL_REPLY_TO` | Optional monitored support mailbox | Unset initially |
| `MAIL_SITE_URL` | Canonical origin used for email links | `http://localhost:3000` locally; HTTPS origin in production |

For port 587, use STARTTLS with `SMTP_SECURE=false` and require the TLS upgrade. Keep certificate verification enabled. Use connection/socket timeouts and disable message/credential debug logging.

A no-reply display name is supported with the provided Gmail mailbox. A literal address such as `noreply@<brand-domain>` requires an authorized mailbox or alias; the application must not fabricate that address. `MAIL_FROM_ADDRESS` makes the future switch explicit.

Production env validation requires complete SMTP configuration because new accounts depend on email verification. Missing local SMTP configuration must fail email-dependent requests clearly, without silently bypassing verification. Commit placeholders only in `.env.example` and document all variables in README and the deployment guide.

## Email layout

- Responsive, approximately 600px-wide email card on a warm cream background, with muted brand accents, dark legible text and a clear wordmark.
- Table-based structure and inline CSS suitable for common mail clients; system fonts rather than external font dependencies.
- Preheader, branded heading, personal greeting, concise explanation, prominent action button and a plain link fallback.
- Order emails use a readable product table and a distinct total block, followed by delivery information and tracking.
- Security emails show expiration, explain what to do when the action was not requested and omit passwords and sensitive account details.
- Every message includes a matching text alternative. Escape customer/product text and validate URLs; do not interpolate untrusted HTML.
- Footer identifies automatic notifications and the brand. If `MAIL_REPLY_TO` is configured, provide the corresponding support route.

## Implementation boundaries

- `src/server/email/`: SMTP transport, delivery and order outbox orchestration; server-only.
- `src/lib/email/`: pure configuration parsing and template rendering for deterministic tests; no runtime secret access.
- `src/server/auth/`: token issuance/consumption and verification/reset services.
- `src/app/api/auth/`: verification, resend, forgotten-password and reset handlers.
- Authentication pages/context, checkout, order services and maintenance integrate these units without introducing browser-to-database access.
- Add the account flag and email job table through a new additive migration; do not rewrite existing migrations.

## Verification and acceptance

- Tests cover token expiry, reuse, simultaneous consumption, purpose isolation, replacement, rate limits, role restrictions and legacy-account access.
- Reset tests verify old-session invalidation and that unknown accounts receive the same public response.
- Outbox tests cover order rollback, retried checkout, bulk changes, undo, auto-completion, SMTP failure, lease recovery and duplicate claims.
- Template tests cover HTML escaping, text versions, VND totals, configured branding and safe tracking links.
- Run SMTP connection/authentication verification without sending a real email. Use a local fake transport for mail-flow checks.
- Run the complete unit suite, TypeScript checks and production build. Review migration SQL and apply it using the repository's normal migration workflow.
- Provide preview artifacts for all template types and a focused SMTP operations guide in English.
- Preserve current unrelated work in the shared checkout. Never publish secrets or perform a production deployment as part of this feature.

## Primary references

- [Nodemailer SMTP transport](https://nodemailer.com/smtp)
- [Google SMTP configuration](https://support.google.com/a/answer/176600?hl=en)
- [Gmail sender addresses and aliases](https://support.google.com/mail/answer/22370?hl=en)
