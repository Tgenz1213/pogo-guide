---
title: "CMS-Driven Content & Navigation"
status: "Accepted"
scope: "web/pages/**/*"
---

## Context

To avoid hardcoded references or site updates requiring code deploys, dynamic layouts and navigation links must map cleanly to schema hierarchies.

## Decision

Directly load categorization, dynamic tags, and structural links at compile-time via Sanity GROQ and auto-generated TypeScript mappings.
