---
title: "Dead Code Elimination via Knip"
status: "Accepted"
scope: "**/*"
---

## Context

Unused files and orphan exports slow down local development, increase build sizes, and complicate Edge deployment structures.

## Decision

Integrate static analysis with Knip, executing checks on every commit via git hooks and blocking CI on any unresolved errors.
