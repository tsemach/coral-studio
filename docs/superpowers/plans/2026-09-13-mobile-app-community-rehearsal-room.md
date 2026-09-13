# Mobile App: Community 1-on-1 Rehearsal Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let two mobile users on a matched `reader_sos` Community post join the existing LiveKit rehearsal room from the mobile app, mirroring the already-shipped web feature.

**Architecture:** One new bearer-authenticated GET route on studio-web mints a rehearsal token by reusing the existing `mintRehearsalToken`/`rehearsalSessions` logic; one new `api-client` method calls it; a shared `components/live-video/` module (extracted from the Workshops video room) supplies the tile grid, mic/camera controls, and media-error banner; a new thin `RehearsalVideoRoom` component and a new pushed route wire it into the existing post-detail screen behind a "Join rehearsal" button.

**Tech Stack:** Next.js route handlers (studio-web), `@livekit/react-native` + `livekit-client` (already installed, no new deps), `@tanstack/react-query`, Expo Router, `@coral-studio/api-client`.

**Spec:** `docs/superpowers/specs/2026-09-13-mobile-app-community-rehearsal-room-design.md`

## Global Constraints

- Android only — no iOS, no new web-stub component (mobile doesn't build for Expo's web target in this pass).
- No new LiveKit/Expo native dependencies — everything needed is already installed from the Workshops live-video work.
- `staleTime: Infinity` on any live-token react-query (a live token must never silently refetch mid-call).
- The `401` (missing/invalid mobile auth) → `403` (not permitted) response-code ordering used by every existing `/api/mobile/*` route must be preserved exactly.

---

### Task 1: Backend — rehearsal-token API route

**Files:**
- Create: `apps/studio-web/app/api/mobile/community/posts/[id]/rehearsal-token/route.ts`

**Interfaces:**
- Consumes: `getMobileUser` (`@/lib/mobile-auth`), `getActiveMobileUser` (`@/lib/community/mobile-write-helpers`), `mintRehearsalToken(postId: string, userId: string, name: string): Promise<string>` and `getLiveKitServerUrl(): string` (both already exist in `@/lib/community/rehearsal-live`, unchanged), `mobileCorsPreflight`/`withMobileCors` (`@/lib/mobile-cors`), `communityPosts`/`rehearsalSessions` tables (`@/lib/database/schema`).
- Produces: `GET /api/mobile/community/posts/:id/rehearsal-token` → `200 { token: string, serverUrl: string }` | `401 { error }` | `403 { error }` | `404 { error }`. Task 2's `api-client` method calls this exact path/shape.

- [ ] **Step 1: Write the route**

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { communityPosts, rehearsalSessions } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { getLiveKitServerUrl, mintRehearsalToken } from '@/lib/community/rehearsal-live'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

