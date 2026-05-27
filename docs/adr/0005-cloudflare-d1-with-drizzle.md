# 5. Cloudflare D1 with Drizzle ORM

Date: 2026-05-27

## Status

Accepted

## Context

We need a relational database to store user sessions, infractions, banned identities, and guide submission state. Because we are deploying the Nuxt application to Cloudflare Pages (Edge), using a traditional Postgres database like Supabase or AWS RDS would introduce high latency due to connection pooling and round trips from edge nodes to a central region.

## Decision

We will use **Cloudflare D1**, the native SQLite database at the edge, integrated with **Drizzle ORM**.

## Consequences

- **Pros:** Near-zero latency for edge requests, simplified infrastructure (all inside Cloudflare), no traditional connection pooling limits.
- **Cons:** SQLite limitations (no native enums, though enforced via Drizzle), no built-in vector search (yet).
