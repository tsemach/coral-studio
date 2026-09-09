# Mobile App MVP — Workshops & Community (Design)

Status: approved by user in chat, pending final spec review
Scope: first sub-project for `apps/mobile-app`, a currently-blank Expo scaffold

## Goal

Stand up the first real version of the Glumački Studio companion mobile app,
covering read-heavy access to the two subsystems that already exist on
`studio-web` — **Workshops** and **Community** — plus the minimum backend
surface needed to serve them. Live video (LiveKit rehearsal rooms), content
creation (new posts, tape uploads, workshop scheduling/membership edits) are
explicitly out of scope for this phase.

## Hard constraint: studio-web does not change

No existing file in `apps/studio-web` has its logic modified. The only
permitted touch to existing files is updating an `import` path when a type or
pure utility is relocated into a shared `packages/*` package — the moved
code's behavior stays byte-for-byte identical, only its location changes.
Every other build fair game must be created as **new, additive files**.

This is why the design below duplicates a small amount of thin
auth-check-and-respond glue (see "New API routes") rather than editing
existing `route.ts` files to accept a second auth mechanism.

## Scope for this phase (v1)

| Subsystem | In scope | Out of scope (later phase) |
|---|---|---|
| Workshops | List workshops you belong to; view a workshop's members, schedule, and read-only script/"sides" viewer; "Live now" badge (display only, no join) | Create/edit workshops, schedule rehearsals, add/remove members, join live video |
| Community | Channel-filtered feed (All / Reader SOS / Callboard / Craft Chat / General); post detail with comments (read); **posting a comment** (the one write flow); reader offers (read-only) | Creating posts, uploading/recording tapes, live rehearsal-room video |
| Tape room | List + play back existing tapes | Recording/uploading new tapes, notes |
| Auth | Email/password sign-in issuing a mobile-only token | Google/Facebook OAuth on mobile |

## Architecture

### Auth: separate from web, shared verification code

Web sessions are cookie-based next-auth JWTs (`auth.ts`/`auth.config.ts`) —
unchanged. Mobile gets its own, unrelated token:

- `POST /api/mobile/auth/login` (new route) takes email/password, calls the
  existing, unmodified `verifyCredentials()` from `lib/verifyCredentials.ts`,
  and on success signs a **new, separate JWT** (own secret env var, own
  claims — just `{ sub: userId }` plus expiry). This token has nothing to do
  with next-auth's session format.
- A new verifier (new file, e.g. `lib/mobile-auth.ts`) checks the
  `Authorization: Bearer <token>` header against that mobile secret. Used only
  by new mobile routes — `auth()`/next-auth code is never touched.
- Mobile stores the token in `expo-secure-store`; the shared `packages/api-client`
  attaches it to every request and handles 401 by clearing the token and
  signaling logged-out state.

### New API routes (all new files under `apps/studio-web/app/api/mobile/*`)

All of these import existing, unmodified query functions from
`lib/workshops/*` / `lib/community/*` (those are already plain functions
taking a `userId`, not coupled to `auth()`, so they need no changes) and are
gated by the new mobile-JWT verifier.

**Genuinely new endpoints** (no HTTP route exists today — these functions are
currently only called from RSC pages or server actions):
- `GET /api/mobile/workshops` → `listWorkshopsForUser`
- `GET /api/mobile/workshops/:id` → `getWorkshopDetail`
- `GET /api/mobile/scripts/:slug` → `getScript`
- `GET /api/mobile/community/tapes` → `listTapes`

**Parallel routes for endpoints that already exist for web** (new files,
duplicating a few lines of auth-check + function-call + `Response.json` glue,
rather than editing the existing web route):
- `GET /api/mobile/workshops/:id/live-status` (mirrors `workshops/[id]/live-status/route.ts`)
- `GET /api/mobile/community/posts` (mirrors `community/posts/route.ts`)
- `GET /api/mobile/community/posts/:id` (mirrors `community/posts/[id]/route.ts`)
- `GET /api/mobile/community/posts/:id/comments` (mirrors the comments route)
- `GET /api/mobile/community/posts/:id/offers` (mirrors the offers route)
- `GET /api/mobile/community/tapes/:tapeId/video` (mirrors the signed-URL redirect route)

