# SMTP Email Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the approved SMTP, customer verification/reset and transactional order emails.
**Architecture:** Pure configuration/templates and token policy; server-only SMTP and transactional Prisma token/outbox services. Existing order services own atomic enqueue and undo cancellation.
**Tech Stack:** Next.js 14, Prisma 5/PostgreSQL, Nodemailer, bcrypt, Node test runner.
**Spec:** ../specs/2026-10-02-smtp-email-design.md (approved by owner).

## Global Constraints
- Vietnamese customer copy; English operations documentation.
- 24-hour verification, 30-minute reset, 32 random bytes, SHA-256 storage, bcrypt cost 12, passwords 12–128 characters.
- Legacy access preserved; only active, non-deleted customers use public recovery.
- SMTP secrets stay in ignored local env. Canonical URLs, inline escaped HTML and text alternatives.
- Atomic order outbox; five attempts, recoverable leases, undo delay and cancellation.

## Review Focus
- Concurrent token submissions and replacement: one valid account mutation.
- Unknown/privileged/blocked accounts: same public recovery result.
- SMTP interruption and expired leases: recover without rolling back orders.
- Bulk/jump/undo/auto-complete: final-state message and atomic event enqueue.
- Malicious customer text/URLs and analytics: no HTML injection or token leakage.

### Task 1: SMTP and templates
Files: src/lib/email/{config,templates}.ts, src/server/email/transport.ts, tests/email.test.mjs, .env.example, package.json.
Interfaces: readMailConfig(env), renderEmail(config,payload), sendEmail(to,payload,messageId?).
- [x] Write behavioral config/template tests; run `node tests/email.test.mjs` (expected missing feature failure).
- [x] Implement transport/config and four branded templates; repeat command (expected pass).

### Task 2: Account verification and recovery
Files: src/lib/email/tokens.ts, src/server/auth/email-tokens.ts, src/app/api/auth/email/[action]/route.ts, register route, auth options/context, registration/login and security pages.
Interfaces: issueAccountEmail(email,purpose), consumeAccountToken(raw,purpose,password?), requiresEmailVerification(user).
- [x] Add token purpose/expiry/eligibility tests; run email test (expected missing feature failure).
- [x] Implement atomic issue/consume and protected APIs; add confirmation/resend and reset forms.
- [x] Run email tests and `npx tsc --noEmit` (expected pass after schema generation).

### Task 3: Order outbox
Files: prisma schema/new additive migration, src/server/email/outbox.ts, order services, checkout, admin orders API, cron.
Interfaces: enqueueOrderEmail(tx,orderId,eventKey,kind,status,note?,delay?), dispatchEmailJobs().
- [x] Add outbox policy tests; run email tests (expected missing feature failure).
- [x] Implement leased worker and atomic enqueue for receipt/status/undo/automatic completion; collect checkout email.
- [x] Run fake transport and database integration tests for rollback, claims, failure, retry, undo and token races.

### Task 4: Operations and verification
Files: docs/smtp-email.md, scripts/email-*.cjs, README/deployment guide/env validation.
- [x] Configure owner-supplied SMTP only in ignored env; verify connection without sending.
- [x] Generate preview artifacts and apply additive migration through migrate deploy.
- [x] Run `npm test`, `npx tsc --noEmit`, `npm run build`; inspect all outputs.
- [x] Review completed diff and report actual validation and limitations.

## Execution record
- Baseline `npm test`: passed (existing Node module-type warnings).
- Execute in shared checkout to preserve owner's extensive uncommitted work; no automatic commits or worktree relocation.
- Owner approved the design and implementation; continue without another approval gate.

### Completed verification
- SMTP transport/templates, customer verification/reset UI/API and transactional outbox are implemented.
- `node scripts/dev-sync.cjs`: additive migration applied successfully to configured local schema; generated Prisma Client matches schema.
- `npm test`: complete regression suite passed, including fake SMTP cancellation and email template/config tests. Additional Clarity bootstrap regression test passed after addition.
- `npm run email:test`: isolated schema integration checks passed for hashed/purpose/expiry/replacement/racing tokens, recovery role/origin/rate limits, SMTP outage registration/resend, verification login gating, legacy access, Google-only password setup, order idempotency/rollback, job claims, retries, live-send undo/correction and automatic completion. Temporary schema removed; no real mail sent.
- `npx tsc --noEmit`: passed on final source.
- `npm run build`: final production build passed (96 static pages, security pages and APIs present).
- `node scripts/check-email-pages.cjs`: production HTTP checks passed for forms, no-referrer/no-store/CSP, POST-only token consumption and cross-origin rejection.
- `npm run email:verify`: Gmail connection/authentication passed without sending a message. Local SMTP and maintenance credentials remain in Git-ignored env.
- Secret check: supplied SMTP app password absent from 408 repository text artifacts.
- Four HTML/text previews generated; receipt preview rendered in Edge and visually inspected.

### Independent review and fixes
- Reviewer inspected SMTP scope without reading env secrets. Token transaction ordering and role checks accepted.
- Fixed Clarity template escaping and used full navigation into registration confirmation. Executed actual generated bootstrap against security/storefront paths.
- Fixed undo classification/claim race with row locks and delayed corrections for in-flight delivery; integration test passed.
- Fixed SMTP timeout to destroy the real socket. Slow fake SMTP test passed; a memory-only mutation removing socket destruction failed at the expected assertion (RED/GREEN evidence).
- Fixed maintenance runtime budgeting and customer mutation route duration. Registration now shares transport email validation.
- Deferred minor: automatic completion during customer page rendering enqueues mail for the authenticated admin hook/daily maintenance fallback. No page-render SMTP side effects were added; quiet-period delay is documented in the approved design and operations guide.
- Work remains in the shared checkout, uncommitted, without deployment; unrelated owner changes retained.
