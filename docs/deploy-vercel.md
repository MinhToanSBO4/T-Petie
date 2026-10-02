# Deploying to Vercel

The storefront, back office and API are one Next.js application, deployed as a single Vercel project. Pages and Route Handlers (`src/app/api`) run as Vercel Functions. The database is Supabase PostgreSQL; images and Excel export files are stored on Cloudinary.

This guide is intended for the project owner and authorized maintainers. For local setup and usage restrictions, see the [project README](../README.md).

## 1. What the repository configures

| File | Purpose |
| --- | --- |
| `vercel.json` | Next.js preset, `npm ci` install, `npm run build` build, functions in `icn1` (Seoul), and a daily cron calling `/api/cron/maintenance` at 20:00 UTC (03:00 in Vietnam). |
| `scripts/build.cjs`, `scripts/lib/deploy-env.cjs` | On Vercel, validate environment variables before building and stop with a list of what to fix. By default, production builds run `prisma migrate deploy` through `DIRECT_URL` and stop if a migration fails; preview builds skip migrations. `MIGRATE_ON_BUILD` overrides this behavior (see section 4). |
| `package.json` (`engines.node`) | Node.js 22.x. |
| `.vercelignore` | Keeps `.env` files, build output, `node_modules`, `archive/` and `docs/reference/` out of deployments uploaded with the Vercel CLI. |
| `src/lib/db/connection-url.ts` | Chooses Prisma connection-pool settings for the environment and adds `pgbouncer=true` to port-6543 URLs. |
| `next.config.mjs` | Cloudinary loader for `next/image`, so Vercel Image Optimization is not used; security headers, including a Content Security Policy and HSTS. |
| `src/app/api/admin/export/route.ts` | Builds the Excel export in the background with `waitUntil` from `@vercel/functions` (`maxDuration` 120 seconds). |

Every database query is a round trip from a function to Supabase, so functions are pinned to `icn1` (Seoul), next to the database in `ap-northeast-2`. Vercel's default region is in the United States and would add a trans-Pacific round trip to every query. If your database is in another region, change `regions` in `vercel.json` to match; `npm run db:verify-structure` warns when the database is not in `ap-northeast-2`.

## 2. Supabase connection strings

In the Supabase dashboard, open **Connect** and copy the pooler connection strings:

| Variable | Pooler | Port | Query parameters |
| --- | --- | --- | --- |
| `CONNECTION_STRING` | Transaction pooler | 6543 | `?schema=<schema>&pgbouncer=true` |
| `DIRECT_URL` | Session pooler | 5432 | `?schema=<schema>` |

```env
CONNECTION_STRING="postgresql://postgres.<project-ref>:<password>@<pooler-host>:6543/postgres?schema=<schema>&pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres?schema=<schema>"
```

- `DIRECT_URL` is used by the Prisma CLI for migrations. The transaction pooler does not support the locks and prepared statements that migrations need, and the build rejects a `DIRECT_URL` on port 6543.
- Both URLs must use the same `?schema=` value (`.env.example` uses `tpetie_app`); the build check fails otherwise, because migrations would run against a different schema than the app.
- Supabase pooler URLs need the `postgres.<project-ref>` user name. URL-encode special characters such as `@`, `#`, `/` and `?` in the password.
- Raw SQL in the app always names the schema explicitly (`table()` in `src/server/db/sql.ts`), because transaction-pooler connections do not keep a `search_path`.

## 3. Prepare the production database

Do this before the first production deployment. If the first production build finds an empty schema, `prisma migrate deploy` applies every migration together with its starter rows: the sample coupons `TPETIE20` and `MEMBERVIP`, default shipping settings, page content and a root category. Cloning the structure instead creates the same tables, empty, and records the migrations as applied.

The production database can be a separate Supabase project or a separate schema in the same project.

1. Copy the production session-pooler URL (port 5432) and append `?schema=<schema>`.
2. Keep `.env` pointed at the development database and run, in an interactive terminal (PowerShell, cmd or the VS Code terminal):

   ```bash
   npm run db:clone-structure
   ```

   Paste the production URL when prompted (the input is hidden and not saved), then type the schema name to confirm. For a non-interactive run, set `TARGET_DATABASE_URL` in the shell and use `npm run db:clone-structure -- --yes`.
