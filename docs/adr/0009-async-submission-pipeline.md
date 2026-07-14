---
title: "Async Submission Pipeline via Cloudflare Queues"
status: "Accepted"
scope: "web/server/api/submit-*.ts,packages/queue-consumer/**/*.ts,packages/shared-utils/**/*.ts"
---

## Context

User-submitted content (guides, suggestions) must be validated, moderated-ready, and safely retryable without blocking the edge request or risking duplicate Sanity writes if a retry occurs. Writing directly to Sanity from the web server on every submission would couple request latency to Sanity's availability and make retries unsafe.

## Decision

`web/server/api/submit-guide.post.ts` and `submit-suggestion.post.ts` never write to Sanity synchronously. They validate with Zod schemas from `@pogo/shared-utils`, run Turnstile + honeypot + rate-limit checks, then push a versioned envelope (`{ version, type, messageId, idempotencyKey, ... }`) onto `POGO_QUEUE`. A separate Worker, `packages/queue-consumer`, consumes the queue, re-validates the envelope (`queueMessageSchema`), sanitizes/transforms content, and performs the actual Sanity mutations using deterministic, idempotent document IDs (`guide-${idempotencyKey}`, `category-suggested-${slug}`, etc.) so retries never duplicate content. Poison messages route to per-environment dead-letter queues (`pogo-{dev,preview,production}-dlq`) and must be triaged manually — never blindly replayed without fixing the root cause.

Any HTTP entry point that performs the same class of Sanity mutation outside this pipeline (bypassing queue validation, sanitization, and idempotency) breaks the safety guarantees this design exists to provide, and must not exist without equivalent protections applied to it directly.

## Consequences

- **Pros:** The web server never blocks on, or needs write credentials to, Sanity directly; retries are safe due to idempotent doc IDs; poison messages are isolated in a DLQ instead of crash-looping or silently dropping content.
- **Cons:** Validation logic must be kept in sync in two places (web and queue-consumer), which is why it's centralized in `@pogo/shared-utils`. Any new content-mutation entry point must go through this same queue path, not a shortcut.
