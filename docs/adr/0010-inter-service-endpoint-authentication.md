---
title: "Inter-Service Endpoint Authentication"
status: "Accepted"
scope: "web/server/api/webhooks/**/*.ts,web/server/api/e2e-login.post.ts,packages/queue-consumer/**/*.ts"
---

## Context

Some HTTP endpoints exist purely for service-to-service communication (the Sanity → web moderation webhook), operational debugging (the queue-consumer's HTTP fallback route), or CI/test-harness use against real deployed infrastructure (the web app's `e2e-login` route, which the queue-preview-e2e CI job authenticates against so it can exercise submit-guide's session check against the live preview worker), not for direct end-user traffic. These sit outside the Turnstile/honeypot/rate-limit protections built for public submission endpoints (see `docs/adr/0011-rate-limiting-bot-protection.md`), so they need their own, distinct defense — and historically have had none, which is a defect rather than a deliberate omission.

## Decision

Every endpoint not intended for direct public/browser use — inbound webhooks and internal or debug HTTP routes — must verify a shared secret or provider-issued signature before performing any mutation, and must fail closed (`401`/`403`, no side effects) when verification fails or the required secret is unconfigured. Debug/operational routes must additionally be inert (`404`, not just `401`) in production unless explicitly enabled via a scoped secret, so their existence isn't discoverable by an unauthenticated caller.

## Consequences

- **Pros:** Removes an entire class of "forgot to protect this because it's not public-facing" bugs; makes the trust boundary of every endpoint explicit and auditable rather than implicit.
- **Cons:** Requires provisioning and rotating additional secrets (webhook signing secret, debug token) per environment, and adds a verification step to webhook-handling latency.
