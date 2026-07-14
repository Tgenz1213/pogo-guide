---
title: "GDPR-Compliant Bans"
status: "Accepted"
scope: "web/server/db/**/*.ts,web/server/routes/auth/**/*.ts,web/server/api/admin/**/*.ts"
---

## Context

When a user requests account deletion under GDPR, we must remove their personally identifiable information (PII). However, if they were banned for spam or abuse, we must prevent them from simply re-registering with the same OAuth identity.

## Decision

The `users` table `id` is a composite of `${provider}:${providerAccountId}`.
In the `infractions` table, the `userId` foreign key uses `ON DELETE SET NULL`. We store a hashed version of the user's provider identity in `identityHash`.
A separate `banned_identities` table permanently stores the `hashed_identity`.

There is exactly one canonical hash: `sha256(providerAccountId + pepper)`, where `pepper` comes from `NUXT_HASH_PEPPER`. Every call site that writes or checks `banned_identities.hashed_identity` or `infractions.identityHash` — OAuth login routes, admin moderation actions, or anything else — must use a single shared hashing utility that implements this exact computation. No call site may reimplement the hash inline.

## Consequences

- **Pros:** We can safely delete the `users` row (removing all PII like username), but the `infractions` remain for historical metrics, and the user remains banned via `banned_identities`.
- **Cons:** Requires a secure hashing mechanism (pepper) for the identity hash to prevent reversing the hash to discover the original PII. A divergent implementation at any call site (different input, different algorithm) fails silently — nothing errors, but ban enforcement stops working for that path.
