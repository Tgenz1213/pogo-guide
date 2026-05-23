---
title: "Strict TypeScript Usage"
status: "Accepted"
scope: "web/**/*.{ts,vue},studio/**/*.ts"
---

## Context

Zero-guesswork typing is critical to prevent runtime bugs and simplify schema generations across frontend and CMS.

## Decision

Enable compiler strict-mode workspaces. Disallow `any` declarations and untyped REST/CMS query responses.
