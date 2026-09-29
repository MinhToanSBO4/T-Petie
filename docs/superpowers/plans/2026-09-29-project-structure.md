# Project Structure Refactor Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the existing Next.js full-stack application show its browser, server, shared, and archival boundaries in directory names without changing routes or behavior.

**Architecture:** Keep Next.js App Router HTTP endpoints in `src/app/api`. Move DB access, authentication configuration, and business services into `src/server`; move React hooks and browser caches into `src/hooks` and `src/client`. Keep pure calculations and constants in `src/lib`. Move tracked design references into `docs/reference` and the ignored old repo into `archive/legacy-site`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, PostgreSQL.

**Spec:** User request in conversation on 2026-09-29.

## Global Constraints

- Preserve public URLs, API contracts, DB schema and existing user edits in `yêu cầu.txt`.
- Keep the old repo excluded from builds and Git.
- FE never imports `src/server` or Prisma.

## Review Focus

- Moved imports resolve in routes, pages, scripts and tests.
- `server-only` prevents accidental browser imports of DB services.
- Root documentation paths stay correct.
- Local build still succeeds without changing DB data.
- Git stage does not contain ignored env files or the archived repo.

### Task 1: Server boundary

**Files:** Move `src/lib/{prisma,auth,rate-limit,catalog}.ts`, `src/lib/orders/{quote-order,create-order}.ts`, `src/lib/password-reset.ts` into matching `src/server` folders; update imports in `src` and `tests/security.test.mjs`.

- [x] Move files and update all callers.
- [x] Add `server-only` guards to server entrypoints.
- [x] Run `npx tsc --noEmit` and `npm test`.

### Task 2: Browser boundary and references

**Files:** Move the two hooks to `src/hooks`; browser cache, cart selection and analytics tracker to `src/client`; tracked reference files to `docs/reference`; ignored repo to `archive/legacy-site`. Update imports, tests, README, `.gitignore` and `tsconfig.json`.

- [x] Move files and update all callers.
- [x] Add a boundary test that rejects Prisma/server imports from client modules.
- [x] Run `npm test`, `npx tsc --noEmit`, `npm run build` and local smoke tests.

### Task 3: Document and deliver

**Files:** `README.md`, `docs/architecture.md`, `CAN_BAN_BO_SUNG.md`.

- [x] Document FE → API/server → Prisma → Supabase data flow.
- [x] Check Git diff and preserve user's existing working-tree edits.
- [x] Commit and push changes to the existing PR branch.
