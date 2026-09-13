# Mobile App Live Video (Workshops) — Design

Status: approved by user in chat (all sections), pending written self-review
Scope: brings LiveKit-based live video to `apps/mobile-app`'s Workshops tab only — the "Go live"/"Join" group call and the viewer "Add me" promotion flow, matching `apps/studio-web`'s existing `WorkshopVideoRoom`. This is sub-project 4 ("Live Video") from `docs/superpowers/specs/2026-09-09-mobile-app-phase-2-design.md`, narrowed to Workshops only — Community's 1-on-1 reader-sos rehearsal room (`RehearsalRoom`, `SidesViewer`) is explicitly deferred to its own follow-up spec once this foundation is proven.

Depends on PR #44 (Content Creation, merged to `master`) — no other dependency.

## Why Workshops-only for this pass

Workshop live sessions and Community's rehearsal room share the same LiveKit plumbing (token minting, `LiveKitRoom` connect/disconnect, a video grid) but differ in everything else: Workshops is a group call with actor/viewer roles and an "Add me" promotion step; Community's room is a 1-on-1 matched-pair call with karma tracking and an attached "sides" script-excerpt viewer. Splitting keeps each spec's auth model and UI scope reviewable on its own, mirroring how Content Creation was already split into Workshops-writes/Community-writes plans in PR #44.

## Constraints carried over from `apps/mobile-app/CLAUDE.md`

- LiveKit relies on native camera/mic/WebRTC modules and cannot run in the plain Expo Go sandbox.
- `react`, `react-native`, `expo` stay pinned to `mobile-app/package.json`; new native deps go through `npx expo install`, never plain `pnpm add`.

## New constraint this sub-project introduces

Once `@livekit/react-native`/`@livekit/react-native-webrtc` are linked in, **Expo Go stops working for the whole app**, not just the video screens — every local dev session from this point on goes through a dev-client build. `apps/mobile-app/CLAUDE.md` needs a new section documenting this (see Task list in the implementation plan).

## Decisions made in chat

| Question | Decision |
|---|---|
| Dev-build method | Local prebuild: `npx expo prebuild --platform android` + `npx expo run:android`. Not EAS Build. |
| Platform | Android only for this pass. iOS wiring deferred (no Mac available to build/test it locally). |
| Video room feature set | Minimal: participant video tiles, mic/camera toggle, leave button. No in-call text chat, no screen share. |
| Navigation | New pushed route `app/(tabs)/workshops/[id]/live.tsx`, not an in-place tab swap. Back leaves the call. |
| Native project files | `android/` stays out of git (Continuous Native Generation) — regenerated from `app.json` config plugins via `expo prebuild`, never hand-edited. |

## Backend (`apps/studio-web`)

Two new mobile routes, reusing the exact functions the web server actions already call — no new business logic, just a bearer-auth transport for logic that already exists in `lib/workshops/live.ts` and `lib/workshops/queries.ts`.

| Route | Reuses | Behavior |
|---|---|---|
| `GET /api/mobile/workshops/[id]/live-token` | `mintLiveToken`, `getMemberType`, `getLiveKitServerUrl` | Returns `{ token, serverUrl, canPublish }`. `canPublish` is `true` for `actor` members, `false` for `viewer`. |
| `POST /api/mobile/workshops/[id]/add-me` | `promoteParticipant` | Promotes the caller to publish for the current session only (does not touch `workshop_members.type`). Returns 204. |

Both follow the exact auth template every other mobile route uses, per the pattern fixed repeatedly across the last PR's final reviews:

```ts
const user = await getMobileUser(request)
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })  // missing/invalid token

const isMember = await isWorkshopMember(workshopId, user.userId)
if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 403 })  // authenticated but not authorized -- NEVER 401 here
```

The second check must be `403`, never `401` — a `401` here would make `packages/api-client/src/client.ts`'s `onUnauthorized()` fire and force a global logout for an authenticated user who simply isn't a member of this workshop. This is the exact bug class fixed repeatedly last PR; it must not recur here.

`GET .../live-status` already exists (`apps/studio-web/app/api/mobile/workshops/[id]/live-status/route.ts`) and needs no changes — mobile already polls it for the "Live now" badge on the workshop detail screen.

## Mobile app (`apps/mobile-app`)

### Foundation (one-time)

