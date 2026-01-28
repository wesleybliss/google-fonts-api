# AGENTS.md

Agent guidelines for automated agents in this repo.

## Tech Stack

- **Frontend Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Linting & Formatting:** Biome

## General Rules

- **Do not make any Git commits.**
- Use modern ES7+ syntax.
- **Package Manager:** `pnpm` (do not use npm or yarn).
- **Environment:** Node.js environment for tooling/SSR, Browser for the client-side app.
- **Files:** Use kebab-case for filenames generally, but match existing conventions (e.g., `page.tsx`, `layout.tsx`).

## Commands

- **Development:** `pnpm dev` (Runs Next.js dev server)
- **Build:** `pnpm build` (Builds for production)
- **Start:** `pnpm start` (Runs the production server)
- **Linting/Formatting:**
  - `pnpm lint` (Check & Fix)
  - `pnpm lint:format` (Format only)
  - `pnpm lint:lint` (Lint only)

## Code Style Guidelines

- **Indentation:** 4 spaces (per `biome.json`).
- **Line Endings:** Unix (LF).
- **Quotes:** Single quotes (per `biome.json`).
- **Semicolons:** As needed (avoid unnecessary ones, but respect `biome.json` setting).
- **Max Line Length:** 120 characters.
- **Extensions:** `.tsx` for React components, `.ts` for logic/utilities.
- **Imports:**
    - Use absolute imports with `@/` alias where possible.
    - Group imports logically.
- **Spacing:**
    - Space before blocks (`if (...) {`).
    - Space after keywords (`if`, `for`, `return`).
    - Object curly spacing: Always.
- **Naming:**
    - `PascalCase` for React components.
    - `camelCase` for variables/functions.
    - `kebab-case` for file names (except special Next.js files).
- **React:**
    - Functional components with Hooks.
    - Server Components by default in `app/`. Add `'use client'` at the top for Client Components.
- **Check Your Work:** Always run `pnpm lint` before finishing a task to ensure Biome compliance.

## Project Structure

- `app/`: Application routes (Next.js App Router).
- `public/`: Static assets.
