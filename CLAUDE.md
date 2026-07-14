# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

`pogo.guide` is a content-driven Pokémon GO guide platform. It's a pnpm monorepo with two primary codebases (`web`, `studio`) plus two supporting packages, deployed entirely on Cloudflare:

- **`web/`** — Nuxt 4 + Vue 3 frontend, deployed to Cloudflare Workers (nitro `cloudflare_module` preset). Owns the public site, user auth, moderation admin UI, and all server API routes.
- **`studio/`** — Sanity Studio v5 CMS (React-based) for editing guide content.
- **`packages/shared-utils/`** — `@pogo/shared-utils`, shared Zod schemas, sanitization, and idempotency helpers used by both `web` and `queue-consumer`.
- **`packages/queue-consumer/`** — Standalone Cloudflare Worker that consumes `POGO_QUEUE` messages and performs Sanity mutations (guide/suggestion submissions land here, not written directly by the web server).
- **`docs/adr/`** — Architecture Decision Records; read before changing data model, routing, or auth/moderation behavior.

## Common Commands

Run from the repo root unless noted.

```bash
pnpm install                    # install all workspaces
pnpm lint                       # eslint (root+web) + studio lint
pnpm lint:fix
pnpm typecheck                  # runs `typecheck` in every workspace (nuxi/tsc)
pnpm knip                       # dead code / unused deps check (gates CI)
```

Web (`pnpm --filter web ...`):

```bash
pnpm --filter web dev                  # nuxt dev server (localhost:3000)
pnpm --filter web build                # nuxt build (cloudflare_module output -> web/.cloudflare)
pnpm --filter web test                 # alias for test:ui
pnpm --filter web test:ui              # vitest, jsdom, tests/**/*.test.ts (excludes e2e & server)
pnpm --filter web test:server          # vitest against real Cloudflare Workers pool (wrangler.test.jsonc), tests/server/**
pnpm --filter web test:server:ci       # builds first, then runs test:server (CI-accurate)
pnpm --filter web test:e2e             # full Playwright suite
pnpm --filter web test:e2e:smoke       # tests/e2e/smoke.spec.ts only — this is what CI runs on every push
pnpm --filter web typegen               # regenerate Sanity GROQ types (run after schema changes in studio/)
pnpm --filter web d1:migrate:preview:local   # apply D1 migrations to local persisted state
```

To run a single vitest test file: `pnpm --filter web exec vitest run tests/path/to/file.test.ts -c vitest.config.ts` (UI tests) or `-c vitest.server.config.ts` (server tests). For a single Playwright spec: `pnpm --filter web exec playwright test tests/e2e/some.spec.ts`.

Studio (`pnpm --filter studio ...`): `dev`, `build`, `deploy`, `deploy-graphql`, `lint`, `lint:fix`.

Queue consumer (`pnpm --filter queue-consumer ...`): `dev` (loads env from `web/.dev.vars`), `test`, `test:integration` (hits Sanity `preview` dataset), `test:e2e:queue`, `deploy`, `deploy:preview`.

Shared utils (`pnpm --filter @pogo/shared-utils ...`): `lint`, `typecheck`, `test`.

## Architecture

### Data model split: Sanity vs. D1

Content and infra state are deliberately kept in separate systems, and code needs to keep them in sync manually:

