# Queue Consumer

This package contains the Cloudflare Worker responsible for consuming the `POGO_QUEUE` and mutating the Sanity CMS.

## Local Development

- `pnpm --filter queue-consumer run dev` loads env vars from `web/.dev.vars`.
- The worker accepts either `SANITY_*` or `NUXT_SANITY_*` env names for local runs.
- Ensure your local env file includes a Sanity write token (`SANITY_WRITE_TOKEN`, `NUXT_SANITY_WRITE_TOKEN`, `SANITY_API_WRITE_TOKEN`, or `NUXT_SANITY_API_WRITE_TOKEN`).

## `/__debug/process` HTTP debug route

This Worker's `fetch` handler exposes `POST /__debug/process`, which parses a body against `queueMessageSchema` and runs it through `processEnvelope`/`mutateSanity` directly, **bypassing the entire queue pipeline** (no queue-side validation-on-enqueue, no Turnstile/honeypot/rate-limiting from `web`). It exists purely for **local/dev debugging** of the mutation-generation logic — it is not part of the production request path and must never be used to submit real content.

Per `docs/adr/0010-inter-service-endpoint-authentication.md`, this route requires a bearer token:

- The request must include `Authorization: Bearer <token>`, checked with a timing-safe comparison against the `DEBUG_PROCESS_TOKEN` secret.
- If `DEBUG_PROCESS_TOKEN` is unset, or the supplied token doesn't match, the route responds `401 Unauthorized` in `development`/`preview` (`env.ENVIRONMENT` is anything other than `"production"`).
- In `production` (`env.ENVIRONMENT === "production"`), a missing/invalid/unconfigured token instead responds `404 Not Found`, so the route's existence isn't discoverable by an unauthenticated caller. Production deploys do **not** have `DEBUG_PROCESS_TOKEN` provisioned, so the route is inert there by default.

To use it locally, set `DEBUG_PROCESS_TOKEN` in `web/.dev.vars` (or your local env) and send the header:

```bash
curl -X POST http://localhost:8787/__debug/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEBUG_PROCESS_TOKEN" \
  -d '{ ... queueMessageSchema-shaped envelope ... }'
```

To provision the secret for a deployed non-production environment (e.g. `preview`):

```bash
pnpm --filter queue-consumer exec wrangler secret put DEBUG_PROCESS_TOKEN --env preview
```

## DLQ (Dead Letter Queue) Procedure

When a message fails to process due to a `PermanentMessageError` (e.g., schema validation failure) or exhausts its maximum retries (e.g., persistent transient errors), Cloudflare Queues natively routes the poison message to a Dead Letter Queue (DLQ).

### Configured DLQs:

- Dev: `pogo-dev-dlq`
- Preview: `pogo-preview-dlq`
- Production: `pogo-production-dlq`

### Operational Procedure for Poison Messages:

1. **Triage First**: Do **NOT** blindly replay messages. Investigate the schema or Sanity constraints that caused the failure.
2. **Review Logs**: Search Cloudflare worker logs for `message_permanent_error` or `message_unexpected_error` tied to the logical `messageId`.
3. **Fix the Root Cause**: Update the consumer's schemas, the `generateGuideMutations` logic, or Sanity's database constraints.
4. **Deploy Fixes**: Ensure fixes are deployed to the environment.
5. **Replay**: Only after the bug is fixed, replay the messages from the DLQ manually via the Cloudflare dashboard or Wrangler CLI.
