# 7. Database Third Normal Form (3NF) Strictness

Date: 2026-05-27

## Status

Accepted

## Context

We need to track user infractions. A naive approach might sum infraction weights and store them in the `users` table directly to speed up "banned" logic.

## Decision

All D1 tables must strictly adhere to Third Normal Form (3NF). We will not store derived data or transitive dependencies (like `total_penalty_weight` or caching `isBanned` if it derives from `infractions.expiresAt`).

## Consequences

- **Pros:** Prevents data anomalies, ensures absolute source of truth, eliminates the need for complex trigger syncing.
- **Cons:** Requires more complex JOINs or application-level calculation to determine a user's current standing based on their infractions.
