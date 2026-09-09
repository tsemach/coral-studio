# Mobile App Phase 2 — Roadmap Design

Status: approved by user in chat (sections 1-3), pending written self-review
Scope: five sub-projects extending the mobile app (`apps/mobile-app`) beyond the read-heavy Foundation + Community MVP already shipped (PR #43, merged). Each sub-project gets its own detailed implementation plan(s) when its turn comes, following the same brainstorm → spec → plan → subagent-driven-development cycle already used for Foundation and Community.

## Build order

**Content Creation → Push Notifications → OAuth → Live Video → Offline Caching**

Rationale: Content Creation unlocks the most real usage right now and reuses established patterns end to end. Push and OAuth are moderate lifts. Live Video is the largest technical risk (native-only, can't use the web-preview verification loop we've relied on throughout). Offline Caching is pure polish and benefits from everything else being stable first.

## Shared architectural approach (applies to every sub-project below)

- **Studio-web stays additive-only**, same as every prior plan: new route files, no edits to existing behavior — with one now-acknowledged exception (Push Notifications' trigger points, see below) and one schema addition (Push Notifications' new table).
- **New mobile write routes cannot call existing Server Actions directly.** Every action in `app/workshops/actions.ts`, `app/community/actions.ts`, `app/community/rehearsal-actions.ts`, `app/community/tape-actions.ts` authenticates via `auth()` (the cookie-based next-auth session) — a mobile bearer-token request carries no such cookie. So each new mobile route **reimplements** the action's DB-write logic and validation rules (read from the actual action, not guessed) behind `getMobileUser` + the existing `withMobileCors` wrapper, the same pattern already established for mobile comment-creation. This is the single most important recurring decision across every sub-project below.
- Mobile screens continue using `apps/mobile-app/lib/theme.ts`'s ink/parchment/curtain/brass tokens; no new visual language is introduced.
- Verification continues to favor `pnpm --filter mobile-app web` + `agent-browser` screenshots wherever the feature allows it — Live Video is the one sub-project where this breaks down (see below).

---

## 1. Content Creation

Turns the read-only Workshops and Community tabs into read/write. Likely splits into two implementation plans (Workshops-writes, Community-writes) given its size — mirroring the Foundation/Community split.

### Workshops writes
Mirrors `app/workshops/actions.ts`:

| Route | Mirrors | Behavior |
|---|---|---|
| `POST /api/mobile/workshops` | `createWorkshop` | title, optional script slug |
| `PATCH /api/mobile/workshops/:id` | `updateWorkshop` | title/script |
| `POST /api/mobile/workshops/:id/members` | `addMember` | add by user id |
| `DELETE /api/mobile/workshops/:id/members/:memberId` | `removeMember` | |
| `PATCH /api/mobile/workshops/:id/members/:memberId` | `updateMember` | type (`viewer`/`actor`), part |
| `PUT /api/mobile/workshops/:id/rehearsal` | `setRehearsalDate` | date + location; mirrors the Google Calendar sync and the auto-set/clear `meetingUrl` logic for `online`/`studio` |
| `DELETE /api/mobile/workshops/:id/rehearsal` | `cancelRehearsal` | |
| `POST /api/mobile/workshops/:id/leave` | `leaveWorkshop` | |

Deferred: `deleteWorkshop` (destructive, rare — stays web-only).

Mobile screens: "New workshop" form; an edit/member-management screen (add/remove/mark type+part); a schedule-rehearsal modal; a leave-workshop confirmation.

### Community writes
Mirrors `app/community/actions.ts`, `rehearsal-actions.ts`, `tape-actions.ts`:

| Route | Mirrors | Behavior |
|---|---|---|
| `POST /api/mobile/community/posts` | `createCommunityPost` | all 4 channels, channel-specific fields; attachments simplified to **images only** for v1 (`expo-image-picker`), not the web's PDF support |
| `PATCH /api/mobile/community/posts/:id/reader-status` | `updateReaderStatus` | |
| `POST /api/mobile/community/posts/:id/offers` | `offerToRead` | closes the loop on the read-only offers screen already shipped |
| `POST /api/mobile/community/posts/:id/confirm-reader` | `confirmReader` | post author picks an offer |
| `DELETE /api/mobile/community/posts/:id` | `deleteCommunityPost` | own posts only |
| `POST /api/mobile/community/tapes` | `createTape` | record via `expo-camera` or pick an existing video via `expo-image-picker`, then upload |
| `POST /api/mobile/community/tapes/:id/notes` | `addTapeNote` | timestamped, linked to current playback position |
| `DELETE /api/mobile/community/tapes/:id` | `deleteTape` | own tapes only |

Mobile screens: "New post" screen (channel picker + conditional fields + image picker); "Offer to read" action and a "Confirm reader" picker on the post-detail screen; delete-confirmation actions; a tape recording/upload flow; a note composer on the tape playback screen.

---

## 2. Push Notifications

- `expo-notifications` + Expo push tokens.
- **New DB table** on studio-web: `push_tokens` (`userId`, `token`, `platform`, `createdAt`) — additive schema change via drizzle-kit, the first schema change in this mobile effort. Does not touch any existing table.
- New routes: `POST /api/mobile/push/register` (called on sign-in/app-foreground), `POST /api/mobile/push/unregister` (on sign-out).
- **Open decision, not yet resolved**: what triggers a push? Firing only from the *new* mobile write-routes (Content Creation) misses events that originate from the *existing* web app (e.g., a web-posted comment never notifies a mobile user) — a real usefulness gap. Firing it from inside the *existing* web actions too means touching those files for the first time (a one-line, side-effect-only addition with no visible behavior change for web users) — the first exception to "zero studio-web changes." This gets decided when Push's detailed design starts, not now.

## 3. OAuth (Google/Facebook on mobile)

- `expo-auth-session` for the native sign-in flow.
- New route: `POST /api/mobile/auth/oauth` — verifies the returned ID token server-side (Google's/Facebook's own token-verification endpoints, not next-auth's OAuth provider flow, which is cookie/redirect-based) and issues the existing mobile JWT. Mirrors `auth.ts`'s account-linking/pending-approval rules rather than calling into next-auth.
- **Blocked on external setup**: registering mobile OAuth clients in the Google Cloud Console and Facebook Developer console (package name, bundle ID, Android SHA-1 fingerprint) is the user's action, not something done from code.
- Expo's recommended OAuth pattern has shifted across SDK versions — re-verify current guidance against Expo's docs when this sub-project actually starts, rather than trusting this document's or training data's specifics.

## 4. Live Video

- `@livekit/react-native` + `@livekit/react-native-webrtc`, reusing the existing token-minting logic (`getLiveToken`/`mintLiveToken` for Workshops group rooms, `getRehearsalToken`/`mintRehearsalToken` for Community's 1-on-1 rehearsal room) — mirrored into new mobile routes behind `getMobileUser`, same reimplementation pattern as everywhere else.
- **Requires an Expo Development Build, not Expo Go** — per `apps/mobile-app/CLAUDE.md`, native camera/mic/WebRTC modules cannot run in the plain Expo Go sandbox. Needs `expo run:ios`/`expo run:android` or an `eas build`.
- **The web-preview + agent-browser screenshot verification loop used throughout this whole effort does not apply here.** This sub-project needs a different verification approach (a real device or simulator pass), decided when it starts.
- Mobile screens: a workshop video-room screen (join button, video grid, the same "Add me" promotion flow as web); a community rehearsal-room screen (1-on-1 call).

## 5. Offline Caching

- Persist React Query's cache (`@tanstack/query-async-storage-persister` + `expo-file-system`/`AsyncStorage`-backed storage) so previously-loaded screens remain viewable offline.
- **Scoped to read-caching only for v1.** Offline mutation queuing (e.g., posting a comment with no signal) is explicitly deferred — it needs real conflict-resolution design this document doesn't attempt to solve.

---

## Explicitly out of scope for all of Phase 2

- Any change to studio-web's existing route/action *behavior* (Push Notifications' trigger-point exception is the one deliberate, narrow carve-out, decided at that sub-project's own design time).
- A unified in-app notification center (Push Notifications delivers OS-level push only, not an in-app inbox).
- Any offline mutation queue.
