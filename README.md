# Google Fonts API

Minimal Next.js app for experimenting with a Google Fonts API-style experience and preview UI.

## Overview

This repository is a lightweight sandbox for building a fonts listing + preview interface. It uses the Next.js App Router and Tailwind v4 and keeps the codebase intentionally small so you can iterate quickly.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Biome (linting + formatting)

## Getting Started

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

## Useful Commands

- `pnpm dev` - Run the development server
- `pnpm build` - Build for production
- `pnpm start` - Start the production server
- `pnpm lint` - Lint and format with Biome
- `pnpm lint:format` - Format only
- `pnpm lint:lint` - Lint only

## Project Structure

- `app/` - Next.js App Router routes and layout
- `public/` - Static assets
- `app/globals.css` - Tailwind v4 entry point and global styles

## Notes

If you add API routes, place them under `app/api/` so they can be deployed alongside the UI.
