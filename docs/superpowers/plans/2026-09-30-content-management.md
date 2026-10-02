# Content Management Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let admin and staff manage collection presentation and genuine customer feedback, while removing sample-account and integration-key hardcoding.

**Architecture:** Keep Next.js HTTP routes in `src/app/api`, database access in `src/server` and Prisma, browser forms in `src/components/admin`. Public content is read server-side and cached briefly; admin mutations revalidate affected tags and paths. No testimonials are seeded.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, React, Node tests.

**Spec:** User request on 2026-09-30.

## Global Constraints

- Preserve existing catalog, order and authentication behavior.
- Only published feedback with confirmed permission appears publicly.
- Do not print, commit or hardcode real credentials; keep user environment files untouched.
- Staff and admin may manage collections and testimonials. Account provisioning remains a command, never part of build.

### Task 1: Database and validation

- [x] Add collection menu/home visibility fields and testimonial model/migration.
- [x] Add pure validation for collection/testimonial writes with tests for invalid URLs, ratings, text and publish permission.
- [x] Apply migration to local Supabase schema, generate client.

### Task 2: Collection management

- [x] Implement complete admin collection GET/POST/PATCH/DELETE with safe archive semantics and cache invalidation.
- [x] Build focused collection management UI and link from admin navigation.
- [x] Make public header/home collection lists follow DB flags and order without fixed limits.

### Task 3: Customer feedback

- [x] Implement admin/staff feedback CRUD and publish state.
- [x] Render published feedback at end of home as accessible static cards, with no placeholder review.
- [x] Verify public data never contains draft/unconsented items.

### Task 4: Accounts and environment audit

- [x] Consolidate bootstrap account scripts into one environment-driven provisioning command.
- [x] Remove sample usernames/emails and inactive service-key fallbacks from source/docs.
- [x] Validate public analytics IDs before inserting into scripts; document all env variables.

### Task 5: Verification and delivery

- [x] Run tests, TypeScript, Prisma validation, build and local API checks.
- [x] Review staged paths for credentials; preserve existing user files.
- [x] Commit, push branch and open PR against `dev`.
