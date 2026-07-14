---
title: "Auth & Authorization Model"
status: "Accepted"
scope: "web/server/routes/auth/**/*.ts,web/server/utils/admin.ts,web/shared/utils/auth.ts,studio/schemaTypes/auth.ts"
---

## Context

The platform has two separately deployed surfaces with their own notion of "admin" — the public web app and the Sanity Studio CMS — that are easy to conflate because they share the word "admin" but not an implementation.

## Decision

Authentication on the web app is via `nuxt-auth-utils` with Discord and Google OAuth providers (`web/server/routes/auth/`). Web-app admin status (`isEmailAdmin`, checked against `INITIAL_ADMIN_EMAILS`) and Studio admin status (`isAdministrator`, checked against Sanity user roles) are two independent authorization systems and must never be treated as interchangeable in code, comments, or docs. Every OAuth provider callback route must determine and self-heal a user's admin status using the single shared `isEmailAdmin()` utility (`web/server/utils/admin.ts`) — no provider callback may reimplement allowlist parsing inline, and no provider may skip re-checking admin status on a returning user's login. Post-login redirect targets must always be passed through `sanitizeRedirectPath` (`web/shared/utils/auth.ts`) before use; its layered checks (raw pattern check, decode-then-recheck, `parseURL` host/protocol check) are deliberate defense-in-depth against open-redirect and protocol-relative bypasses and must not be simplified without understanding why each layer exists.

## Consequences

- **Pros:** Clear separation between the two admin surfaces prevents accidental privilege bleed between the web app and Studio; centralizing allowlist logic in one utility prevents provider-specific drift.
- **Cons:** An admin who needs access to both surfaces must be granted it separately in each system. `isEmailAdmin()` and `sanitizeRedirectPath` become single points that every OAuth provider integration must correctly call — adding a new provider without wiring both is a defect.
