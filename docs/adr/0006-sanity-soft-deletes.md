# 6. Sanity Soft Deletes for Moderation

Date: 2026-05-27

## Status

Accepted

## Context

Admins moderate user-submitted guides in Sanity Studio. If an admin deletes a guide in Sanity, the D1 database `guide_submissions` table will still have a reference to the deleted `sanityDocId`, leading to a split-brain state and broken frontend links.

## Decision

We are disabling the default destructive "delete" action in Sanity Studio for guides. Instead, we use a custom Document Action that toggles a boolean `isHiddenByModeration`. We also implemented a webhook that syncs this boolean to the D1 `guide_submissions` table (`status = 'rejected'`). All frontend GROQ queries are filtered using `&& isHiddenByModeration != true`.

## Consequences

- **Pros:** State remains perfectly synced between Sanity and D1. Moderation actions are reversible.
- **Cons:** Developers must remember to append the `isHiddenByModeration` filter to all GROQ queries.
