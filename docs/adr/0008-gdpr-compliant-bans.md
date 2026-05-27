# 8. GDPR-Compliant Bans

Date: 2026-05-27

## Status

Accepted

## Context

When a user requests account deletion under GDPR, we must remove their personally identifiable information (PII). However, if they were banned for spam or abuse, we must prevent them from simply re-registering with the same OAuth identity.

## Decision

The `users` table `id` is a composite of `${provider}:${providerAccountId}`.
In the `infractions` table, the `userId` foreign key uses `ON DELETE SET NULL`. We store a hashed version of the user's provider identity in `identityHash`.
A separate `banned_identities` table permanently stores the `hashed_identity`.

## Consequences

- **Pros:** We can safely delete the `users` row (removing all PII like username), but the `infractions` remain for historical metrics, and the user remains banned via `banned_identities`.
- **Cons:** Requires a secure hashing mechanism (pepper) for the identity hash to prevent reversing the hash to discover the original PII.