- Dependencies via `npx expo install`: `@livekit/react-native`, `@livekit/react-native-webrtc`, `livekit-client`, `@livekit/react-native-expo-plugin`, `@config-plugins/react-native-webrtc`.
- `app.json`: add both config plugins to the `plugins` array. `@livekit/react-native-expo-plugin` injects the native `LiveKitReactNative.setup()` call into the generated Android project on prebuild; `@config-plugins/react-native-webrtc` adds the `CAMERA`/`RECORD_AUDIO` Android permissions. Neither requires hand-editing native files.
- `registerGlobals()` (from `@livekit/react-native`) called once at app startup, in the root `_layout.tsx`, before any screen that could reach the video room.
- `AudioSession.startAudioSession()`/`stopAudioSession()` lifecycle: start on `WorkshopVideoRoom` mount, stop on unmount.

### Feature

- **`components/workshop-video-room.tsx`** — mirrors web's `WorkshopVideoRoom` state machine (connecting → error → connected):
  1. On mount, calls the new `GET .../live-token` route via `apiClient`.
  2. Renders `LiveKitRoom` (`@livekit/react-native`) with `audio={canPublish}` `video={canPublish}` — actors auto-publish, viewers join subscribe-only.
  3. Inside: `useTracks()` feeds a `FlatList` of tiles (`VideoTrack` + participant name), mirroring the RN SDK's own documented example (a `FlatList` of tracks is their recommended pattern — there is no prebuilt grid component like web's `<VideoConference>`).
  4. Mic/camera/leave buttons are plain `Pressable` + `Text` glyphs styled from `lib/theme.ts`, matching every other control added this effort (the kebab menu's "⋮", the script viewer's "▲"/"▼", the rehearsal card's "×") — no icon library dependency is introduced. Mic/camera buttons call `localParticipant.setMicrophoneEnabled()`/`setCameraEnabled()`; the leave button calls `room.disconnect()` and pops the route.
  5. For a non-publishing viewer, an "Add me" button overlays the grid (same placement/logic as web's `AddMeButton`): calls the new `POST .../add-me` route; an effect watching the local participant's publish permission flips camera/mic on automatically once LiveKit pushes the grant down — not a second manual step.
- **`app/(tabs)/workshops/[id]/live.tsx`** — new route, renders `WorkshopVideoRoom`. Pushed when "Go live"/"Join" is tapped.
- **`app/(tabs)/workshops/[id].tsx`** — gains a "Go live"/"Join" trigger next to the existing "Live now" badge, mirroring web's `GoLiveButton` (outlined "Go live" when idle; filled with a dot + "Live · Join" when `liveQuery.data?.live` is true). Tapping it pushes the `live` route.

"Leaving" the call (back gesture or the in-room leave button) calls no "end" endpoint — same as web, "live" is purely derived from LiveKit's own participant presence (`isWorkshopLive`), so it becomes false on its own once the last participant disconnects.

## Error handling

- **Token mint fails** (network error, or either route's auth/membership check rejects): inline error message + "Back to workshop" button, same shape as web's error state.
- **Camera/mic permission denied at the OS level**: surfaces as a track-publish failure from `@livekit/react-native-webrtc`; the room still connects (the participant can see/hear others), with a small inline notice explaining the mic/camera couldn't start — not a blank tile with no explanation.
- **Mid-call disconnect**: `LiveKitRoom`'s `onDisconnected` fires the same handler as a deliberate leave. No custom reconnect loop for v1 — LiveKit's client already attempts transient reconnects before giving up (YAGNI: don't build a second layer on top).
- **`add-me` fails**: inline error, button stays enabled to retry — same pattern as the existing `offerMutation`/`confirmReaderMutation` error surfacing already in the mobile app.

## Testing

- No automated test suite exists for `mobile-app` (unchanged from every prior sub-project) — `tsc --noEmit` is the compile-time gate.
- **The `agent-browser` + Expo-web verification loop used throughout Content Creation does not apply here.** RN's LiveKit SDK is native-only; there is no camera/mic in a browser tab. Verification of the actual video call happens on a real Android dev-client build (`expo run:android`) on a physical device, done by the user — not something verifiable via automated browser checks from this session.
- The two new backend routes (`live-token`, `add-me`) can still be verified independently the usual way (`curl` against studio-web, token inspection), same as always.

## Deferred (out of scope for this spec)

- Community's 1-on-1 rehearsal room (`RehearsalRoom`, `SidesViewer`, `getRehearsalToken`) — its own follow-up spec.
- iOS build/wiring.
- In-call text chat, screen share.
- A custom reconnect UI beyond LiveKit's own client-side retry behavior.
