---
title: "Secure Edge Endpoint Zod Validation"
status: "Accepted"
scope: "web/server/api/**/*.ts"
---

## Context

External API data parsed at Cloudflare Edge isolates could facilitate security injections or format crashes if unchecked.

## Decision

Validate structure, payload size, and content limits strictly at the server boundary using standard Zod schemas.
