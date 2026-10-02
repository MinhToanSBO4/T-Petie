# T'Petie

T'Petie is the online store of a Vietnamese children's clothing brand. It combines the storefront, customer accounts, cash-on-delivery checkout and a back office for the shop's administrators and staff in a single full-stack Next.js application. The storefront UI is in Vietnamese.

This is a personal project. All rights are reserved; no permission to use, copy, modify or distribute the project is granted. It is not open source and does not accept contributions. See [LICENSE](LICENSE) for the full terms.

## Features

### Storefront

- Homepage, collection lookbooks (`/collections`), the catalog (`/girls` and its product-type pages), a sale page (`/sale`) and product pages (`/products/[slug]`).
- Catalog filters for price (presets or a custom range), size, colour, product type, collection, availability, sale items, new arrivals and rating, with sorting and pagination. Filter state is kept in the URL.
- Search with instant product suggestions; matching ignores Vietnamese diacritics.
- Size guide, published customer feedback (`/feedback`), and about, store and policy pages.
- Sitemap, robots rules, canonical product URLs and structured data.

### Cart and checkout

- The cart is stored in the browser; "buy now" checks out a single item without the cart.
- Cash-on-delivery checkout for guests and signed-in customers.
- Prices, stock, shipping fee and coupons are re-quoted on the server, and each order is created and its stock deducted in a single database transaction.

### Customer accounts

