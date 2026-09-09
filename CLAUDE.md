# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`coral-studio` is a pnpm/Turborepo monorepo for Glumački Studio, a non-profit acting studio in Belgrade run by Coral Mizrachi:

- **`apps/studio-web/`** — the marketing site and member area (Next.js App Router). See `apps/studio-web/CLAUDE.md` for its architecture, content source of truth, and coding conventions.
- **`apps/mobile-app/`** — the companion Expo/React Native app. See `apps/mobile-app/CLAUDE.md` for dependency-isolation rules specific to Expo in this workspace.
- **`packages/*`** — code shared between `studio-web` and `mobile-app` (see `packages/README.md`). Keep `react`, `react-dom`, `react-native`, `expo`, and `next` out of these packages — those must stay isolated in each app's own `package.json` to avoid native/version collisions between the Next.js and Expo builds.

## Commands

Run from the repo root; Turborepo fans these out to whichever workspace(s) they apply to:

```
pnpm dev      # start dev servers
pnpm build    # production build
pnpm start    # run production build(s)
pnpm lint     # lint all workspaces
```

Target a single workspace with `--filter`, e.g. `pnpm --filter studio-web dev` or `turbo run build --filter=studio-web`.

Package manager is pnpm (workspaces declared in `pnpm-workspace.yaml`; single root `pnpm-lock.yaml` — don't introduce npm/yarn lockfiles or per-package lockfiles).
