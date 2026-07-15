---
title: "Sanity Soft Deletes for Moderation"
status: "Accepted"
scope: "web/**/*.{ts,vue},studio/**/*.ts"
---

## Context

Admins moderate user-submitted guides in Sanity Studio. If an admin deletes a guide in Sanity, the D1 database `guide_submissions` table will still have a reference to the deleted `sanityDocId`, leading to a split-brain state and broken frontend links.

## Decision

We are disabling the default destructive "delete" action in Sanity Studio for guides. Instead, we use a custom Document Action that toggles a boolean `isHiddenByModeration`. We also implemented a webhook that syncs this boolean to the D1 `guide_submissions` table (`status = 'rejected'`). All frontend GROQ queries are filtered using `&& isHiddenByModeration != true`.

The webhook (`web/server/api/webhooks/sanity.post.ts`) is authenticated per `docs/adr/0010-inter-service-endpoint-authentication.md`: it verifies Sanity's `sanity-webhook-signature` header (an HMAC-SHA256 signature over the raw request body, keyed with a shared secret configured on the Sanity Studio webhook and sourced from the `SANITY_WEBHOOK_SECRET`/`NUXT_SANITY_WEBHOOK_SECRET` environment binding) before touching D1, and fails closed with `401` and no D1 mutation if the signature is missing, invalid, or the secret is unconfigured.

## Consequences

- **Pros:** State remains perfectly synced between Sanity and D1. Moderation actions are reversible. Only genuine Sanity webhook deliveries can flip a guide's moderation status in D1.
- **Cons:** Developers must remember to append the `isHiddenByModeration` filter to all GROQ queries. The webhook secret must be provisioned and kept in sync between the Sanity Studio webhook configuration and the web server's environment per deployment environment.