- Customer registration with email and password, plus optional Google sign-in when both OAuth credentials are configured.
- Google sign-in can link an existing customer account with the same verified email. The linking rules protect email ownership and exclude admin and staff accounts; see [authentication and roles](docs/architecture.md#authentication-and-roles).
- Admin and staff sign-in with username or email and password.
- Account page (`/dashboard`) with profile and default address, a baby profile with size suggestions, and password change.

### Orders and tracking

- Signed-in customers see their orders at `/orders`, grouped by status and with a timeline. They can cancel an order until the shop confirms it, confirm delivery of a shipped order and buy the same items again.
- Anyone can track an order at `/order-lookup` with the order code and the phone number used at checkout.

### Product reviews

- Customers can review items from their own completed orders within 30 days, with up to 5 photos and one edit. Reviews are published immediately; the shop can reply to, hide or delete them.

### Back office

- Separate areas for administrators (`/admin`) and staff (`/staff`); each role is redirected to its own area.
- Order processing by status, with bulk actions, multi-step moves and a short undo window.
- Management of products, collections, website content, reviews and customer feedback screenshots, backed by a shared Cloudinary media library.
- Administrators only: sales dashboard, customers (including issuing temporary passwords), staff accounts, sales settings (shipping fee, free-shipping threshold, coupons) and a background Excel export.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| UI | Tailwind CSS 3, Framer Motion, Lucide icons |
| Database | PostgreSQL on Supabase, Prisma ORM 5 |
| Authentication | NextAuth.js 4 (credentials, optional Google), bcrypt |
| Media and files | Cloudinary (images and export files), ExcelJS |
| Hosting | Vercel (Functions, Cron, `@vercel/functions`) |
| Analytics | Google Analytics 4, optional Microsoft Clarity |

## Architecture at a glance

Pages, Server Components and the HTTP API (`src/app/api`) are built and deployed together; there is no separate backend service. Business logic and the shared Prisma client live in `src/server`, and only server code reaches PostgreSQL. Browser code calls the internal API over HTTP and never receives database credentials.

```text
Browser ──HTTP──► Route Handlers (src/app/api) ──► src/server ──► Prisma ──► PostgreSQL (Supabase)
Server Components (src/app) ─────────────────────► src/server ──► Prisma ──► PostgreSQL (Supabase)
```

See [docs/architecture.md](docs/architecture.md) for directory rules, authentication, the order lifecycle and caching.

## Getting started

These instructions are for the project owner and maintainers with the owner's written permission.

### Prerequisites

- Node.js 22.x (the `engines` field in `package.json`) and npm. `npm test` imports TypeScript files directly and needs Node.js 22.18 or later.
- A PostgreSQL database. The project is set up for Supabase and its connection poolers.
- A Cloudinary account, required for image uploads and Excel exports.
- Optional: a Google OAuth client, for Google sign-in.

### 1. Install

```bash
git clone <repository-url>
cd T-Petie
npm ci
```

`npm ci` also runs `prisma generate` through the `postinstall` script.

### 2. Configure environment variables

Create `.env` from `.env.example` and fill in the values. The database URLs must stay in `.env`, because the Prisma CLI reads only that file. The other variables can stay in `.env` or move to `.env.local`, which Next.js also loads and which takes precedence. Both files are ignored by Git; never commit real values.

| Variable | File | Required | Purpose |
| --- | --- | --- | --- |
| `CONNECTION_STRING` | `.env` | Always | PostgreSQL URL used by the app, including `?schema=<schema>`. Locally, use the Supabase session pooler (port 5432). |
| `DIRECT_URL` | `.env` | Always | URL used by the Prisma CLI for migrations: session pooler (5432) or a direct connection, never the transaction pooler (6543). Commands such as `prisma migrate deploy` stop with an error when it is missing. Locally it can equal `CONNECTION_STRING`; the `?schema=` value must match. |
| `NEXTAUTH_URL` | `.env` or `.env.local` | Production | Site origin, `http://localhost:3000` locally. |
| `NEXTAUTH_SECRET` | `.env` or `.env.local` | Always | Secret that signs session tokens. Generate one with `openssl rand -base64 32`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `.env` or `.env.local` | Production | Image uploads and export files. `CLOUD_NAME`, `CLOUD_API_KEY` and `CLOUD_API_SECRET` are accepted as alternatives. |
| `CRON_SECRET` | `.env` or `.env.local` | Production | Random string of at least 16 characters; `/api/cron/maintenance` rejects requests without `Authorization: Bearer <CRON_SECRET>`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `.env` or `.env.local` | Optional | Enable Google sign-in when both are set. |
| `NEXT_PUBLIC_GA4_ID` | `.env` or `.env.local` | Optional | GA4 measurement ID (`G-…`). When unset, only Vercel production builds send analytics, to the default property set in `src/app/layout.tsx`. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | `.env` or `.env.local` | Optional | Microsoft Clarity project ID. |
| `NEXT_PUBLIC_SITE_URL` | `.env` or `.env.local` | Optional | Public origin for canonical URLs, Open Graph, the sitemap and robots rules. Falls back to `NEXTAUTH_URL`. |

"Production" means the value is optional locally but required by the production build check. Admin and staff accounts are never configured through environment variables. Run `npm run env:check` to validate the configuration; it fails if `ADMIN_*` or `STAFF_*` account variables are set.

### 3. Set up the database

The application's tables live in the PostgreSQL schema named by the `?schema=` parameter (`tpetie_app` in `.env.example`), not in `public`. In the Supabase Table Editor, switch the schema selector to see them.

For a new, empty schema:

```bash
npx prisma migrate deploy   # create the tables (npm run dev also applies pending migrations)
npm run content:seed        # optional: add the default website content blocks
```

Besides the tables, the migrations insert a few starter rows: default shipping settings, two sample coupons, a root category, the size guide and the homepage feature block. They do not create products; add the catalog through the back office. The first migration expects an empty schema.

### 4. Create the first administrator

```bash
npm run admin:create
```

The command prompts for an email, username, display name and password (16–128 characters, not echoed), asks for confirmation and stores a bcrypt hash in the database given by `DIRECT_URL` (or `CONNECTION_STRING`). It needs an interactive terminal such as PowerShell, cmd or the VS Code terminal; in Git Bash, run `winpty npm.cmd run admin:create`. Administrators create staff accounts at `/admin/staff`.

### 5. Run the development server

```bash
npm run dev
```

Open <http://localhost:3000>. The `predev` hook (`scripts/dev-sync.cjs`) first applies pending migrations and regenerates Prisma Client when `prisma/schema.prisma` has changed.

When returning to development after a production build, stop any server using this repository, then run:

```bash
node scripts/clean-next-cache.cjs
npm run dev
```

The cleanup script removes only the local `.next` directory and rejects symbolic links. Run it from the repository root, while `.next` exists. It removes the production build as well as cached files; run `npm run build` again before using `npm start`.

| Problem | Fix |
| --- | --- |
| `Unknown field … for select statement` after pulling schema changes | Stop the dev server and run `npm run dev` again. The dev server also warns at startup when Prisma Client is older than the schema. |
| Missing `vendor-chunks` files under `.next` | Stop the dev server, run `node scripts/clean-next-cache.cjs`, then start it again. |
| `npm run build` fails on Windows while the dev server is running | Stop `npm run dev` first: `prisma generate` cannot replace the Prisma engine DLL while the dev server holds it. |

## Available scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the Next.js dev server, after the `predev` hook has synced migrations and Prisma Client. |
| `npm run build` | Runs `prisma generate`, then `scripts/build.cjs`: on Vercel it validates environment variables and, for production, runs `prisma migrate deploy`; then `next build`. |
| `npm start` | Serves the production build (`next start`). |
| `npm test` | Runs the unit tests in `tests/`. |
| `npm run lint` | Runs `next lint`. ESLint is not installed or configured in this repository, so this script does not currently work. |
| `npm run prisma:generate` | Regenerates Prisma Client. |
| `npm run prisma:migrate` | Runs `prisma migrate dev`. Prisma may offer to reset the database when it detects drift; decline unless the database is disposable. |
| `npm run admin:create` | Creates an administrator interactively. |
| `npm run env:check` | Validates environment variables; add `-- --production` to apply the production rules. |
| `npm run content:seed` | Creates default website content blocks that are missing; never overwrites edited content. |
| `npm run content:check` | Checks content management against a running dev server (see below). |
| `npm run media:migrate` | Re-uploads images to the configured Cloudinary account (see [docs/image-inventory.md](docs/image-inventory.md)). |
| `npm run db:clone-structure` | Copies the database structure, without data, into an empty production schema. |
| `npm run db:verify-structure` | Read-only comparison of a production database with the database configured in `.env`. |

The database scripts are described in [docs/deploy-vercel.md](docs/deploy-vercel.md).

## Testing and verification

```bash
npm test           # unit tests; no database or network access needed
npx tsc --noEmit   # type check
npm run build      # production build
```

- ESLint is not set up, so `npm run lint` is not part of the checks.
- Node.js may print `MODULE_TYPELESS_PACKAGE_JSON` warnings when the tests import TypeScript modules. Check the test results and exit code; these warnings do not indicate failed assertions.
- A local `npm run build` reads the configured database to prerender pages but does not change its schema or data. Only Vercel production builds migrate automatically. To migrate as part of a local build, set `MIGRATE_ON_BUILD=1` and `DIRECT_URL` in the shell environment; `scripts/build.cjs` does not read `.env` files.

### Local checks against a running dev server

These scripts call the server at `NEXTAUTH_URL` (default `http://localhost:3000`) and use the database configured in `.env`. Scripts that create data remove it in a `finally` block; scripts that need a back-office login either create temporary accounts or prompt for credentials in the terminal. Run them only against a development database.

| Command | What it checks |
| --- | --- |
| `node scripts/smoke-local.cjs` | Key pages and APIs respond; optional admin and staff sign-in |
| `node scripts/verify-data-source.cjs` | The catalog API matches the active database records |
| `node scripts/check-commerce.cjs` | Server-side quotes with shipping fee and coupons |
| `node scripts/check-customer-flow.cjs` | Customer registration, sign-in and baby profile |
| `node scripts/check-order-flow.cjs` | Checkout, stock and coupon usage, and their restoration on cancellation |
| `node scripts/check-order-workflow.cjs` | Back-office status changes, undo, cancellation reasons and auto-completion |
| `node scripts/check-new-product-flow.cjs` | A product created through the admin API appears in the storefront |
| `node scripts/check-purchase-review-flow.cjs` | Customer orders page and verified-purchase reviews |
| `node scripts/check-collection-pages.cjs` | Collection lifecycle and collection pages |
| `npm run content:check` | Website content, collection menu and feedback publishing |
| `node scripts/check-admin-flow.cjs` | Back-office layout, role redirects, content editor and reviews |
| `node scripts/check-admin-features.cjs` | Product and variant editing, image order, coupons and permissions |
| `node scripts/check-admin-dashboard.cjs` | Dashboard figures, permissions, media deletion guards and pagination |
| `node scripts/check-export-flow.cjs` | Background Excel export and download |
| `node scripts/check-staff-reset.cjs` | A staff password reset ends the old session (the password is restored afterwards) |
| `node scripts/measure-local.cjs`, `node scripts/measure-admin.cjs` | Response times of public and back-office pages |

Checks that do not need the server:

| Command | What it checks |
| --- | --- |
| `node scripts/check-internal-links.cjs` | Static `href` links point to existing pages |
| `node --env-file=.env scripts/check-cloudinary.cjs` | Cloudinary accepts the configured credentials (secrets are masked) |
| `node scripts/db-preflight.cjs` | Database tables and columns match the Prisma schema |

## Deployment

The app is deployed to Vercel as a single project. `vercel.json` sets the install and build commands, runs functions in the `icn1` (Seoul) region next to the database, and schedules a daily maintenance cron (`/api/cron/maintenance`). On Vercel, the build validates environment variables first. By default, production builds then run `prisma migrate deploy`, while preview builds skip migrations. `MIGRATE_ON_BUILD` overrides this behavior; see the deployment guide before changing it. Do not upload `.env` or `.env.local` files; configure variables in the Vercel dashboard.

Follow [docs/deploy-vercel.md](docs/deploy-vercel.md) for the full procedure.

## Project structure

| Path | Contents |
| --- | --- |
| `src/app` | App Router pages, layouts and Route Handlers (`src/app/api`) for the storefront, `/admin` and `/staff` |
| `src/server` | Server-only code: Prisma client, authentication, catalog, orders, reviews, content, media, back-office queries and security (rate limiting, origin checks) |
| `src/components` | React components, grouped by feature |
| `src/context` | Client providers for the session, cart and toasts |
| `src/hooks` | Client hooks |
| `src/client` | Browser-only helpers: analytics, image compression and upload, HTTP helpers |
| `src/lib` | Pure functions and constants shared by client and server: pricing, filters, validation, formatting |
| `src/types` | Shared TypeScript types, including the NextAuth type extensions |
| `src/middleware.ts` | Role-based redirects for `/`, `/admin` and `/staff` |
| `prisma/schema.prisma` | Prisma data model |
| `prisma/migrations` | SQL migrations: schema changes plus starter rows, no sample products |
| `scripts` | Build, dev, database, account and local check scripts |
| `tests` | Unit tests run by `npm test` |
| `docs` | Project documentation |

## Documentation

| Document | Contents |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Runtime model, directory rules, authentication and roles, order lifecycle, data and caching |
| [docs/deploy-vercel.md](docs/deploy-vercel.md) | Supabase connection strings, production database setup, Vercel configuration, post-deployment checks, analytics and platform limits |
| [docs/image-inventory.md](docs/image-inventory.md) | Where images and generated files are stored and how they are managed |
| `docs/reference/` | Historical planning material in Vietnamese (system audit, refactor plan, target database design); not maintained |

## License

Copyright (c) 2026 T'Petie. All rights reserved. This is proprietary software: no one may use, copy, modify or distribute it without prior written permission. See [LICENSE](LICENSE).
# SMTP email

Customer email verification, password recovery and order notifications use configurable SMTP with branded Vietnamese HTML/text templates. See [SMTP operations](docs/smtp-email.md) for environment variables, migration, preview and verification commands. Configure secrets only in ignored local env or hosting-provider server settings.
