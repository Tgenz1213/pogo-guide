# Contributing to pogo.guide

First off, thank you for considering contributing to pogo.guide! It's people like you that make it a great resource for the Pokémon GO community.

The following is a set of guidelines for contributing to pogo.guide. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please report unacceptable behavior to the project maintainers.

## Monorepo Overview

This project is a monorepo using `pnpm` workspaces. It consists of two main codebases:

- **/web**: The frontend Nuxt 4 + Vue 3 application deployed to Cloudflare Pages.
- **/studio**: The Sanity Studio v5 backend CMS for managing the site's content.

## Local Development Setup

To get started with local development:

1.  **Prerequisites**: Ensure you have Node.js (>= 22.0.0) and pnpm (>= 9.0.0) installed.
2.  **Install Dependencies**: Run `pnpm install` from the repository root.
3.  **Run Development Servers**:
    - Web: `pnpm --filter web dev`
    - Studio: `pnpm --filter studio dev`

## Development Guidelines

### Architecture & Standards

Please review the Architectural Decision Records (ADRs) located in `/docs/adr/` before starting significant work. Key principles include:

1.  **Strict TypeScript**: Strict mode is enabled. The `any` type and untyped CMS query mappings are prohibited.
2.  **Dead Code Elimination**: We use Knip to ensure unused exports and dependencies are caught before committing. Run `pnpm run knip` to verify.
3.  **CMS-Driven Routing**: Navigation, breadcrumbs, and tags are driven by Sanity CMS GROQ schemas.
4.  **Zod API Validation**: All public endpoints must validate payloads securely using Zod schemas to protect edge isolates.

### Testing (TDD & Evidence First)

- Write a failing test first.
- Verify the failure.
- Implement the solution.
- Verify the passing run before declaring the work done.
- Run the Vitest suite: `pnpm --filter web run test`

### Committing & Pull Requests

- **No Premature Commits**: Ensure your code is fully tested and reviewed before committing.
- **Linting & Formatting**: Husky git hooks are configured to run linting and formatting on staged files automatically. You can run `pnpm run lint` manually.
- **Security Guardrails**: Ensure all user inputs and API endpoints are properly validated.

## Submitting Changes

1.  Fork the repository and create your branch from `main`.
2.  Ensure your code adheres to our architectural standards and passes all tests.
3.  Run `pnpm run knip` and `pnpm lint` to ensure no dead code or linting errors exist.
4.  Submit a pull request with a clear description of the problem and the solution.

Thank you for contributing!
