# Mobile App: Community 1-on-1 Rehearsal Room — Design

## Context

Studio-web's Community area already has a fully working 1-on-1 rehearsal room: a `reader_sos` post's author gets offers from other members to read a scene with them, confirms one as the matched reader, and then either party can open a LiveKit video call scoped to that post (`components/community/rehearsal-room.tsx`, `app/community/rehearsal-actions.ts`, `lib/community/rehearsal-live.ts`). This was explicitly named as a follow-up when the mobile Workshops live-video spec (`docs/superpowers/specs/2026-09-13-mobile-app-live-video-workshops-design.md`) scoped itself to Workshops only.

Mobile already implements the rest of the `reader_sos` flow (status display, offering to read, confirming a reader — `app/(tabs)/community/[id].tsx`) via `packages/api-client`. This spec covers only the missing piece: joining the actual video call from mobile. No new product behavior is introduced — this is a port of an existing, shipped web feature to mobile, structurally parallel to the Workshops live-video work.

## Scope

- **In scope:** mobile (Android) UI to join an already-matched rehearsal's video call; the one new backend endpoint that mints a token for it; shared video-room UI pieces factored out of the Workshops implementation.
- **Out of scope:** any change to the `reader_sos` matching flow itself (offer/confirm — already shipped on mobile); any change to web's existing `RehearsalRoom`; iOS (mobile app is Android-only for now, matching the Workshops precedent).

## Entry point

`app/(tabs)/community/[id].tsx` already renders a "Reader request" section showing `readerStatus`, offers, and a confirm action. Add a "Join rehearsal" button there, shown only when:
- `post.readerStatus === 'matched'`, and
- the signed-in user is `post.authorId` or `post.matchedUserId`

This exactly mirrors the server-side gate in `getRehearsalToken` (`app/community/rehearsal-actions.ts:98`), so a user who can see the button can always successfully join.

Tapping it pushes `/community/rehearsal/[id]`, a new route at `app/(tabs)/community/rehearsal/[id].tsx`. This can't be nested as `community/[id]/rehearsal.tsx` — `[id]` already exists as a flat file, and Expo Router in this codebase requires new sibling routes to live under their own static folder with the dynamic segment as a leaf (the same constraint that produced `workshops/live/[id].tsx` and `community/tapes/[tapeId].tsx`). `_layout.tsx` under `community/` gains a `<Stack.Screen name="rehearsal/[id]" options={{ headerShown: false }} />` entry, matching how `workshops/_layout.tsx` wires in `live/[id]`.

## Backend: rehearsal-token endpoint

New route: `apps/studio-web/app/api/mobile/community/posts/[id]/rehearsal-token/route.ts`, a `GET` following the exact `401` (missing/invalid mobile auth) → `403` (not permitted) pattern used by the sibling routes in the same directory (`confirm-reader/route.ts`, `reader-status/route.ts`): `getMobileUser(request)` then `getActiveMobileUser(user.userId)`.

Logic is a direct port of `getRehearsalToken` (`app/community/rehearsal-actions.ts:79-111`):
1. Load the post; if it isn't `reader_sos`, isn't `matched`, or has no `matchedUserId`, return `404` (`{ error: 'Rehearsal not available.' }`) — this state is a not-found from the API's perspective, not an auth failure.
2. If the caller is neither `post.authorId` nor `post.matchedUserId`, return `403`.
3. Call the existing `mintRehearsalToken(postId, user.userId, user.name ?? 'Member')` and `getLiveKitServerUrl()` — both already exist in `lib/community/rehearsal-live.ts` and need no changes.
4. If the caller is the matched reader (not the author), insert a `rehearsalSessions` row (`{ postId, readerId: user.userId, authorId: post.authorId }`) — ports the existing karma-tracking side effect verbatim; the author joining their own request never counts.
5. Return `{ token, serverUrl }`.

### api-client

`packages/api-client/src/client.ts` gains:
```ts
export type RehearsalTokenResult = { token: string; serverUrl: string }
```
and a method `getRehearsalToken(postId: string): Promise<RehearsalTokenResult>` calling `GET /api/mobile/community/posts/${postId}/rehearsal-token` — same shape as `getLiveToken`, minus `canPublish` (always `true` for both parties in a rehearsal, unlike Workshops' viewer/actor distinction). Covered by a real test in `client.test.ts` alongside the existing `getLiveToken` tests.

## Mobile room UI

Extract the participant-count-agnostic pieces of `components/workshop-video-room.tsx` into a shared module `components/live-video/` (`participant-tile.tsx`, `room-controls.tsx`, `media-error-banner.tsx`, and the adaptive grid-height hook/logic that turns a track list into equal-share tile heights). `workshop-video-room.tsx` keeps everything Workshops-specific (`AddMeButton`, the `canPublish`-based track/viewer filtering) and imports the shared pieces instead of defining them inline.

New `components/rehearsal-video-room.tsx` is a thin consumer of the shared module:
- Fetches `{ token, serverUrl }` via `useQuery({ queryKey: ['rehearsal-token', postId], queryFn: () => apiClient.getRehearsalToken(postId), staleTime: Infinity })` — same convention as Workshops' `['live-token', workshopId]`.
- Renders `LiveKitRoom` with `audio`, `video`, and `connect` always `true` (no permission gating — both participants always publish in a rehearsal).
- Renders the shared tile grid (unfiltered — both tracks always shown, so it's the same component with zero special-casing) + shared `RoomControls` (mic/camera toggle + leave) + shared `MediaErrorBanner`.
- Same `AudioSession.startAudioSession()`/`stopAudioSession()` lifecycle as Workshops.
- Connecting/error states mirror Workshops' state machine (`connecting` → `error` → connected), reusing the same copy style ("Could not join the rehearsal." / "Back to post").

A `components/rehearsal-video-room.web.tsx` stub (same signature, "not available on web" message) is **not** needed here — web already has its own real `RehearsalRoom`; this file only matters for Expo's own web target, which mobile does not build for in this pass (Android-only, same as Workshops).

## Testing

- `packages/api-client/src/client.test.ts`: add `getRehearsalToken` tests mirroring the existing `getLiveToken` tests (success shape, error passthrough).
- Manual verification (same disposable-test-account + direct-DB pattern used for Workshops): create two test users, a `reader_sos` post, an offer, confirm the reader via the API, then verify both accounts can join the room from mobile and see/hear each other; verify a third, unrelated user gets `403` from the token endpoint.

## Global constraints (carried from the Workshops spec, still binding)

- Android only, no iOS.
- No new LiveKit/Expo native dependencies — everything needed is already installed from the Workshops work.
- `staleTime: Infinity` on the token query (a live token must never silently refetch mid-call).
