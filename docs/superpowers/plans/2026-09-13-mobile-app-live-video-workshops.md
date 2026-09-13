# Mobile App Live Video (Workshops) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring LiveKit-based live video to `apps/mobile-app`'s Workshops tab — a "Go live"/"Join" group call screen with an "Add me" viewer-promotion flow, matching `apps/studio-web`'s existing `WorkshopVideoRoom`.

**Architecture:** Two new bearer-auth mobile API routes on `apps/studio-web` reuse the exact server-side functions the web app's server actions already call (no new business logic). `apps/mobile-app` gets its first native module (`@livekit/react-native`), wired in via Expo config plugins so `android/` stays generated rather than hand-edited, plus a new video-room component and a pushed route. RN's LiveKit SDK re-exports the same hooks as web's `@livekit/components-react` (`useTracks`, `useLocalParticipant`, `useLocalParticipantPermissions`, `isTrackReference`) but has no prebuilt grid UI, so the participant grid is a plain `FlatList`, per the SDK's own documented pattern.

**Tech Stack:** `@livekit/react-native` 3.0.0, `@livekit/react-native-webrtc`, `livekit-client`, `@livekit/react-native-expo-plugin`, `@config-plugins/react-native-webrtc`, Expo Router, TanStack Query (already used throughout the mobile app).

**Spec:** `docs/superpowers/specs/2026-09-13-mobile-app-live-video-workshops-design.md`

## Global Constraints

- Android only for this pass — no iOS wiring, no iOS testing (confirmed in spec).
- Local prebuild workflow: `npx expo prebuild --platform android` + `npx expo run:android` — not EAS Build.
- Minimal video room UI: participant tiles + mic/camera toggle + leave button. No in-call chat, no screen share.
- New route: `app/(tabs)/workshops/live/[id].tsx` (not a `[id]/` directory — see Task 4 for why).
- `android/` stays out of git (Continuous Native Generation, driven by `app.json`'s `plugins`) — never hand-edit generated native files.
- Every new mobile API route: `getMobileUser` missing/invalid → `401`; authenticated-but-not-a-member → `403`, **never** a second `401` (a `401` on an authenticated request forces a global client-side logout — this exact bug class was fixed repeatedly in the prior PR and must not recur here).
- No icon library is introduced — all new buttons are plain `Pressable` + `Text` glyphs styled from `lib/theme.ts`, matching every other control added so far (the kebab menu's "⋮", the script viewer's "▲"/"▼").
- `mobile-app` has no automated test suite; `tsc --noEmit` is the compile-time gate for it. `packages/api-client` **does** have a real test suite (`packages/api-client/src/client.test.ts`, run via `pnpm --filter @coral-studio/api-client test`) — new client methods there get real tests, following its existing style exactly.
- The `agent-browser` + Expo-web verification loop used throughout prior mobile work **does not apply to the video room** — RN's LiveKit SDK is native-only. The final task's verification is a manual pass on a physical Android device, done by the user.

---

### Task 1: Backend — live session routes

**Files:**
- Create: `apps/studio-web/app/api/mobile/workshops/[id]/live-token/route.ts`
- Create: `apps/studio-web/app/api/mobile/workshops/[id]/add-me/route.ts`

**Interfaces:**
- Consumes: `getMobileUser(request): Promise<{ userId: string } | null>` (`@/lib/mobile-auth`); `isWorkshopMember(workshopId: string, userId: string): Promise<boolean>`, `getMemberType(workshopId: string, userId: string): Promise<'viewer' | 'actor' | null>` (`@/lib/workshops/queries`); `mintLiveToken(workshopId: string, userId: string, name: string, canPublish: boolean): Promise<string>`, `promoteParticipant(workshopId: string, userId: string): Promise<void>`, `getLiveKitServerUrl(): string` (`@/lib/workshops/live`); `mobileCorsPreflight`, `withMobileCors` (`@/lib/mobile-cors`); `db` (`@/lib/database`); `users` (`@/lib/database/schema`).
- Produces: `GET /api/mobile/workshops/[id]/live-token` → `200 { token: string, serverUrl: string, canPublish: boolean }`. `POST /api/mobile/workshops/[id]/add-me` → `204` (no body). Both consumed by Task 2's `apiClient` methods.

- [ ] **Step 1: Write `live-token/route.ts`**

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { getMemberType, isWorkshopMember } from '@/lib/workshops/queries'
import { getLiveKitServerUrl, mintLiveToken } from '@/lib/workshops/live'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

// Mirrors getLiveToken() in app/workshops/actions.ts, reimplemented behind
// bearer auth: canPublish mirrors the caller's workshop_members.type, same
// as the web action -- actors join able to publish, viewers join
// subscribe-only until promoted via POST .../add-me.
export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  const [row] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1)
  const displayName = row?.name || row?.email || 'Guest'

  const type = await getMemberType(workshopId, user.userId)
  const canPublish = type === 'actor'

  const token = await mintLiveToken(workshopId, user.userId, displayName, canPublish)
  return Response.json({ token, serverUrl: getLiveKitServerUrl(), canPublish })
})
```

- [ ] **Step 2: Write `add-me/route.ts`**

```ts
import { getMobileUser } from '@/lib/mobile-auth'
import { isWorkshopMember } from '@/lib/workshops/queries'
import { promoteParticipant } from '@/lib/workshops/live'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

