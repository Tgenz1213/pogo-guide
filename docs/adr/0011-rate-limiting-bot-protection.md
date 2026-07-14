---
title: "Rate Limiting & Bot Protection"
status: "Accepted"
scope: "web/server/middleware/rate-limiter.ts,web/server/api/submit-*.ts"
---

## Context

Public submission endpoints (`submit-guide`, `submit-suggestion`) are the primary spam/abuse vector, since they ultimately create real content via the async pipeline (`docs/adr/0009-async-submission-pipeline.md`). Protection at this layer must not turn a Cloudflare KV outage into a site-wide outage for legitimate users.

## Decision

Both submission endpoints share a single rate-limiter middleware (`web/server/middleware/rate-limiter.ts`) backed by a Cloudflare KV namespace (`POGO_RATE_LIMIT`), capped at 3 requests/60s per IP. Rate limiting **fails open** (allows the request through) if the KV binding or a KV operation errors — this is a deliberate availability-over-strictness tradeoff for this layer, not an oversight. Both endpoints must also independently verify a Turnstile token and a honeypot field before enqueuing. Turnstile verification and rate limiting are both skipped only when `NUXT_PUBLIC_E2E_MODE=true` (set in `playwright.config.ts`'s `webServer.env`), which is intentional for E2E testing.

Any content-submission endpoint that omits either the shared rate-limiter middleware or Turnstile verification (outside E2E mode) is a defect, not an intentional exception, unless documented here as one.

## Consequences

- **Pros:** Consistent, predictable bot defense across every content-creation endpoint; a KV outage degrades to "temporarily unprotected" rather than "submissions broken."
- **Cons:** A sustained KV outage removes rate limiting entirely — an accepted risk. Because the fail-open behavior is easy to mistake for a bug, any change to it must be treated as a decision revision here, not a silent "fix."
