# packages/

Shared code consumed by both `studio-web` and `mobile-app` lives here as individual pnpm workspace packages (e.g. `packages/api-client`, `packages/types`).

Keep this to pure JS/TS logic — types, validation schemas, formatting/utility functions, API client code. Do not put `react`, `react-dom`, `react-native`, `expo`, or `next` here: those must stay isolated in each app's own `package.json` (see `mobile-app`'s notes) to avoid native/version collisions between the Next.js and Expo builds.

Nothing has been extracted yet — this directory is a placeholder until the first real sharing need arises.