3. The script stops without writing anything if the development database has unapplied migrations, the target URL uses the transaction pooler, the target is the same database and schema as the source, or the target schema already contains any table. Otherwise it creates every table, index and foreign key in a single transaction, records all migrations as applied in `_prisma_migrations`, and checks that the target matches the source and that every table is empty.
4. To check the result at any time, run the read-only comparison:

   ```bash
   npm run db:verify-structure
   ```

   It compares the production structure with the development database, checks the migration history, prints the row count of each table and checks the database region.

Later deployments apply only new migrations.

## 4. Create the Vercel project

1. In Vercel, choose **Add New → Project** and import the repository. The install and build commands come from `vercel.json`.
2. Under **Settings → Environment Variables**, add the variables below for *Production*, and for *Preview* if you use preview deployments. Add only these variables; do not import a local `.env` file. Never add `ADMIN_*` or `STAFF_*` account variables: the build stops when one is set.

   | Variable | Production | Value |
   | --- | --- | --- |
   | `CONNECTION_STRING` | Required | Transaction-pooler URL (port 6543) with `?schema=<schema>&pgbouncer=true` |
   | `DIRECT_URL` | Required | Session-pooler URL (port 5432) with the same `?schema=` |
   | `NEXTAUTH_URL` | Required | Production origin with `https://` and no path, for example `https://<your-domain>`. Set it for *Production* only; preview deployments use their own URL. |
   | `NEXTAUTH_SECRET` | Required | New random value of at least 32 characters (`openssl rand -base64 32`); do not reuse the local secret |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Required | Cloudinary credentials |
   | `CRON_SECRET` | Required | Random string of at least 16 characters (`openssl rand -hex 24`). Vercel sends it as `Authorization: Bearer <CRON_SECRET>` when it calls the cron. |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional | Google sign-in (see [Google sign-in](#google-sign-in)). Without them the Google button is hidden and the production build prints a warning. |
   | `NEXT_PUBLIC_GA4_ID` | Optional | Leave unset to use the default GA4 property; set it to send data to another property |
   | `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Optional | Microsoft Clarity project ID |
   | `NEXT_PUBLIC_SITE_URL` | Optional | Public origin for canonical URLs, the sitemap and robots rules, when it differs from `NEXTAUTH_URL` |
   | `MIGRATE_ON_BUILD` | Optional | `0` disables the automatic migration; `1` also migrates preview builds (only when previews have their own database) |

   Preview builds require only `CONNECTION_STRING` and `NEXTAUTH_SECRET`, because pages read the database at build time; other missing values produce warnings.
3. Optionally, check the configuration from your machine before deploying (with the Vercel CLI linked to the project through `vercel link`), then delete the pulled file:

   ```bash
   vercel env pull .env.production.local
   npm run env:check -- --production
   ```

4. Deploy. The build log shows `prisma generate`, any environment warnings or errors, `prisma migrate deploy` (production only), then `next build`.
5. Add your domain, set `NEXTAUTH_URL` to it and redeploy.

## 5. Create the first administrator

Admin accounts never come from environment variables. Point the command at the production database for one run, either by setting `DIRECT_URL` in the terminal session or by editing `.env` temporarily (the command uses `DIRECT_URL` when set, otherwise `CONNECTION_STRING`). In PowerShell:

```powershell
$env:DIRECT_URL = "<production-session-pooler-url>"
npm run admin:create
Remove-Item Env:DIRECT_URL
```

The command prints the target host and schema, prompts for an email, username, display name and password (16–128 characters, hidden) and asks for confirmation before creating the account.

Then sign in at `/login` and:

- Enter the shipping fee at `/admin/settings`. Until it is saved, checkout returns an error.
- Add collections and products, and the page content at `/admin/content`. The root product category is created automatically with the first product.
- Create staff accounts at `/admin/staff`. Administrators change their own password at `/admin/account`.

## 6. Post-deployment checks

- `https://<your-domain>/api/products?limit=1` returns JSON with a `total` field.
- An administrator can sign in at `/login` and open `/admin/orders` and `/admin/products`. A staff account lands on `/staff` and can open `/staff/orders`.
- Place a test order on the storefront, move it through the statuses at `/admin/orders` (try "Chuyển tới…" and "Hoàn tác"), then cancel it.
- The cron endpoint responds to an authorized call and returns `401` without the header:

  ```bash
  curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-domain>/api/cron/maintenance
  ```

  The JSON response contains `completedOrders`, `failedExports`, `purgedExports`, `expiredRateLimits` and `at`.
- The Vercel logs contain no `Timed out fetching a new connection` errors and no `[database]` warnings about the session pooler.

## 7. Operations notes

- **Database access.** The app connects to PostgreSQL only through Prisma on the server; it does not use the Supabase Data API or anon keys. If you restrict network access to the database, make sure Vercel Functions can still connect.
- **Connections.** With the transaction pooler, each function instance opens up to 5 connections and waits up to 20 seconds for a free one. With a session-pooler URL on Vercel the limit drops to 1 and a `[database]` warning is logged. Add `connection_limit` or `pool_timeout` to the URL to override the defaults.
- **Database password.** After changing it, update both `CONNECTION_STRING` and `DIRECT_URL` in Vercel and redeploy.
- **Session secret.** Changing `NEXTAUTH_SECRET` signs every user out.
- **Images.** Images are served by Cloudinary's CDN. The `next/image` loader requests each image at the rendered width with automatic format and quality, so no CDN variable is needed. See [image-inventory.md](image-inventory.md).
- **Idle databases.** Supabase can pause Free-plan projects after a period of inactivity; the daily cron queries the database every day.

### Google Analytics 4

- Production deployments on Vercel send data to the default property defined in `src/app/layout.tsx` unless `NEXT_PUBLIC_GA4_ID` is set. Local and preview builds send nothing unless `NEXT_PUBLIC_GA4_ID` is set. An ID that does not match `G-XXXXXXXXXX` is ignored.
- To switch properties, set `NEXT_PUBLIC_GA4_ID` and redeploy: `NEXT_PUBLIC_` values are inlined at build time.
- Back-office accounts and the `/admin` and `/staff` pages are never tracked.
- Page views, including client-side navigation, rely on GA4 Enhanced measurement, so keep it enabled for the web data stream. Setting the property's currency to VND and its time zone to Vietnam keeps reports consistent with the shop.
- The storefront also sends e-commerce events such as `view_item`, `add_to_cart`, `begin_checkout` and `purchase` (with the order code, revenue in VND and items), plus `login`, `select_size` and `open_size_guide`.
- To verify, open the site in a private window without signing in and check **Reports → Realtime** in GA4, or filter the browser's network panel by `collect` and look for requests to `google-analytics.com/g/collect`.

### Google sign-in

Create an OAuth client of type *Web application* in Google Cloud with the authorized redirect URI `https://<your-domain>/api/auth/callback/google` (add `http://localhost:3000/api/auth/callback/google` for local development). Set `GOOGLE_CLIENT_ID` (it ends in `.apps.googleusercontent.com`) and `GOOGLE_CLIENT_SECRET`, then redeploy. The Google button appears only when both are set.

## 8. Platform limits

- **Cron frequency.** On the Hobby plan, Vercel runs cron jobs at most once a day and may trigger them at any time within the scheduled hour. Completing overdue orders and failing stalled exports also happen when the back office is used; deleting expired export files and rate-limit counters happens only in the cron.
- **Request size.** Vercel Functions accept request bodies of up to 4.5 MB. Images are compressed in the browser before upload. Back-office uploads send one image per request, and the server accepts JPEG, PNG, WebP and AVIF files of up to 4 MB; review photos are sent together and are limited to 4 MB in total.
- **Function duration.** The export route sets `maxDuration` to 120 seconds and the cron route to 60 seconds; both must fit within your plan's limit. For much larger exports, move the work to a background queue.
- **Session cache.** Account changes, such as blocking a user, take effect immediately on the instance that handled them and within 15 seconds on the others.
- **Dependency maintenance.** Run `npm audit` against the current lockfile before a release and review each advisory's affected versions and available fixes. Record unresolved advisories with the release checks.

## 9. References

- Vercel: [`vercel.json`](https://vercel.com/docs/project-configuration/vercel-json), [Functions limitations](https://vercel.com/docs/functions/limitations), [Managing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing), [`@vercel/functions`](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
- Prisma and Supabase: [Prisma with Supabase](https://www.prisma.io/docs/orm/overview/databases/supabase), [Supabase guide for Prisma](https://supabase.com/docs/guides/database/prisma), [Supavisor and Prisma](https://supabase.github.io/supavisor/orms/prisma/)
# SMTP email configuration

Production requires SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, MAIL_FROM_ADDRESS and MAIL_SITE_URL. Configure MAIL_BRAND_NAME/MAIL_FROM_NAME for branding and optional MAIL_REPLY_TO for support. MAIL_SITE_URL must be the public HTTPS origin. Use an authorized sender mailbox/alias. The additive `20261005_smtp_email` migration is applied by the existing production migration workflow. See [SMTP operations](smtp-email.md) for diagnostics, retries and `npm run email:verify` (no message sent).
