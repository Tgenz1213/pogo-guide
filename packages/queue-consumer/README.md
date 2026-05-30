# Queue Consumer

This package contains the Cloudflare Worker responsible for consuming the `POGO_QUEUE` and mutating the Sanity CMS.

## Local Development

- `pnpm --filter queue-consumer run dev` loads env vars from `web/.dev.vars`.
- The worker accepts either `SANITY_*` or `NUXT_SANITY_*` env names for local runs.
- Ensure your local env file includes a Sanity write token (`SANITY_WRITE_TOKEN`, `NUXT_SANITY_WRITE_TOKEN`, `SANITY_API_WRITE_TOKEN`, or `NUXT_SANITY_API_WRITE_TOKEN`).

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
