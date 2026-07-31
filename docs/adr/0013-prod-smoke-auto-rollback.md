---
title: "Production Smoke Test & Automatic Rollback"
status: "Accepted"
scope: ".github/workflows/ci.yaml,web/playwright.prod.config.ts,web/tests/e2e/smoke.spec.ts"
---

## Context

The pre-existing `web-e2e-smoke` CI job runs before `deploy` against a freshly-booted local `pnpm dev` server (`web/playwright.config.ts`, `baseURL: http://localhost:3001`). It is a useful pre-deploy sanity gate, but it never touches the real Cloudflare Worker, the production Sanity dataset, or the production D1 database — nothing in CI previously verified the _deployed_ production site actually worked, and a broken deploy would only be caught by a human noticing.

Cloudflare Workers deploys via `wrangler deploy` are atomic and instantly global; there is no built-in canary/gradual-rollout step in this pipeline today.

## Decision

Add a post-deploy check against the real production URL (`https://pogo.guide`), and automatically roll back the Worker if it fails:

1. The `deploy` job captures the currently-live Worker version (`wrangler deployments list --env production --json`) _before_ deploying, and exposes it as a job output (`previous_version_id`).
2. A new `prod-smoke` job (`needs: [deploy]`) runs the existing `tests/e2e/smoke.spec.ts` spec against production via a dedicated config (`web/playwright.prod.config.ts`, no local `webServer`), retrying up to 3 times, 10s apart, to absorb cold starts/transient blips.
3. A new `prod-rollback` job (`needs: [deploy, prod-smoke]`) runs only when `prod-smoke` fails, and calls `wrangler rollback <previous_version_id> --env production` to revert to the pre-deploy version.
4. `prod-smoke`'s failure alone marks the GitHub Actions run red — that's the alert. No new alerting integration (Slack/PagerDuty/Sentry) was added; this can change later without revisiting this ADR.
5. Rollback is **code-only**. D1 migrations are assumed backward-compatible with the immediately-prior Worker version (consistent with `docs/adr/0007-database-3nf-strictness.md`'s no-derived-fields discipline), so reverting the Worker without touching the database is safe. This mechanism does not and cannot undo a migration.
6. Scope is the web app Worker only — `packages/queue-consumer` has no equivalent smoke check (an HTTP smoke test can't exercise a queue consumer) and is not covered by this rollback.

## Consequences

- **Pros:** A broken production deploy is detected and reverted automatically within several minutes of going live (job spin-up, dependency installs, up to 3 smoke retries, and the rollback job's own install all add up — this is not a sub-minute mechanism), using only tools already in the pipeline (`wrangler`, `jq`, GitHub Actions) — no new secrets or third-party integrations.
- **Cons:** There is still a window (deploy time + up to ~20s of smoke retries) where all production traffic hits the bad version before rollback completes — this is a detect-and-revert mechanism, not a zero-exposure canary. Any migration that is _not_ backward-compatible with the previous Worker version breaks the safety assumption this rollback depends on; such migrations require a manual, multi-step rollout instead of relying on this mechanism, and should be flagged as such in their own PR. Extending this to `packages/queue-consumer` or to a gradual/percentage-based deploy model is future work, not covered here. An infrastructure blip unrelated to the deploy itself (edge network issue, DNS hiccup, runner network fault) that fails all 3 smoke attempts will trigger a rollback of perfectly good code — the retries and static-markup assertions reduce but don't eliminate this false-positive risk.