- **Sanity** (`studio/schemaTypes/`) is the source of truth for guides, categories, tags, resources, and suggestions content.
- **Cloudflare D1** (`web/server/db/schema.ts`, Drizzle ORM) holds operational/relational state: `users`, `infractions`, `guide_submissions`, `banned_identities`, `account_deletion_requests`, `guide_reports`. Access it via `useDB(event)` (`web/server/utils/db.ts`), never instantiate Drizzle directly.
- D1 tables must stay in strict 3NF — no derived/cached fields (e.g. don't cache `isBanned` on `users`; compute it from `infractions.expiresAt`). See `docs/adr/0007-database-3nf-strictness.md`.
- Moderation is a **soft delete** pattern: Sanity documents use `isHiddenByModeration` (never hard-delete a guide in Studio — the custom document action in `studio/actions/softDeleteAction.ts` toggles the flag instead). A webhook (`web/server/api/webhooks/sanity.post.ts`) syncs that flag into D1 `guide_submissions.status = 'rejected'`. **Every GROQ query reading guides must filter `isHiddenByModeration != true`** — this isn't enforced automatically. See `docs/adr/0006-sanity-soft-deletes.md`.
- GDPR: `users.id` is `${provider}:${providerAccountId}`. Deleting a user's D1 row is safe (FKs are `ON DELETE SET NULL`) because ban enforcement lives in the separate, permanent `banned_identities` table keyed by a hashed identity — not on the `users` row. Don't add logic that assumes `infractions.userId` is non-null. See `docs/adr/0008-gdpr-compliant-bans.md`.

### Async write path via Cloudflare Queues

User-submitted content (guides, suggestions) is never written to Sanity synchronously from the web server. The flow is:

1. `web/server/api/submit-guide.post.ts` / `submit-suggestion.post.ts` validate with Zod schemas from `@pogo/shared-utils`, run Turnstile + honeypot + rate-limit checks, then push a versioned envelope (`{ version, type, messageId, idempotencyKey, ... }`) onto `POGO_QUEUE`.
2. `packages/queue-consumer` (a separate Worker) consumes the queue, validates the envelope again (`queueMessageSchema`), sanitizes/transforms content (`sanitizeGuideHtml`, `htmlToPortableTextBlocks`), and issues the actual Sanity mutations (`generateGuideMutations` in `packages/queue-consumer/src/index.ts`), using deterministic/idempotent doc IDs (`guide-${idempotencyKey}`, `category-suggested-${slug}`, etc.) so retries don't duplicate content.
3. Poison messages route to per-environment DLQs (`pogo-{dev,preview,production}-dlq`); see `packages/queue-consumer/README.md` for the manual triage/replay procedure — never blindly replay without fixing the root cause first.
4. If a request lacks the `POGO_QUEUE` binding (local dev without wrangler bindings) and isn't production, API routes fall back to a mock-success response — don't mistake this for the queue actually being exercised in local testing.

### Auth & admin

- Auth is via `nuxt-auth-utils` with Discord/Google OAuth routes in `web/server/routes/auth/`.
- Admin status is **not** stored as a flag checked at request time in the naive sense — `isEmailAdmin` (`web/server/utils/admin.ts`) checks against `INITIAL_ADMIN_EMAILS`, while Studio's own admin gate (`studio/schemaTypes/auth.ts`, `isAdministrator`) checks Sanity user roles. These are two independent admin concepts (web app admin vs. Studio admin) — don't conflate them.
- Redirect targets after login must go through `sanitizeRedirectPath` (`web/shared/utils/auth.ts`) to prevent open-redirect/protocol-relative bypasses; it has several deliberate defense-in-depth layers (raw pattern check, decode-then-recheck, `parseURL` host/protocol check) — don't simplify it without understanding why each layer exists.

### Validation & security boundaries

- Zod is mandatory at every public API boundary (`docs/adr/0004-zod-api-validation.md`); schemas live in `packages/shared-utils/src/validation.ts` and are shared between `web` and `queue-consumer` so both sides agree on shape.
- `web/server/middleware/rate-limiter.ts` rate-limits only `/api/submit-suggestion` and `/api/submit-guide` using a Cloudflare KV namespace (`POGO_RATE_LIMIT`), 3 requests/60s per IP; it fails open (allows the request) if the KV binding or a KV operation fails, by design.
- Turnstile verification and rate limiting are both skipped when `NUXT_PUBLIC_E2E_MODE=true` (set in `playwright.config.ts`'s `webServer.env`) — this is intentional for E2E, not a bug.

### TypeScript & code quality gates

- Strict TypeScript everywhere; `any` and untyped Sanity/GROQ query mappings are prohibited (`docs/adr/0001-strict-typescript.md`). Run `pnpm --filter web typegen` after changing Sanity schemas so GROQ types stay accurate.
- Knip (`knip.ts`) enforces no dead code/unused deps per-workspace and gates CI (`quality` job in `.github/workflows/ci.yaml`). If you intentionally add an export only consumed externally (e.g. a Cloudflare entry point), add it to `entry` in `knip.ts` rather than suppressing the warning ad hoc.
- ESLint config is a single flat config at the repo root (`eslint.config.mjs`) built on the Nuxt-generated config, with `studio/**` ignored (Studio lints separately via its own Sanity ESLint config since it's a React codebase).
- Husky + lint-staged run on commit (`.husky/pre-commit`) — formatting/lint/tests scoped to staged files per workspace (see `lint-staged` config in root `package.json`).

## Testing Structure (web)

Three distinct Vitest configs, kept deliberately separate — don't merge them:

- `vitest.config.ts` ("ui") — jsdom environment, component/page tests, `tests/**/*.test.ts` excluding `e2e/` and `server/`.
- `vitest.server.config.ts` ("server") — runs against the real Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers` and `wrangler.test.jsonc`, for `tests/server/**`. CI applies D1 migrations to a real preview database before running this (`web-server-integration` job) — the test DB is verified to differ from both prod and to match the configured preview DB before tests run.
- Playwright (`playwright.config.ts`) — `tests/e2e/**`, sequential (`fullyParallel: false`, `workers: 1`) because tests share a real database and would conflict if parallelized. CI only runs the `smoke` subset on every push; the full suite is not gated in `ci.yaml`.

## CI Behavior Worth Knowing

- `queue-consumer` integration/E2E jobs only run when the diff touches `packages/queue-consumer/`, `packages/shared-utils/`, `web/server/api/submit-guide.post.ts`, or the wrangler configs (path-filtered via a `git diff` check in the `queue-e2e-changes` job) — don't expect them to run on unrelated changes.
- Deploy (to production) only runs on push to `main` and requires every other job to have succeeded — D1 migrations are applied to production before the app is deployed.

## Iron Rules (from project AI guidelines)

These are pre-existing project conventions (originally documented for AI pair-programmers in `GEMINI.md`) that still apply:

- **No premature commits**: don't run `git commit` until the human has reviewed the change, unless explicitly told otherwise for this session.
- **TDD & evidence first**: write a failing test, verify it fails, implement, verify it passes — don't declare work done without that loop.