// Mirrors addMeToLiveSession() in app/workshops/actions.ts. Session-only:
// promoteParticipant() never touches workshop_members.type, so this
// doesn't change the caller's role in the group once the call ends.
export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 403 })

  await promoteParticipant(workshopId, user.userId)
  return new Response(null, { status: 204 })
})
```

- [ ] **Step 3: Verify manually against the running dev server**

Prerequisite: an existing workshop with at least one `actor` member and one `viewer` member. Reuse the disposable-test-account pattern from prior work (`pnpm create-admin <email> <password> [name]` in `apps/studio-web`, then add them to a test workshop via the existing `addWorkshopMember` mobile route or the web UI, deleting the account afterward).

```bash
# Log in as the actor member
TOKEN=$(curl -s -X POST http://localhost:3500/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<actor-email>","password":"<password>"}' | jq -r .token)

# live-token: expect 200 with canPublish: true
curl -s http://localhost:3500/api/mobile/workshops/<workshop-id>/live-token \
  -H "Authorization: Bearer $TOKEN" | jq .

# add-me as the actor (already publishing) still succeeds -- expect 204
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  http://localhost:3500/api/mobile/workshops/<workshop-id>/add-me \
  -H "Authorization: Bearer $TOKEN"

# Re-run live-token with a DIFFERENT signed-in user who is NOT a member of
# this workshop -- expect 403 (not 401). This is the check that matters most:
# a 401 here would be the exact global-logout bug fixed repeatedly last PR.
curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:3500/api/mobile/workshops/<workshop-id>/live-token \
  -H "Authorization: Bearer $OTHER_TOKEN"
```

Expected: first `live-token` call returns `canPublish: true` for the actor; `add-me` returns `204`; the non-member call returns `403`.

- [ ] **Step 4: Commit**

```bash
git add apps/studio-web/app/api/mobile/workshops/\[id\]/live-token apps/studio-web/app/api/mobile/workshops/\[id\]/add-me
git commit -m "feat: add mobile live session routes (live-token, add-me)"
```

---

### Task 2: `apiClient` methods

**Files:**
- Modify: `packages/api-client/src/client.ts`
- Test: `packages/api-client/src/client.test.ts`

**Interfaces:**
- Consumes: Task 1's two routes.
- Produces: `apiClient.getLiveToken(workshopId: string): Promise<LiveTokenResult>` and `apiClient.addMeToLiveSession(workshopId: string): Promise<void>`, where `LiveTokenResult = { token: string; serverUrl: string; canPublish: boolean }`. Consumed by Task 4's `WorkshopVideoRoom`.

- [ ] **Step 1: Write the failing tests**

Add to `packages/api-client/src/client.test.ts`:

```ts
test('getLiveToken GETs and returns the token/serverUrl/canPublish', async () => {
  globalThis.fetch = (async () => {
    return { ok: true, status: 200, json: async () => ({ token: 't', serverUrl: 'wss://x', canPublish: true }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  const result = await client.getLiveToken('w1')

  assert.deepEqual(result, { token: 't', serverUrl: 'wss://x', canPublish: true })
})

test('addMeToLiveSession POSTs with no body', async () => {
  let capturedMethod: string | undefined
  let capturedBody: unknown
  globalThis.fetch = (async (_input, init) => {
    capturedMethod = init?.method
    capturedBody = init?.body
    return { ok: true, status: 204, json: async () => { throw new Error('no body') } } as unknown as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.addMeToLiveSession('w1')

  assert.equal(capturedMethod, 'POST')
  assert.equal(capturedBody, undefined)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: FAIL — `client.getLiveToken is not a function` / `client.addMeToLiveSession is not a function`.

- [ ] **Step 3: Add the type and methods**

In `packages/api-client/src/client.ts`, add alongside the other exported types near `WorkshopLiveStatus`:

```ts
export type LiveTokenResult = { token: string; serverUrl: string; canPublish: boolean }
```

Add inside the returned object, after `getWorkshopLiveStatus`:

```ts
    getLiveToken(workshopId: string): Promise<LiveTokenResult> {
      return request<LiveTokenResult>(`/api/mobile/workshops/${workshopId}/live-token`)
    },
    addMeToLiveSession(workshopId: string): Promise<void> {
      return request<void>(`/api/mobile/workshops/${workshopId}/add-me`, { method: 'POST' })
    },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src/client.ts packages/api-client/src/client.test.ts
git commit -m "feat: add getLiveToken/addMeToLiveSession to apiClient"
```

---

### Task 3: Mobile native foundation (LiveKit dependencies + Expo config plugins)

**Files:**
- Modify: `apps/mobile-app/package.json` (via `expo install`, not hand-edited)
- Modify: `apps/mobile-app/app.json`
- Modify: `apps/mobile-app/app/_layout.tsx`
- Modify: `apps/mobile-app/CLAUDE.md`

**Interfaces:**
- Produces: `registerGlobals()` called once at app startup (required before any LiveKit usage in Task 4). No new exported functions — this task's deliverable is "the app still builds and runs unchanged after linking a native module," verified manually.

- [ ] **Step 1: Install dependencies**

```bash
cd apps/mobile-app
npx expo install @livekit/react-native @livekit/react-native-webrtc livekit-client @livekit/react-native-expo-plugin @config-plugins/react-native-webrtc
```

- [ ] **Step 2: Add the config plugins to `app.json`**

In `apps/mobile-app/app.json`, change:

```json
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      "expo-splash-screen",
      "expo-video"
    ]
```

to:

```json
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      "expo-splash-screen",
      "expo-video",
      "@livekit/react-native-expo-plugin",
      "@config-plugins/react-native-webrtc"
    ]
```

- [ ] **Step 3: Call `registerGlobals()` at startup**

In `apps/mobile-app/app/_layout.tsx`, add the import and call it at module scope (before the component, so it runs once on load):

```tsx
import { useEffect, type ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces'
import * as SplashScreen from 'expo-splash-screen'
import { registerGlobals } from '@livekit/react-native'
import { AuthProvider, useAuth } from '../lib/auth/auth-context'
import { queryClient } from '../lib/query-client'
import { colors } from '../lib/theme'

// Must run once, before any LiveKit component/hook is used anywhere in the
// app -- sets up the WebRTC globals the JS layer needs.
registerGlobals()

SplashScreen.preventAutoHideAsync()
```

(Everything below `SplashScreen.preventAutoHideAsync()` in the existing file is unchanged.)

- [ ] **Step 4: Regenerate the native project and verify the app still boots**

```bash
cd apps/mobile-app
npx expo prebuild --platform android --clean
npx expo run:android
```

Expected: the app builds and installs on your connected Android device/emulator, and boots to the existing sign-in/Workshops flow exactly as before — this step introduces no new screens yet, it only proves the native module links cleanly. **This must be done on the physical device/emulator by the user** — it cannot be verified from this environment.

- [ ] **Step 5: Update `apps/mobile-app/CLAUDE.md`**

The file already has a forward-looking sentence about this; update it to present tense and add the concrete workflow. Change:

```markdown
LiveKit relies on native camera/mic/WebRTC modules, so it cannot be tested in the plain Expo Go sandbox — use an Expo Development Build (`npx expo run:ios` / `npx expo run:android`) once LiveKit is wired in here.
```

to:

```markdown
LiveKit is wired in (Workshops' live video) and relies on native camera/mic/WebRTC modules, so **Expo Go can no longer run this app at all** — not just the video screens, the whole app. `android/` is generated by `npx expo prebuild --platform android` from `app.json`'s `plugins` (Continuous Native Generation) and stays out of git — never hand-edit it; re-run prebuild if it's ever deleted or stale. Build the dev client once with `npx expo run:android` (rebuilds native code — needed again only when native deps/config change); day-to-day, `pnpm start` (or `pnpm android`) starts Metro and the already-installed dev client reconnects to it, same as Expo Go used to. iOS isn't wired up yet (no Mac available in this environment to build/test it).
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile-app/package.json apps/mobile-app/app.json apps/mobile-app/app/_layout.tsx apps/mobile-app/CLAUDE.md
git commit -m "feat: add LiveKit native foundation (deps, config plugins, registerGlobals)"
```

---

### Task 4: `WorkshopVideoRoom` component + `live/[id]` route

**Files:**
- Create: `apps/mobile-app/components/workshop-video-room.tsx`
- Create: `apps/mobile-app/app/(tabs)/workshops/live/[id].tsx`
- Modify: `apps/mobile-app/app/(tabs)/workshops/_layout.tsx`

**Interfaces:**
- Consumes: `apiClient.getLiveToken`/`apiClient.addMeToLiveSession` (Task 2); `colors`, `radius`, `spacing` (`lib/theme.ts`).
- Produces: `WorkshopVideoRoom({ workshopId: string, onLeave: () => void })` component, consumed by Task 5's button (indirectly, via the route below) and directly by the new route file.

**Why `workshops/live/[id].tsx`, not `workshops/[id]/live.tsx`:** `workshops/[id].tsx` already exists as a flat file (the detail screen). This codebase's established pattern for a dynamic segment that needs a sibling static route is `tapes/[tapeId].tsx` + `tapes/new.tsx` living together under the *static* `community/tapes/` folder (see `apps/mobile-app/app/(tabs)/community/_layout.tsx`'s `Stack.Screen name="tapes/[tapeId]"`) — not a directory named after the dynamic segment itself. Mirroring that exactly: `live` is the static folder, `[id]` is the dynamic leaf file inside it. This requires zero changes to the existing `workshops/[id].tsx`.

- [ ] **Step 1: Write `components/workshop-video-room.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native'
import { Track } from 'livekit-client'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'

function ParticipantTile({ item }: { item: TrackReferenceOrPlaceholder }) {
  if (!isTrackReference(item)) return <View style={styles.tile} />
  return <VideoTrack trackRef={item} style={styles.tile} />
}

// Overlays the grid until this participant's server-side permission grant
// flips canPublish -- mirrors studio-web's AddMeButton
// (components/workshops/workshop-video-room.tsx) exactly: the effect below
// is what actually turns the camera/mic on once the permission change
// lands, since a grant alone doesn't start publishing.
function AddMeButton({ workshopId }: { workshopId: string }) {
  const permissions = useLocalParticipantPermissions()
  const { localParticipant } = useLocalParticipant()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!permissions?.canPublish) return
    localParticipant.setCameraEnabled(true)
    localParticipant.setMicrophoneEnabled(true)
  }, [permissions?.canPublish, localParticipant])

  if (permissions?.canPublish) return null

  return (
    <View style={styles.addMeWrap}>
      {error ? <Text style={styles.addMeError}>{error}</Text> : null}
      <Pressable
        style={styles.addMeButton}
        disabled={pending}
        onPress={async () => {
          setPending(true)
          setError(null)
          try {
            await apiClient.addMeToLiveSession(workshopId)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.')
          } finally {
            setPending(false)
          }
        }}
      >
        <Text style={styles.addMeButtonText}>{pending ? 'Joining…' : 'Add me'}</Text>
      </Pressable>
    </View>
  )
}

// Surfaces a camera/mic permission denial as a visible notice rather than a
// silently blank tile. lastCameraError/lastMicrophoneError are plain getters
// on LocalParticipant, not reactive on their own, so this polls -- simplest
// correct option for a v1 given how rarely this actually fires.
function MediaErrorBanner() {
  const { localParticipant } = useLocalParticipant()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (localParticipant.lastCameraError) setMessage('Camera could not start — check your device permissions.')
      else if (localParticipant.lastMicrophoneError) setMessage('Microphone could not start — check your device permissions.')
    }, 2000)
    return () => clearInterval(interval)
  }, [localParticipant])

  if (!message) return null
  return (
    <View style={styles.mediaErrorBanner}>
      <Text style={styles.mediaErrorText}>{message}</Text>
    </View>
  )
}

function RoomControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant } = useLocalParticipant()
  const [micOn, setMicOn] = useState(localParticipant.isMicrophoneEnabled)
  const [cameraOn, setCameraOn] = useState(localParticipant.isCameraEnabled)

  return (
    <View style={styles.controls}>
      <Pressable
        style={styles.controlButton}
        onPress={() => {
          const next = !micOn
          localParticipant.setMicrophoneEnabled(next)
          setMicOn(next)
        }}
      >
        <Text style={styles.controlButtonText}>{micOn ? 'Mute' : 'Unmute'}</Text>
      </Pressable>
      <Pressable
        style={styles.controlButton}
        onPress={() => {
          const next = !cameraOn
          localParticipant.setCameraEnabled(next)
          setCameraOn(next)
        }}
      >
        <Text style={styles.controlButtonText}>{cameraOn ? 'Stop video' : 'Start video'}</Text>
      </Pressable>
      <Pressable style={styles.leaveButton} onPress={onLeave}>
        <Text style={styles.leaveButtonText}>Leave</Text>
      </Pressable>
    </View>
  )
}

function RoomView({ workshopId, onLeave }: { workshopId: string; onLeave: () => void }) {
  const tracks = useTracks([Track.Source.Camera])
  const renderTile: ListRenderItem<TrackReferenceOrPlaceholder> = ({ item }) => <ParticipantTile item={item} />

  return (
    <View style={styles.container}>
      <MediaErrorBanner />
      <FlatList data={tracks} renderItem={renderTile} keyExtractor={(item, index) => `${item.participant.identity}-${index}`} />
      <AddMeButton workshopId={workshopId} />
      <RoomControls onLeave={onLeave} />
    </View>
  )
}

// COR-18 (mobile): mirrors studio-web's WorkshopVideoRoom state machine
// (connecting -> error -> connected). Fetches this caller's token fresh via
// react-query rather than a raw useEffect -- matches this app's existing
// data-fetching convention everywhere else; staleTime: Infinity because a
// re-render mid-call must never silently refetch/replace the live token.
export function WorkshopVideoRoom({ workshopId, onLeave }: { workshopId: string; onLeave: () => void }) {
  const sessionQuery = useQuery({
    queryKey: ['live-token', workshopId],
    queryFn: () => apiClient.getLiveToken(workshopId),
    staleTime: Infinity,
  })

  useEffect(() => {
    AudioSession.startAudioSession()
    return () => {
      AudioSession.stopAudioSession()
    }
  }, [])

  if (sessionQuery.isLoading) {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>Connecting…</Text>
      </View>
    )
  }
  if (sessionQuery.error || !sessionQuery.data) {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>Could not join the live session.</Text>
        <Pressable style={styles.backButton} onPress={onLeave}>
          <Text style={styles.backButtonText}>Back to workshop</Text>
        </Pressable>
      </View>
    )
  }

  const { token, serverUrl, canPublish } = sessionQuery.data

  return (
    <View style={styles.container}>
      <LiveKitRoom token={token} serverUrl={serverUrl} audio={canPublish} video={canPublish} connect onDisconnected={onLeave}>
        <RoomView workshopId={workshopId} onLeave={onLeave} />
      </LiveKitRoom>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.ink, padding: spacing.lg },
  messageText: { color: colors.parchmentMuted, fontSize: 14, textAlign: 'center' },
  backButton: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: spacing.md, paddingVertical: 10 },
  backButtonText: { color: colors.parchmentMuted, fontWeight: '600' },
  tile: { height: 220, backgroundColor: colors.inkCard, margin: spacing.xs, borderRadius: radius },
  addMeWrap: { position: 'absolute', bottom: 90, alignSelf: 'center', alignItems: 'center', gap: spacing.xs },
  addMeButton: { backgroundColor: colors.primary, borderRadius: radius, paddingHorizontal: spacing.md, paddingVertical: 12 },
  addMeButtonText: { color: colors.primaryForeground, fontWeight: '600' },
  addMeError: { color: colors.accent, fontSize: 12, textAlign: 'center' },
  mediaErrorBanner: { backgroundColor: colors.inkCard, borderBottomWidth: 1, borderColor: colors.hairline, padding: spacing.sm },
  mediaErrorText: { color: colors.accent, fontSize: 12, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderColor: colors.hairline },
  controlButton: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  controlButtonText: { color: colors.parchment, fontWeight: '600', fontSize: 13 },
  leaveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  leaveButtonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 13 },
})
```

- [ ] **Step 2: Write `app/(tabs)/workshops/live/[id].tsx`**

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router'
import { WorkshopVideoRoom } from '../../../../components/workshop-video-room'

export default function WorkshopLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  return <WorkshopVideoRoom workshopId={id} onLeave={() => router.back()} />
}
```

- [ ] **Step 3: Register the route in `workshops/_layout.tsx`**

```tsx
import { Stack } from 'expo-router'
import { colors } from '../../../lib/theme'

export default function WorkshopsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.parchment,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Workshops' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="new" options={{ title: 'New workshop' }} />
      <Stack.Screen name="live/[id]" options={{ headerShown: false }} />
    </Stack>
  )
}
```

(`headerShown: false` — the room is full-screen video with its own in-app "Leave" button; a second back-arrow header on top of it would be redundant chrome over the video grid.)

- [ ] **Step 4: Type-check**

Run: `pnpm --filter mobile-app exec tsc --noEmit`
Expected: no errors. (LiveKit's own type declarations were verified against the installed package version while writing this plan — if `tsc` disagrees with this code, trust `tsc` and the installed package's actual `.d.ts` files over this plan, and fix the mismatch rather than suppressing the error.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile-app/components/workshop-video-room.tsx "apps/mobile-app/app/(tabs)/workshops/live" "apps/mobile-app/app/(tabs)/workshops/_layout.tsx"
git commit -m "feat: add WorkshopVideoRoom component and live/[id] route"
```

---

### Task 5: "Go live"/"Join" trigger on the workshop detail screen

**Files:**
- Modify: `apps/mobile-app/app/(tabs)/workshops/[id].tsx`

**Interfaces:**
- Consumes: `router.push` (`expo-router`, already imported in this file); the new `live/[id]` route (Task 4). No new exports.

- [ ] **Step 1: Add the button next to the existing "Live now" badge**

In `apps/mobile-app/app/(tabs)/workshops/[id].tsx`, the `headerRow` currently renders:

```tsx
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>{workshop.title}</Text>
          {liveQuery.data?.live ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live now</Text>
            </View>
          ) : null}
        </View>
        <WorkshopMenu
          hasRehearsal={!!workshop.rehearsalAt}
          onReschedule={() => setScheduleVisible(true)}
          onAddMember={() => setAddMemberVisible(true)}
          onCancelRehearsal={() => cancelRehearsalMutation.mutate()}
          onLeave={confirmLeaveWorkshop}
        />
      </View>
```

Replace the static "Live now" badge with a pressable trigger (idle: outlined "Go live"; live: filled dot + "Live · Join", mirroring `apps/studio-web/components/workshops/go-live-button.tsx`'s two states):

```tsx
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>{workshop.title}</Text>
          <Pressable
            style={[styles.goLiveButton, liveQuery.data?.live && styles.goLiveButtonActive]}
            onPress={() => router.push(`/workshops/live/${id}`)}
          >
            {liveQuery.data?.live ? <View style={styles.liveDot} /> : null}
            <Text style={styles.goLiveButtonText}>{liveQuery.data?.live ? 'Live · Join' : 'Go live'}</Text>
          </Pressable>
        </View>
        <WorkshopMenu
          hasRehearsal={!!workshop.rehearsalAt}
          onReschedule={() => setScheduleVisible(true)}
          onAddMember={() => setAddMemberVisible(true)}
          onCancelRehearsal={() => cancelRehearsalMutation.mutate()}
          onLeave={confirmLeaveWorkshop}
        />
      </View>
```

- [ ] **Step 2: Replace the old `liveBadge`/`liveText` styles with `goLiveButton` styles**

The existing `styles` object has:

```tsx
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  liveText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
```

Replace with:

```tsx
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: pillRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  goLiveButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryForeground },
  goLiveButtonText: { color: colors.parchment, fontWeight: '600', fontSize: 13 },
```

(`pillRadius` is already imported in this file — it was added for the kebab menu/tab styling earlier.)

- [ ] **Step 3: Type-check**

Run: `pnpm --filter mobile-app exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification (physical device)**

With the Task 3 dev-client build installed:
1. Open a workshop you're an `actor` member of. Tap "Go live" — the live route should push, mint a token, connect, and show your own camera tile with mic/camera/leave controls.
2. From a second device/account that's a `viewer` member of the same workshop, open the same workshop — the header button should now read "Live · Join" with the filled dot (polled via the existing `live-status` query). Tap it — you should join able to see the actor's video but not publish your own yet, with an "Add me" button visible.
3. Tap "Add me" — your camera/mic should turn on within a couple seconds and the button should disappear.
4. Tap "Leave" on either device — you should return to the workshop detail screen. Confirm "Live · Join" on the other device eventually reflects the room being empty again once both leave (subject to the existing 8s poll interval).

This step must be performed by the user — it cannot be verified from this environment.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/workshops/[id].tsx"
git commit -m "feat: add Go live/Join trigger to workshop detail screen"
```
