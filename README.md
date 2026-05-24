# pogo.guide Monorepo

Content-driven Pokemon GO guide platform built with a Nuxt web app and a Sanity Studio CMS in a pnpm workspace.

## Stack

- Monorepo: pnpm workspaces
- Frontend: Nuxt 4 + Vue 3 + Tailwind CSS
- CMS: Sanity Studio v5
- Quality: TypeScript strict mode, ESLint, Prettier, Knip
- Testing: Vitest + Playwright

## Repository Layout

```text
.
├─ web/      # Nuxt frontend app
├─ studio/   # Sanity Studio CMS
├─ docs/adr/ # Architecture Decision Records
└─ package.json
```

## Prerequisites

- Node.js >= 24.16.0
- pnpm >= 11.2.2

## Getting Started

Install all dependencies from the repository root:

```bash
pnpm install
```

Run apps in separate terminals:

```bash
pnpm --filter web dev
pnpm --filter studio dev
```

Typical local URLs:

- Web: http://localhost:3000
- Studio: shown by Sanity CLI on start

## Common Commands

From the repo root:

```bash
# Lint all workspaces
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Dead code / unused exports and deps
pnpm knip
```

Web workspace:

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web preview
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web typegen
```

Studio workspace:

```bash
pnpm --filter studio dev
pnpm --filter studio build
pnpm --filter studio deploy
pnpm --filter studio deploy-graphql
pnpm --filter studio lint
pnpm --filter studio lint:fix
```

## Architecture Notes

Core project decisions are documented in `docs/adr`:

- 0001: strict TypeScript across workspaces
- 0002: dead code checks with Knip
- 0003: CMS-driven routing and navigation
- 0004: Zod validation for API boundaries

## Git Hooks

Husky + lint-staged are configured at root. On commit, staged files are linted/formatted automatically.

## Notes

- This repository uses pnpm workspaces (`pnpm-workspace.yaml`).
- Keep root and workspace dependency installs in sync using pnpm only.