// Mirrors getRehearsalToken() in app/community/rehearsal-actions.ts, reimplemented
// behind bearer auth: a rehearsal room always has exactly two participants (the
// post's author and the confirmed reader) and both always publish -- no
// promotion flow like Workshops' live-token route.
export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params

  const [post] = await db
    .select({
      id: communityPosts.id,
      channel: communityPosts.channel,
      readerStatus: communityPosts.readerStatus,
      authorId: communityPosts.authorId,
      matchedUserId: communityPosts.matchedUserId,
    })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)

  if (!post || post.channel !== 'reader_sos' || post.readerStatus !== 'matched' || !post.matchedUserId) {
    return Response.json({ error: 'Rehearsal not available.' }, { status: 404 })
  }
  if (user.userId !== post.authorId && user.userId !== post.matchedUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const token = await mintRehearsalToken(postId, user.userId, activeUser.name ?? 'Member')

  // Only the reader's join counts toward their karma -- the author joining
  // their own request isn't "reading for someone." Mirrors the web action.
  if (user.userId === post.matchedUserId) {
    await db.insert(rehearsalSessions).values({ postId, readerId: user.userId, authorId: post.authorId })
  }

  return Response.json({ token, serverUrl: getLiveKitServerUrl() })
})
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/studio-web && npx tsc --noEmit`
Expected: no errors from the new file.

- [ ] **Step 3: Manual verification**

Using the same disposable-test-account + direct-DB pattern used for Workshops (`pnpm create-admin <email> <password> [name]` in `apps/studio-web`, then direct `pg` queries against `GLUMACKI_DATABASE_URL` with `drizzle-orm/node-postgres` — not `postgres-js`/`DATABASE_URL`):

1. Create two test users and a `reader_sos` community post authored by user A.
2. Insert a `readerOffers` row for user B, then update the post to `readerStatus: 'matched', matchedUserId: <userB id>`.
3. With `pnpm dev` running studio-web, `curl` the route with each user's mobile bearer token (obtained via `POST /api/mobile/auth/login`) and confirm both get `200` with a `token`/`serverUrl`.
4. `curl` the route with a third, unrelated active user's token and confirm `403`.
5. Delete the test rows (post, offer, the two users) afterward.

Expected: steps 3-4 match exactly.

- [ ] **Step 4: Commit**

```bash
git add apps/studio-web/app/api/mobile/community/posts/\[id\]/rehearsal-token/route.ts
git commit -m "feat: add mobile rehearsal-token endpoint for Community 1-on-1 rooms"
```

---

### Task 2: api-client — getRehearsalToken method

**Files:**
- Modify: `packages/api-client/src/client.ts`
- Test: `packages/api-client/src/client.test.ts`

**Interfaces:**
- Consumes: Task 1's `GET /api/mobile/community/posts/:id/rehearsal-token`.
- Produces: `RehearsalTokenResult = { token: string; serverUrl: string }` and `apiClient.getRehearsalToken(postId: string): Promise<RehearsalTokenResult>`. Task 4's `RehearsalVideoRoom` calls this exactly.

- [ ] **Step 1: Write the failing test**

Add to `packages/api-client/src/client.test.ts` (near the existing `getLiveToken`/`addMeToLiveSession` tests):

```ts
test('getRehearsalToken GETs and returns the token/serverUrl', async () => {
  globalThis.fetch = (async () => {
    return { ok: true, status: 200, json: async () => ({ token: 't', serverUrl: 'wss://x' }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  const result = await client.getRehearsalToken('p1')

  assert.deepEqual(result, { token: 't', serverUrl: 'wss://x' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api-client && pnpm test`
Expected: FAIL — `client.getRehearsalToken is not a function`.

- [ ] **Step 3: Add the type and method**

In `packages/api-client/src/client.ts`, add the type next to `LiveTokenResult` (around line 34):

```ts
export type RehearsalTokenResult = { token: string; serverUrl: string }
```

Add the method in the returned object, directly after `confirmReader` (around line 215, before `deleteCommunityPost`):

```ts
    getRehearsalToken(postId: string): Promise<RehearsalTokenResult> {
      return request<RehearsalTokenResult>(`/api/mobile/community/posts/${postId}/rehearsal-token`)
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api-client && pnpm test`
Expected: PASS, all tests including the new one.

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src/client.ts packages/api-client/src/client.test.ts
git commit -m "feat: add getRehearsalToken to api-client"
```

---

### Task 3: Extract shared live-video UI module from the Workshops video room

**Files:**
- Create: `apps/mobile-app/components/live-video/styles.ts`
- Create: `apps/mobile-app/components/live-video/participant-tile.tsx`
- Create: `apps/mobile-app/components/live-video/participant-grid.tsx`
- Create: `apps/mobile-app/components/live-video/room-controls.tsx`
- Create: `apps/mobile-app/components/live-video/media-error-banner.tsx`
- Modify: `apps/mobile-app/components/workshop-video-room.tsx`

**Interfaces:**
- Produces: `ParticipantTile({ item, height }: { item: TrackReferenceOrPlaceholder; height: number })`, `ParticipantGrid({ tracks }: { tracks: TrackReferenceOrPlaceholder[] })`, `RoomControls({ onLeave }: { onLeave: () => void })`, `MediaErrorBanner()`. Task 4's `RehearsalVideoRoom` imports all four from `./live-video/*`.
- Consumes (unchanged): `@livekit/react-native`'s `useLocalParticipant`, `useTracks`, `isTrackReference`, `VideoTrack`, `TrackReferenceOrPlaceholder`; `../../lib/theme`'s `colors`/`radius`/`spacing`.

This task is a pure refactor: `workshop-video-room.tsx`'s existing behavior (tested and shipped in PR #45) must be unchanged after it — only the file boundaries move.

- [ ] **Step 1: Create the shared styles file**

`apps/mobile-app/components/live-video/styles.ts`:

```ts
import { StyleSheet } from 'react-native'
import { colors, radius, spacing } from '../../lib/theme'

export const liveVideoStyles = StyleSheet.create({
  grid: { flex: 1 },
  tile: { backgroundColor: colors.inkCard, overflow: 'hidden' },
  tileName: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    color: colors.parchment,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaErrorBanner: { backgroundColor: colors.inkCard, borderBottomWidth: 1, borderColor: colors.hairline, padding: spacing.sm },
  mediaErrorText: { color: colors.accent, fontSize: 12, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderColor: colors.hairline },
  controlButton: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  controlButtonText: { color: colors.parchment, fontWeight: '600', fontSize: 13 },
  leaveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  leaveButtonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 13 },
})
```

- [ ] **Step 2: Create ParticipantTile**

`apps/mobile-app/components/live-video/participant-tile.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native'
import { VideoTrack, isTrackReference, type TrackReferenceOrPlaceholder } from '@livekit/react-native'
import { liveVideoStyles } from './styles'

export function ParticipantTile({ item, height }: { item: TrackReferenceOrPlaceholder; height: number }) {
  const name = item.participant.name || item.participant.identity
  return (
    <View style={[liveVideoStyles.tile, { height }]}>
      {isTrackReference(item) ? <VideoTrack trackRef={item} style={StyleSheet.absoluteFill} /> : null}
      <Text style={liveVideoStyles.tileName}>{name}</Text>
    </View>
  )
}
```

- [ ] **Step 3: Create ParticipantGrid**

`apps/mobile-app/components/live-video/participant-grid.tsx`:

```tsx
import { useState } from 'react'
import { FlatList, View, type ListRenderItem } from 'react-native'
import type { TrackReferenceOrPlaceholder } from '@livekit/react-native'
import { ParticipantTile } from './participant-tile'
import { liveVideoStyles } from './styles'

// Each participant's tile takes an equal share of the grid's measured
// height -- one tile fills the whole area, two split it in half, three in
// thirds, and so on -- rather than a fixed tile height that leaves empty
// space below with few participants and requires scrolling with many.
export function ParticipantGrid({ tracks }: { tracks: TrackReferenceOrPlaceholder[] }) {
  const [gridHeight, setGridHeight] = useState(0)
  const tileHeight = tracks.length > 0 ? gridHeight / tracks.length : gridHeight
  const renderTile: ListRenderItem<TrackReferenceOrPlaceholder> = ({ item }) => (
    <ParticipantTile item={item} height={tileHeight} />
  )

  return (
    <View style={liveVideoStyles.grid} onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}>
      <FlatList
        data={tracks}
        renderItem={renderTile}
        keyExtractor={(item) => item.participant.identity}
        scrollEnabled={false}
      />
    </View>
  )
}
```

- [ ] **Step 4: Create RoomControls**

`apps/mobile-app/components/live-video/room-controls.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'
import { useLocalParticipant } from '@livekit/react-native'
import { liveVideoStyles } from './styles'

export function RoomControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()

  return (
    <View style={liveVideoStyles.controls}>
      <Pressable style={liveVideoStyles.controlButton} onPress={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}>
        <Text style={liveVideoStyles.controlButtonText}>{isMicrophoneEnabled ? 'Mute' : 'Unmute'}</Text>
      </Pressable>
      <Pressable style={liveVideoStyles.controlButton} onPress={() => localParticipant.setCameraEnabled(!isCameraEnabled)}>
        <Text style={liveVideoStyles.controlButtonText}>{isCameraEnabled ? 'Stop video' : 'Start video'}</Text>
      </Pressable>
      <Pressable style={liveVideoStyles.leaveButton} onPress={onLeave}>
        <Text style={liveVideoStyles.leaveButtonText}>Leave</Text>
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 5: Create MediaErrorBanner**

`apps/mobile-app/components/live-video/media-error-banner.tsx`:

```tsx
import { Text, View } from 'react-native'
import { useLocalParticipant } from '@livekit/react-native'
import { liveVideoStyles } from './styles'

export function MediaErrorBanner() {
  const { lastCameraError, lastMicrophoneError } = useLocalParticipant()
  const message = lastCameraError
    ? 'Camera could not start — check your device permissions.'
    : lastMicrophoneError
      ? 'Microphone could not start — check your device permissions.'
      : null

  if (!message) return null
  return (
    <View style={liveVideoStyles.mediaErrorBanner}>
      <Text style={liveVideoStyles.mediaErrorText}>{message}</Text>
    </View>
  )
}
```

- [ ] **Step 6: Rewrite workshop-video-room.tsx to use the shared module**

Replace the full contents of `apps/mobile-app/components/workshop-video-room.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  AudioSession,
  LiveKitRoom,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useTracks,
} from '@livekit/react-native'
import { Track } from 'livekit-client'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'
import { MediaErrorBanner } from './live-video/media-error-banner'
import { ParticipantGrid } from './live-video/participant-grid'
import { RoomControls } from './live-video/room-controls'

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

// A viewer who hasn't been promoted (via "Add me") never publishes
// anything, so their own entry here is always an empty placeholder --
// showing it would give them equal screen space as an actual actor's
// video for a tile of nothing. Filtered out here rather than at the
// useTracks() source, since a promoted viewer/actor should still see
// their own tile once they can publish (matches web's own self-preview
// convention for anyone actually broadcasting).
function RoomView({ workshopId, onLeave }: { workshopId: string; onLeave: () => void }) {
  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])
  const { localParticipant } = useLocalParticipant()
  const permissions = useLocalParticipantPermissions()
  const tracks = !permissions?.canPublish
    ? allTracks.filter((track) => track.participant.identity !== localParticipant.identity)
    : allTracks

  return (
    <View style={styles.container}>
      <MediaErrorBanner />
      <ParticipantGrid tracks={tracks} />
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
  const [connectionError, setConnectionError] = useState<string | null>(null)

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
  if (connectionError) {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>{connectionError}</Text>
        <Pressable style={styles.backButton} onPress={onLeave}>
          <Text style={styles.backButtonText}>Back to workshop</Text>
        </Pressable>
      </View>
    )
  }

  const { token, serverUrl, canPublish } = sessionQuery.data

  return (
    <View style={styles.container}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        audio={canPublish}
        video={canPublish}
        connect
        onDisconnected={onLeave}
        onError={(err) => setConnectionError(err.message || 'Could not join the live session.')}
      >
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
  addMeWrap: { position: 'absolute', bottom: 90, alignSelf: 'center', alignItems: 'center', gap: spacing.xs },
  addMeButton: { backgroundColor: colors.primary, borderRadius: radius, paddingHorizontal: spacing.md, paddingVertical: 12 },
  addMeButtonText: { color: colors.primaryForeground, fontWeight: '600' },
  addMeError: { color: colors.accent, fontSize: 12, textAlign: 'center' },
})
```

- [ ] **Step 7: Typecheck**

Run: `cd apps/mobile-app && npx tsc --noEmit`
Expected: no errors — confirms every extracted piece is wired correctly and nothing in `workshop-video-room.tsx` still references the removed inline definitions.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile-app/components/live-video apps/mobile-app/components/workshop-video-room.tsx
git commit -m "refactor: extract shared live-video UI pieces out of workshop-video-room"
```

---

### Task 4: RehearsalVideoRoom component

**Files:**
- Create: `apps/mobile-app/components/rehearsal-video-room.tsx`

**Interfaces:**
- Consumes: `apiClient.getRehearsalToken` (Task 2), `MediaErrorBanner`/`ParticipantGrid`/`RoomControls` (Task 3, `./live-video/*`), `@livekit/react-native`'s `AudioSession`, `LiveKitRoom`, `useTracks`.
- Produces: `RehearsalVideoRoom({ postId, onLeave }: { postId: string; onLeave: () => void })`. Task 5's route screen renders this.

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { AudioSession, LiveKitRoom, useTracks } from '@livekit/react-native'
import { Track } from 'livekit-client'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'
import { MediaErrorBanner } from './live-video/media-error-banner'
import { ParticipantGrid } from './live-video/participant-grid'
import { RoomControls } from './live-video/room-controls'

// A rehearsal room always has exactly two participants (the post's author
// and the confirmed reader) and both always publish -- unlike Workshops'
// viewer/actor split, there's no permission gating or promotion flow here,
// so every camera track (including a placeholder for the local participant)
// renders in the grid as-is.
function RoomView({ onLeave }: { onLeave: () => void }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])

  return (
    <View style={styles.container}>
      <MediaErrorBanner />
      <ParticipantGrid tracks={tracks} />
      <RoomControls onLeave={onLeave} />
    </View>
  )
}

// Mirrors WorkshopVideoRoom's state machine (connecting -> error ->
// connected) and its react-query convention for fetching a fresh,
// single-use token (staleTime: Infinity -- a re-render mid-call must never
// silently refetch/replace the live token).
export function RehearsalVideoRoom({ postId, onLeave }: { postId: string; onLeave: () => void }) {
  const sessionQuery = useQuery({
    queryKey: ['rehearsal-token', postId],
    queryFn: () => apiClient.getRehearsalToken(postId),
    staleTime: Infinity,
  })
  const [connectionError, setConnectionError] = useState<string | null>(null)

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
        <Text style={styles.messageText}>Could not join the rehearsal.</Text>
        <Pressable style={styles.backButton} onPress={onLeave}>
          <Text style={styles.backButtonText}>Back to post</Text>
        </Pressable>
      </View>
    )
  }
  if (connectionError) {
    return (
      <View style={styles.message}>
        <Text style={styles.messageText}>{connectionError}</Text>
        <Pressable style={styles.backButton} onPress={onLeave}>
          <Text style={styles.backButtonText}>Back to post</Text>
        </Pressable>
      </View>
    )
  }

  const { token, serverUrl } = sessionQuery.data

  return (
    <View style={styles.container}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        audio
        video
        connect
        onDisconnected={onLeave}
        onError={(err) => setConnectionError(err.message || 'Could not join the rehearsal.')}
      >
        <RoomView onLeave={onLeave} />
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
})
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile-app/components/rehearsal-video-room.tsx
git commit -m "feat: add RehearsalVideoRoom component"
```

---

### Task 5: Route wiring — screen, layout, and the "Join rehearsal" entry point

**Files:**
- Create: `apps/mobile-app/app/(tabs)/community/rehearsal/[id].tsx`
- Modify: `apps/mobile-app/app/(tabs)/community/_layout.tsx`
- Modify: `apps/mobile-app/app/(tabs)/community/[id].tsx`

**Interfaces:**
- Consumes: `RehearsalVideoRoom` (Task 4, `../../../../components/rehearsal-video-room`); `CommunityPostDetailDTO`'s existing `readerStatus: ReaderStatus | null`, `authorId: string`, `matchedUserId: string | null` fields (already present, no type changes needed).
- Produces: pushed route `/community/rehearsal/[id]`, reachable from the post-detail screen.

- [ ] **Step 1: Create the route screen**

`apps/mobile-app/app/(tabs)/community/rehearsal/[id].tsx`:

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router'
import { RehearsalVideoRoom } from '../../../../components/rehearsal-video-room'

export default function RehearsalLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  return <RehearsalVideoRoom postId={id} onLeave={() => router.back()} />
}
```

- [ ] **Step 2: Register it in the Community stack layout**

In `apps/mobile-app/app/(tabs)/community/_layout.tsx`, add a new `<Stack.Screen>` entry after `tapes/[tapeId]` (matching how `workshops/_layout.tsx` registers `live/[id]`):

```tsx
      <Stack.Screen name="tapes/[tapeId]" options={{ title: '' }} />
      <Stack.Screen name="rehearsal/[id]" options={{ headerShown: false }} />
```

- [ ] **Step 3: Add the "Join rehearsal" button to the post-detail screen**

In `apps/mobile-app/app/(tabs)/community/[id].tsx`, inside the `post.channel === 'reader_sos'` block, insert a new button right after the existing `sceneDetails` line (before the `offersQuery.data` block):

```tsx
                {post.sceneDetails ? <Text style={styles.meta}>{post.sceneDetails}</Text> : null}
                {post.readerStatus === 'matched' &&
                currentUser &&
                (post.authorId === currentUser.id || post.matchedUserId === currentUser.id) ? (
                  <Pressable onPress={() => router.push(`/community/rehearsal/${id}`)}>
                    <Text style={styles.offerLink}>Join rehearsal</Text>
                  </Pressable>
                ) : null}
```

(`router` and `styles.offerLink` already exist in this file — no other changes needed.)

- [ ] **Step 4: Typecheck**

Run: `cd apps/mobile-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Using the EAS-built dev client already installed (per this app's established workflow — `pnpm dev` for Metro, no new native build needed since no native deps changed):

1. Using the two test accounts and matched post from Task 1's verification (recreate if already cleaned up), sign in as the post's author on one device/account and the matched reader on another.
2. Open the post on both, confirm "Join rehearsal" is visible to both and to neither a third unrelated account.
3. Tap it on both; confirm both land in the room, see and hear each other, and mic/camera toggle and Leave work.

Expected: matches exactly; clean up the test rows afterward.

- [ ] **Step 6: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/community/rehearsal" "apps/mobile-app/app/(tabs)/community/_layout.tsx" "apps/mobile-app/app/(tabs)/community/[id].tsx"
git commit -m "feat: wire Community 1-on-1 rehearsal room into mobile"
```