**The one write endpoint**:
- `POST /api/mobile/community/posts/:id/comments` — reimplements the small
  comment-insert currently inline inside the `'use server'` action in
  `community/actions.ts`, using the same unmodified `db`/schema imports.
  Deliberately duplicated rather than extracted, per the no-touch constraint.

All new routes return the same `{ error: string }` + status-code shape the
existing routes already use, for consistency.

### Shared packages (new)

- **`packages/types`** — DTOs/types relocated from `lib/community/types.ts`
  and the type exports in `lib/workshops/queries.ts` / `lib/workshops/scripts.ts`
  (`CommunityPostItem`, `WorkshopListItem`, `WorkshopDetail`, `Script`,
  `ScriptFlowEntry`, etc.). Studio-web's imports are updated to point here;
  no behavior changes.
- **`packages/api-client`** — typed fetch client for mobile: one function per
  `/api/mobile/*` endpoint, typed against `packages/types`, auto-attaching the
  bearer token and centralizing 401 handling.
- Additional pure, no-DOM utilities (e.g. cursor pagination encode/decode,
  script-flow color mapping) move here too, evaluated file-by-file during
  implementation — only once mobile actually needs the same logic, not
  speculatively.

Neither package may depend on `react`, `react-dom`, `react-native`, `expo`,
or `next` (per the existing root/`packages/README.md` isolation rule).

## Mobile app (`apps/mobile-app`)

**Navigation**: Expo Router (file-based), bottom tabs — Workshops | Community
| Profile — each its own stack for drill-in. Unauthenticated users land on
`app/login.tsx`.

```
app/
  _layout.tsx          # reads stored token, redirects to /login if absent
  login.tsx
  (tabs)/
    _layout.tsx        # bottom tab navigator
    workshops/index.tsx, workshops/[id].tsx
    community/index.tsx, community/[id].tsx, community/tapes/index.tsx, community/tapes/[tapeId].tsx
    profile.tsx
lib/
  auth/token-storage.ts   # expo-secure-store wrapper
  auth/auth-context.tsx   # React context: user, login(), logout()
  query-client.ts         # @tanstack/react-query setup
components/               # RN presentational components, built fresh (web's are DOM/Tailwind and not portable), named to mirror web's equivalents for easy cross-reference
```

**Screens:**

- *Workshops list* — workshops the user belongs to: title, next rehearsal
  date/location, member count.
- *Workshop detail* — members, schedule, and a read-only script/"sides"
  viewer rendering `script_flow` entries (action/dialogue), with the same
  font-size control as web (local-only state). A "Live now" badge polls
  live-status every ~8s like web does, but is display-only in v1.
- *Community feed* — channel filter strip (All / Reader SOS / Callboard /
  Craft Chat / General), infinite-scroll list showing the same per-channel
  metadata web's `post-card.tsx` shows (`rehearsalAt`, `castingType`,
  `deadlineAt`, etc.).
- *Post detail* — rendered content (RN needs its own markdown renderer, not
  web's), comments list + composer (the one write flow), reader offers
  read-only for Reader SOS posts.
- *Tape room* — list of tapes, playback via the mobile signed-URL route; no
  recording/upload.
- *Profile* — name/email/avatar, sign out (clears stored token).

**Data fetching**: `@tanstack/react-query` (plain `pnpm add --filter
mobile-app` — pure JS, no native module, no `expo install` needed), matching
the caching/infinite-scroll pattern web already uses.

**Error handling**: new routes follow the existing `{ error }` convention. A
401 anywhere triggers the shared client's logout handler; other errors show
as an inline retry-able state per screen via React Query's error state — no
global crash boundary.

**Testing**: studio-web has no test suite today, so no new test infra is
added there. For mobile, per the 80/20 rule, minimal unit tests cover only
pure logic with real risk of silent breakage — the api-client's
request/auth-header/401 handling, and any script-flow/date-formatting
transforms. No UI/component tests in v1.

## Explicitly deferred (future phases)

- LiveKit live video for both workshop rehearsals and the community
  rehearsal-room (requires an Expo Development Build, not plain Expo Go).
- Content creation: new community posts, tape recording/upload, workshop
  creation/scheduling/membership edits, reader "offer to read".
- Google/Facebook OAuth on mobile (email/password only for v1).
- Push notifications, offline caching beyond React Query's in-memory cache.
