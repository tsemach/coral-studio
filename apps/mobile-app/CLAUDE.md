# CLAUDE.md (mobile-app)

This file provides guidance to Claude Code (claude.ai/code) when working with code in `apps/mobile-app/`. See the root `CLAUDE.md` for the overall monorepo layout.

## What this is

Expo/React Native companion app for Glumački Studio (scaffolded with `blank-typescript`; not yet built out). Its backend is `studio-web`'s Next.js app, which acts as the token/signaling controller for LiveKit — the mobile app connects to LiveKit directly for media, the same way the web app does, just with `@livekit/react-native` components instead of `<video>` tags.

## Commands

Run from `apps/mobile-app/` (or via `pnpm --filter mobile-app <script>` from the repo root):

```
pnpm start    # expo start
pnpm android  # expo start --android
pnpm ios      # expo start --ios (macOS only)
pnpm web      # expo start --web
```

LiveKit relies on native camera/mic/WebRTC modules, so it cannot be tested in the plain Expo Go sandbox — use an Expo Development Build (`npx expo run:ios` / `npx expo run:android`) once LiveKit is wired in here.

## Dependency isolation (important)

This is a pnpm workspace shared with `studio-web` (Next.js/React 19) and `packages/*`. Expo pins exact `react`/`react-native` versions per SDK release, so:

- **Never add `react`, `react-dom`, `next`, `expo`, or `react-native` to the root `package.json` or to `packages/*`.** They must live only in `mobile-app/package.json`. Hoisting them would make Next.js and Expo fight over React versions, and native builders (Gradle/CocoaPods) look inside `mobile-app/node_modules` directly — a hoisted dependency won't resolve there.
- To add a native/Expo dependency, use the Expo CLI wrapper so it picks the SDK-compatible version, not plain `pnpm add`:
  ```
  cd apps/mobile-app
  npx expo install <package>
  ```
- To add a workspace-shared package from `packages/*`, use `pnpm add <pkg> --filter mobile-app`.
- `metro.config.js` is already configured to watch the workspace root and resolve pnpm's symlinked `node_modules/.pnpm` layout — don't remove `watchFolders` / `nodeModulesPaths` / `disableHierarchicalLookup` unless you understand why they're there.

Safe to share via `packages/*`: TypeScript types/interfaces, Zod/validation schemas, pure formatting/utility functions, API client logic. Not safe to share: anything that touches native modules or bundles `react`/`react-native` itself.
