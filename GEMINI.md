# GEMINI.md - AI Developer Guide & Workspace Context

Welcome! This file contains general environment context, package structures, and architectural standards for **Gemini** (and other AI developers) pair programming on the `pogo.guide` monorepo.

---

## 1. Workspace Codebases

The monorepo manages two distinct codebases under the `/web` and `/studio` directories:

```text
/
├── .github/                 # Pinned GitHub Action workflows and Dependabot groups
├── .husky/                  # Git hooks (Linting, Formatting)
├── docs/
│   └── adr/                 # Foundational Architectural Decision Records (ADRs)
├── studio/                  # Sanity Studio v5 Backend codebase (CMS)
├── web/                     # Nuxt 3 Frontend codebase (CF Pages deployment)
├── eslint.config.mjs        # Unified ESLint 10 Flat Config (Workspace-wide)
├── knip.json                # Dead code analyzer (Workspace-wide)
├── package.json             # Workspace root config
└── pnpm-workspace.yaml      # Monorepo workspaces configuration
```

---

## 2. Core Development Commands

When executing tasks inside this workspace, use standard `pnpm` operations:

| Action | Standard Command |
| :--- | :--- |
| **Workspace Install** | `pnpm install` |
| **Run Frontend Web** | `pnpm --filter web dev` |
| **Run CMS Studio** | `pnpm --filter studio dev` |
| **Analyze Dead Code** | `pnpm run knip` |
| **Run Linter Checks** | `pnpm run lint` |
| **Run Vitest Suite** | `pnpm --filter web run test` |

---

## 3. Key Architectural Decisions (ADRs)

Refer to `/docs/adr/` for complete architectural decision records:
1. **0001-strict-typescript:** Compiler strict-mode is enabled across workspaces. The `any` type and untyped CMS query mappings are prohibited.
2. **0002-knip-dead-code:** Unused exports and dependencies are strictly blocked on pre-commit and CI pipelines.
3. **0003-cms-driven-routing:** Navigation links, breadcrumbs, and tags are dynamically compiled from CMS GROQ typegen schemas rather than hardcoded.
4. **0004-zod-api-validation:** Strict validation is enforced using Zod schemas at Cloudflare Edge isolates to secure edges.

---

## 4. Iron Rules for AI Agents

* **No Premature Commits:** Stop and wait for your human developer partner to explicitly review and accept changes before running any `git commit` command.
* **TDD & Evidence First:** Write a failing test, verify the failure, implement the solution, and verify the passing run before declaring work done.
* **Security Guardrails:** All public suggestion endpoints must validate payload bounds securely using Zod schemas.
