# Mobile App Community Writes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the mobile Community tab from read-only into read/write — create posts (with image attachments), reader-matching (offer/confirm), delete own posts, record/upload self-tapes, and add timestamped tape notes — mirroring `apps/studio-web/app/community/actions.ts`, `rehearsal-actions.ts`, and `tape-actions.ts` exactly.

**Architecture:** Same additive-only pattern as every prior mobile plan: new route files under `apps/studio-web/app/api/mobile/community/*`, gated by `getMobileUser` + `withMobileCors`, that **reimplement** each Server Action's DB-write logic (the actions authenticate via `auth()`'s cookie session, which a mobile bearer-token request never carries, so they can't be called directly). Tape *video* uploads are large (up to 500MB) and the web's own upload route uses `@vercel/blob/client`'s browser-only `handleUpload`, which doesn't run on React Native — mobile instead mints a short-lived client token server-side (`generateClientTokenFromReadWriteToken`) and uploads directly to Blob storage from the device, per the user's explicit decision (direct-to-Blob presigned PUT over proxying through our own server, which would recap the upload at a much lower body-size limit). Community *post* attachments stay small (≤10MB, capped at a few images) and are proxied through our own route exactly like the web action, just reimplemented — no presigned-upload complexity needed there.

**Tech Stack:** Same as every prior mobile plan (Next.js route handlers + Drizzle on studio-web, Expo Router + React Query on mobile), plus `expo-image-picker` (image attachments, tape picking) and `expo-camera` (tape recording) — neither installed yet.

**Spec:** `docs/superpowers/specs/2026-09-09-mobile-app-phase-2-design.md`

## Global Constraints

- No existing `studio-web` file's *behavior* changes. Every new route is additive; where a route mirrors an existing Server Action, the action's validation/business rules are reimplemented from reading the actual action (cited below per task), never guessed.
- Every new route uses `getMobileUser`/`isAdminUser` from `lib/mobile-auth.ts` and is wrapped in `withMobileCors`/exports `OPTIONS = mobileCorsPreflight` from `lib/mobile-cors.ts` (both already exist and work).
- Every write route additionally checks the caller's `users.status === 'active'` (mirroring `requireActiveUser()`) via the new shared helper in Task 1 — mobile tokens live for 30 days with no re-check otherwise, the exact gap the Community (read) plan's final review found and fixed for comment-creation; every new write route in this plan must have that check from the start.
- Mobile post attachments are **images only** for v1 (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) — no PDF support, unlike the web action. A deliberate v1 scope cut per the spec, not a bug.
- No i18n on any new mobile route — English-only, matching every prior plan (the web actions use `getDictionary()` for user-facing error strings; mobile routes return plain English strings instead, matching the mobile Foundation/Community plans' existing convention).
- Testing: no new test framework on studio-web (new routes verified via curl). `packages/api-client`'s new methods get `node:test` coverage. Mobile screens verified manually via `pnpm --filter mobile-app web` + `agent-browser` screenshots, except the tape-recording camera flow, which needs a native device/simulator pass (the web target has no camera) — verify what the web preview can (picking an existing video, upload progress, note composer) and note the gap rather than skipping verification silently.
- Adding a native dependency to `apps/mobile-app` uses `npx expo install <package>` from `apps/mobile-app/`, never plain `pnpm add` — per `apps/mobile-app/CLAUDE.md`'s dependency-isolation rule.

---

### Task 1: Shared mobile write-auth helper

**Files:**
- Create: `apps/studio-web/lib/community/mobile-write-helpers.ts`

**Interfaces:**
- Consumes: `users` table (`lib/database/schema.ts`).
- Produces: `getActiveMobileUser(userId: string): Promise<{ id: string; role: string; name: string | null; image: string | null } | null>` — consumed by every task in this plan that writes data.

- [ ] **Step 1: Write the helper**

Mirrors `requireActiveUser()` in `apps/studio-web/lib/community/auth.ts:6-29`, adapted for mobile's already-authenticated bearer-token `userId` (no session to read) and returning `null` instead of throwing — mobile routes report failure as JSON, not a thrown error a page boundary catches.

Create `apps/studio-web/lib/community/mobile-write-helpers.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'

export type ActiveMobileUser = { id: string; role: string; name: string | null; image: string | null }

export async function getActiveMobileUser(userId: string): Promise<ActiveMobileUser | null> {
  const [row] = await db
    .select({ id: users.id, role: users.role, name: users.name, image: users.image, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!row || row.status !== 'active') return null
  return { id: row.id, role: row.role, name: row.name, image: row.image }
}
```

- [ ] **Step 2: Verify**

Run `pnpm --filter studio-web exec tsc --noEmit` — must be clean (nothing calls this yet, but it must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add apps/studio-web/lib/community/mobile-write-helpers.ts
git commit -m "feat: add shared active-user check for mobile community write routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 2: Create-post route (images-only multipart)

**Files:**
- Modify: `apps/studio-web/app/api/mobile/community/posts/route.ts` (add `POST` alongside the existing `GET`)

**Interfaces:**
- Consumes: `getActiveMobileUser` (Task 1); `getCommunityPostById`, `toPostDetailDTO`; `put` (`@vercel/blob`).
- Produces: `POST /api/mobile/community/posts` (multipart/form-data) → `CommunityPostDetailDTO` (201).

- [ ] **Step 1: Add the route**

Mirrors `createCommunityPost()` in `apps/studio-web/app/community/actions.ts:34-137`, with the attachment allowlist narrowed to images only (v1 scope cut, see Global Constraints) and the `revalidatePath` calls dropped (mobile has no Next.js page cache to invalidate — its client refetches via React Query instead).

Read `apps/studio-web/app/api/mobile/community/posts/route.ts` first — it currently has only `GET`. Add these imports:

```ts
import { put } from '@vercel/blob'
import { db } from '@/lib/database'
import { communityPosts, communityAttachments } from '@/lib/database/schema'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { getCommunityPostById } from '@/lib/community/queries'
import { toPostDetailDTO } from '@/lib/community/dto'
import type { CommunityChannel, RehearsalFormat, CastingType } from '@coral-studio/types'
```

Then add:

```ts
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB, matches the web action's limit
const ALLOWED_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function isAllowedMobileAttachment(file: File): boolean {
  return ALLOWED_ATTACHMENT_TYPES.has(file.type) && file.size > 0 && file.size <= MAX_ATTACHMENT_BYTES
}

export const POST = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return Response.json({ error: 'Invalid request body.' }, { status: 400 })

  const channel = formData.get('channel') as CommunityChannel
  const title = (formData.get('title') as string)?.trim()
  const content = (formData.get('content') as string)?.trim()

  if (!channel || !title || !content) {
    return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 })
  }

  const validChannels: CommunityChannel[] = ['reader_sos', 'callboard', 'craft_chat', 'general']
  if (!validChannels.includes(channel)) {
    return Response.json({ error: 'Unknown channel.' }, { status: 400 })
  }

  let rehearsalAt: Date | null = null
  let rehearsalFormat: RehearsalFormat | null = null
  let sceneDetails: string | null = null

  if (channel === 'reader_sos') {
    const rawRehearsalAt = formData.get('rehearsalAt') as string
    if (rawRehearsalAt) {
      const parsed = new Date(rawRehearsalAt)
      if (!isNaN(parsed.getTime())) rehearsalAt = parsed
    }
    const rawFormat = formData.get('rehearsalFormat') as RehearsalFormat
    if (rawFormat === 'studio' || rawFormat === 'online') rehearsalFormat = rawFormat
    const rawSceneDetails = (formData.get('sceneDetails') as string)?.trim()
    if (rawSceneDetails) sceneDetails = rawSceneDetails
  }

  let castingType: CastingType | null = null
  let deadlineAt: Date | null = null

  if (channel === 'callboard') {
    const rawCastingType = formData.get('castingType') as CastingType
    const validCastingTypes: CastingType[] = ['student_film', 'theatre', 'feature', 'commercial', 'crew_rec']
    if (validCastingTypes.includes(rawCastingType)) castingType = rawCastingType
    const rawDeadlineAt = formData.get('deadlineAt') as string
    if (rawDeadlineAt) {
      const parsed = new Date(rawDeadlineAt)
      if (!isNaN(parsed.getTime())) deadlineAt = parsed
    }
  }

  const [createdPost] = await db
    .insert(communityPosts)
    .values({
      channel,
      title,
      content,
      authorId: user.userId,
      readerStatus: channel === 'reader_sos' ? 'seeking' : null,
      rehearsalAt,
      rehearsalFormat,
      sceneDetails,
      castingType,
      deadlineAt,
      isPinned: false,
    })
    .returning()

  const files = formData.getAll('attachments')
  for (const item of files) {
    if (!(item instanceof File) || item.size === 0) continue
    if (!isAllowedMobileAttachment(item)) {
      console.error(`Rejected mobile community attachment "${item.name}": type=${item.type} size=${item.size}`)
      continue
    }
    try {
      const pathname = `community/${createdPost.id}/${Date.now()}-${item.name}`
      const blob = await put(pathname, item, { access: 'public' })
      await db.insert(communityAttachments).values({
        postId: createdPost.id,
        url: blob.url,
        filename: item.name,
        fileType: item.type || 'application/octet-stream',
        fileSize: item.size,
      })
    } catch (err) {
      console.error('Failed to upload mobile community attachment to Vercel Blob:', err)
    }
  }

  const detail = await getCommunityPostById(createdPost.id)
  if (!detail) return Response.json({ error: 'Failed to load created post.' }, { status: 500 })
  return Response.json(toPostDetailDTO(detail), { status: 201 })
})
```

This file's existing `GET` already imports `getMobileUser`, `mobileCorsPreflight`, `withMobileCors` — reuse those.

- [ ] **Step 2: Verify**

Run `pnpm --filter studio-web exec tsc --noEmit` — must be clean.

```bash
curl -i -X POST http://localhost:3500/api/mobile/community/posts \
  -H "Authorization: Bearer $TOKEN" \
  -F "channel=general" -F "title=Hello from mobile" -F "content=Testing the new route"
# Expected: 201, a CommunityPostDetailDTO JSON body with the new post's id and empty attachments array

curl -i -X POST http://localhost:3500/api/mobile/community/posts \
  -H "Authorization: Bearer $TOKEN" \
  -F "channel=general" -F "title=With an image" -F "content=Testing attachments" \
  -F "attachments=@/path/to/a/small.jpg;type=image/jpeg"
# Expected: 201, attachments array has one entry with a public blob url
```

- [ ] **Step 3: Commit**

```bash
git add apps/studio-web/app/api/mobile/community/posts/route.ts
git commit -m "feat: add mobile create-community-post route with image attachments

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 3: Reader-status, offer-to-read, and confirm-reader routes

**Files:**
- Create: `apps/studio-web/app/api/mobile/community/posts/[id]/reader-status/route.ts`
- Modify: `apps/studio-web/app/api/mobile/community/posts/[id]/offers/route.ts` (add `POST` alongside the existing `GET`)
- Create: `apps/studio-web/app/api/mobile/community/posts/[id]/confirm-reader/route.ts`

**Interfaces:**
- Consumes: `getActiveMobileUser` (Task 1); `getCommunityPostById`; `readerOffers`, `communityPosts` (`lib/database/schema.ts`).
- Produces: `PATCH /api/mobile/community/posts/:id/reader-status` → `{ success: true }`. `POST /api/mobile/community/posts/:id/offers` → `{ success: true }` (201). `POST /api/mobile/community/posts/:id/confirm-reader` → `{ success: true }`.

- [ ] **Step 1: Reader-status route**

Mirrors `updateReaderStatus()` in `apps/studio-web/app/community/actions.ts:139-180`, including the note that setting `'matched'` directly (rather than through `confirmReader`) leaves `matchedUserId` untouched.

Create `apps/studio-web/app/api/mobile/community/posts/[id]/reader-status/route.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { communityPosts } from '@/lib/database/schema'
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'
import type { ReaderStatus } from '@coral-studio/types'

export const OPTIONS = mobileCorsPreflight

export const PATCH = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params
  const body = await request.json().catch(() => null)
  const status = body?.status as ReaderStatus
  const validStatuses: ReaderStatus[] = ['seeking', 'matched', 'closed']
  if (!validStatuses.includes(status)) {
    return Response.json({ error: 'Unknown status.' }, { status: 400 })
  }

  const [post] = await db
    .select({ id: communityPosts.id, authorId: communityPosts.authorId })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })

  const isAdmin = await isAdminUser(user.userId)
  if (post.authorId !== user.userId && !isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db
    .update(communityPosts)
    .set({ readerStatus: status, matchedUserId: status === 'matched' ? undefined : null, updatedAt: new Date() })
    .where(eq(communityPosts.id, postId))

  return Response.json({ success: true })
})
```

- [ ] **Step 2: Offer-to-read route**

Mirrors `offerToRead()` in `apps/studio-web/app/community/rehearsal-actions.ts:11-40`.

Read `apps/studio-web/app/api/mobile/community/posts/[id]/offers/route.ts` first — it currently has only `GET`. Add imports:

```ts
import { db } from '@/lib/database'
import { readerOffers } from '@/lib/database/schema'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
```

Then add:

```ts
export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params
  const post = await getCommunityPostById(postId)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })
  if (post.channel !== 'reader_sos' || post.readerStatus !== 'seeking') {
    return Response.json({ error: 'This request is not open for offers.' }, { status: 400 })
  }
  if (post.authorId === user.userId) {
    return Response.json({ error: "You can't offer to read your own request." }, { status: 400 })
  }

  await db.insert(readerOffers).values({ postId, userId: user.userId }).onConflictDoNothing()

  return Response.json({ success: true }, { status: 201 })
})
```

This file's existing `GET` already imports `getMobileUser`, `isAdminUser`, `getCommunityPostById`, `mobileCorsPreflight`, `withMobileCors` — reuse those, only add the three new imports above.

- [ ] **Step 3: Confirm-reader route**

Mirrors `confirmReader()` in `apps/studio-web/app/community/rehearsal-actions.ts:42-77`.

Create `apps/studio-web/app/api/mobile/community/posts/[id]/confirm-reader/route.ts`:

```ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { communityPosts, readerOffers } from '@/lib/database/schema'
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params
  const body = await request.json().catch(() => null)
  const readerId = typeof body?.userId === 'string' ? body.userId : ''
  if (!readerId) return Response.json({ error: 'Missing userId.' }, { status: 400 })

  const [post] = await db
    .select({ id: communityPosts.id, authorId: communityPosts.authorId })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })

  const isAdmin = await isAdminUser(user.userId)
  if (post.authorId !== user.userId && !isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [offer] = await db
    .select({ id: readerOffers.id })
    .from(readerOffers)
    .where(and(eq(readerOffers.postId, postId), eq(readerOffers.userId, readerId)))
    .limit(1)
  if (!offer) return Response.json({ error: 'That user has not offered to read this.' }, { status: 400 })

  await db
    .update(communityPosts)
    .set({ matchedUserId: readerId, readerStatus: 'matched', updatedAt: new Date() })
    .where(eq(communityPosts.id, postId))

  return Response.json({ success: true })
})
```

- [ ] **Step 4: Verify**

Run `pnpm --filter studio-web exec tsc --noEmit` — must be clean.

```bash
# Using a reader_sos post id ($POST_ID) you're not the author of:
curl -i -X POST "http://localhost:3500/api/mobile/community/posts/$POST_ID/offers" -H "Authorization: Bearer $TOKEN"
# Expected: 201 { "success": true }

# As the post's author, using the offering user's id ($READER_ID) from GET .../offers:
curl -i -X POST "http://localhost:3500/api/mobile/community/posts/$POST_ID/confirm-reader" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"userId\":\"$READER_ID\"}"
# Expected: 200 { "success": true }, and GET .../posts/$POST_ID afterward shows readerStatus "matched"

curl -i -X PATCH "http://localhost:3500/api/mobile/community/posts/$POST_ID/reader-status" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status":"closed"}'
# Expected: 200 { "success": true }
```

- [ ] **Step 5: Commit**

```bash
git add "apps/studio-web/app/api/mobile/community/posts/[id]/reader-status" \
        "apps/studio-web/app/api/mobile/community/posts/[id]/offers" \
        "apps/studio-web/app/api/mobile/community/posts/[id]/confirm-reader"
git commit -m "feat: add mobile reader-matching routes (status, offer, confirm)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 4: Delete-post route

**Files:**
- Modify: `apps/studio-web/app/api/mobile/community/posts/[id]/route.ts` (add `DELETE` alongside the existing `GET`)

**Interfaces:**
- Consumes: `getActiveMobileUser` (Task 1).
- Produces: `DELETE /api/mobile/community/posts/:id` → `{ success: true }`.

- [ ] **Step 1: Add the route**

Mirrors `deleteCommunityPost()` in `apps/studio-web/app/community/actions.ts:215-237`.

Read `apps/studio-web/app/api/mobile/community/posts/[id]/route.ts` first — it currently has only `GET`. Add imports:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { communityPosts } from '@/lib/database/schema'
import { isAdminUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
```

Then add:

```ts
export const DELETE = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id: postId } = await params
  const post = await getCommunityPostById(postId)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })

  const isAdmin = await isAdminUser(user.userId)
  if (post.authorId !== user.userId && !isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db.delete(communityPosts).where(eq(communityPosts.id, postId))

  return Response.json({ success: true })
})
```

This file's existing `GET` already imports `getMobileUser`, `getCommunityPostById`, `toPostDetailDTO`, `mobileCorsPreflight`, `withMobileCors` — reuse those, only add the imports above.

- [ ] **Step 2: Verify**

```bash
curl -i -X DELETE "http://localhost:3500/api/mobile/community/posts/$POST_ID" -H "Authorization: Bearer $TOKEN"
# Expected: 200 { "success": true } if you're the author (or an admin); GET afterward 404s
```

- [ ] **Step 3: Commit**

```bash
git add "apps/studio-web/app/api/mobile/community/posts/[id]/route.ts"
git commit -m "feat: add mobile delete-community-post route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 5: Tape upload-token and create-tape routes

**Files:**
- Create: `apps/studio-web/app/api/mobile/community/tapes/upload-token/route.ts`
- Modify: `apps/studio-web/app/api/mobile/community/tapes/route.ts` (add `POST` alongside the existing `GET`)

**Interfaces:**
- Consumes: `getActiveMobileUser` (Task 1); `generateClientTokenFromReadWriteToken` (`@vercel/blob`); `getTapeById` (`lib/community/tape-queries.ts`); `toTapeItemDTO` (`@coral-studio/types`).
- Produces: `POST /api/mobile/community/tapes/upload-token` → `{ token: string; pathname: string }`. `POST /api/mobile/community/tapes` → `TapeItemDTO` (201).

- [ ] **Step 1: Upload-token route**

Mints a short-lived client token scoped to one pathname, mirroring the constraints the web upload route (`apps/studio-web/app/community/tape-room/upload/route.ts:9-19`) passes to `handleUpload`'s `onBeforeGenerateToken` — same allowed video types and 500MB cap, just issued directly instead of through that browser-only flow. `generateClientTokenFromReadWriteToken`'s `token` option (the server's read-write token) is omitted here exactly as the existing `put()`/`del()` calls elsewhere in this codebase omit it — it defaults to `process.env.BLOB_READ_WRITE_TOKEN`.

Create `apps/studio-web/app/api/mobile/community/tapes/upload-token/route.ts`:

```ts
import { generateClientTokenFromReadWriteToken } from '@vercel/blob'
import { getMobileUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const POST = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const filename = typeof body?.filename === 'string' && body.filename ? body.filename : 'tape.mp4'

  const pathname = `community/tapes/${user.userId}/${Date.now()}-${filename}`

  const token = await generateClientTokenFromReadWriteToken({
    pathname,
    allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maximumSizeInBytes: 500 * 1024 * 1024, // 500MB -- matches the web upload route's limit
    addRandomSuffix: true,
  })

  return Response.json({ token, pathname })
})
```

- [ ] **Step 2: Create-tape route**

Mirrors `createTape()` in `apps/studio-web/app/community/tape-actions.ts:19-48`. Called after the mobile client has already uploaded the video directly to Blob storage using the token from Step 1.

Read `apps/studio-web/app/api/mobile/community/tapes/route.ts` first — it currently has only `GET`. Add imports:

```ts
import { db } from '@/lib/database'
import { tapePosts } from '@/lib/database/schema'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { getTapeById } from '@/lib/community/tape-queries'
import { toTapeItemDTO } from '@coral-studio/types'
```

Then add:

```ts
export const POST = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const videoPathname = typeof body?.videoPathname === 'string' ? body.videoPathname : ''
  const durationSeconds = typeof body?.durationSeconds === 'number' ? body.durationSeconds : null

  if (!title || !description || !videoPathname) {
    return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 })
  }

  const [createdTape] = await db
    .insert(tapePosts)
    .values({ title, description, authorId: user.userId, videoPathname, durationSeconds })
    .returning({ id: tapePosts.id })

  const tape = await getTapeById(createdTape.id)
  if (!tape) return Response.json({ error: 'Failed to load created tape.' }, { status: 500 })
  return Response.json(toTapeItemDTO(tape), { status: 201 })
})
```

This file's existing `GET` already imports `getMobileUser`, `listTapes`, `toTapeItemDTO` (from `@/lib/community/tape-types`, the shim re-export — either import path resolves to the same `@coral-studio/types` symbol, but match the file's existing import source for `toTapeItemDTO` rather than adding a second import of the same name from a different path), `mobileCorsPreflight`, `withMobileCors`.

- [ ] **Step 3: Verify**

```bash
curl -i -X POST http://localhost:3500/api/mobile/community/tapes/upload-token \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"filename":"scene.mp4"}'
# Expected: 200 { "token": "...", "pathname": "community/tapes/<userId>/..." }

curl -i -X POST http://localhost:3500/api/mobile/community/tapes \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Test tape","description":"A quick manual check","videoPathname":"community/tapes/test/fake.mp4","durationSeconds":30}'
# Expected: 201, a TapeItemDTO JSON body (videoPathname itself doesn't need a real uploaded blob to exercise this route in isolation, though the full flow does)
```

- [ ] **Step 4: Commit**

```bash
git add "apps/studio-web/app/api/mobile/community/tapes/upload-token" \
        apps/studio-web/app/api/mobile/community/tapes/route.ts
git commit -m "feat: add mobile tape upload-token and create-tape routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 6: Tape notes routes and delete-tape route

**Files:**
- Modify: `packages/types/src/tapes.ts` (add `TapeNoteItemDTO`/`toTapeNoteDTO`)
- Create: `apps/studio-web/app/api/mobile/community/tapes/[tapeId]/notes/route.ts`
- Create: `apps/studio-web/app/api/mobile/community/tapes/[tapeId]/route.ts`

**Interfaces:**
- Consumes: `TapeNoteItem`, `TapeNoteTag` (`@coral-studio/types`, already exist); `listNotesForTape` (`lib/community/tape-queries.ts`); `getActiveMobileUser` (Task 1).
- Produces: `TapeNoteItemDTO`, `toTapeNoteDTO(note: TapeNoteItem): TapeNoteItemDTO` (`@coral-studio/types`) — consumed by Task 7. `GET /api/mobile/community/tapes/:tapeId/notes` → `TapeNoteItemDTO[]`. `POST /api/mobile/community/tapes/:tapeId/notes` → `TapeNoteItemDTO` (201). `DELETE /api/mobile/community/tapes/:tapeId` → `{ success: true }`.

- [ ] **Step 1: Add the DTO conversion**

`TapeNoteItem` already exists in `packages/types/src/tapes.ts` (used by the web tape-room detail page) but has no DTO conversion yet — nothing needed one over the wire until now.

Read `packages/types/src/tapes.ts` first. Add below the existing `toTapeItemDTO`:

```ts
export type TapeNoteItemDTO = Omit<TapeNoteItem, 'createdAt'> & { createdAt: string }

export function toTapeNoteDTO(note: TapeNoteItem): TapeNoteItemDTO {
  return { ...note, createdAt: note.createdAt.toISOString() }
}
```

- [ ] **Step 2: Notes routes**

Mirrors `addTapeNote()` in `apps/studio-web/app/community/tape-actions.ts:50-94` (including its exact `VALID_TAGS` list and integer/non-negative timestamp check) plus `listNotesForTape()` (`lib/community/tape-queries.ts:62-82`) for the read side — no mobile route exposed this list yet.

Create `apps/studio-web/app/api/mobile/community/tapes/[tapeId]/notes/route.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { tapePosts, tapeNotes } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { listNotesForTape } from '@/lib/community/tape-queries'
import { toTapeNoteDTO, type TapeNoteTag } from '@coral-studio/types'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

const VALID_TAGS: TapeNoteTag[] = [
  'objective_action',
  'truthfulness_listening',
  'vocal_physicality',
  'framing_eyeline',
]

export const GET = withMobileCors(async (request: Request, { params }: { params: Promise<{ tapeId: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { tapeId } = await params
  const notes = await listNotesForTape(tapeId)
  return Response.json(notes.map(toTapeNoteDTO))
})

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ tapeId: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { tapeId } = await params
  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const timestampSeconds = body?.timestampSeconds
  const tag = body?.tag === null || body?.tag === undefined ? null : (body.tag as TapeNoteTag)

  if (!content) return Response.json({ error: 'Note cannot be empty.' }, { status: 400 })
  if (!Number.isInteger(timestampSeconds) || timestampSeconds < 0) {
    return Response.json({ error: 'Invalid timestamp.' }, { status: 400 })
  }
  if (tag !== null && !VALID_TAGS.includes(tag)) {
    return Response.json({ error: 'Unknown tag.' }, { status: 400 })
  }

  const [tape] = await db.select({ id: tapePosts.id }).from(tapePosts).where(eq(tapePosts.id, tapeId)).limit(1)
  if (!tape) return Response.json({ error: 'Tape not found.' }, { status: 404 })

  const [inserted] = await db
    .insert(tapeNotes)
    .values({ tapeId, authorId: user.userId, timestampSeconds, tag, content })
    .returning({ id: tapeNotes.id, timestampSeconds: tapeNotes.timestampSeconds, tag: tapeNotes.tag, content: tapeNotes.content, createdAt: tapeNotes.createdAt })

  return Response.json(
    toTapeNoteDTO({
      id: inserted.id,
      tapeId,
      authorId: user.userId,
      authorName: activeUser.name,
      authorImage: activeUser.image,
      authorRole: activeUser.role,
      timestampSeconds: inserted.timestampSeconds,
      tag: inserted.tag as TapeNoteTag | null,
      content: inserted.content,
      createdAt: inserted.createdAt,
    }),
    { status: 201 }
  )
})
```

- [ ] **Step 3: Delete-tape route**

Mirrors `deleteTape()` in `apps/studio-web/app/community/tape-actions.ts:96-126`, including the best-effort (never-throws) blob cleanup.

Create `apps/studio-web/app/api/mobile/community/tapes/[tapeId]/route.ts`:

```ts
import { eq } from 'drizzle-orm'
import { del } from '@vercel/blob'
import { db } from '@/lib/database'
import { tapePosts } from '@/lib/database/schema'
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getActiveMobileUser } from '@/lib/community/mobile-write-helpers'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const DELETE = withMobileCors(async (request: Request, { params }: { params: Promise<{ tapeId: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUser = await getActiveMobileUser(user.userId)
  if (!activeUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { tapeId } = await params
  const [tape] = await db
    .select({ id: tapePosts.id, authorId: tapePosts.authorId, videoPathname: tapePosts.videoPathname })
    .from(tapePosts)
    .where(eq(tapePosts.id, tapeId))
    .limit(1)
  if (!tape) return Response.json({ error: 'Tape not found.' }, { status: 404 })

  const isAdmin = await isAdminUser(user.userId)
  if (tape.authorId !== user.userId && !isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db.delete(tapePosts).where(eq(tapePosts.id, tapeId))

  try {
    await del(tape.videoPathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
  } catch {
    // The DB row is already gone -- the tape is deleted from the user's
    // perspective either way. An orphaned blob is a cleanup concern, not a
    // reason to fail the delete.
  }

  return Response.json({ success: true })
})
```

- [ ] **Step 4: Verify**

Run `pnpm --filter @coral-studio/types build` (or the workspace's equivalent typecheck) — must be clean. Then `pnpm --filter studio-web exec tsc --noEmit`.

```bash
curl -i "http://localhost:3500/api/mobile/community/tapes/$TAPE_ID/notes" -H "Authorization: Bearer $TOKEN"
# Expected: 200, [] (or existing notes)

curl -i -X POST "http://localhost:3500/api/mobile/community/tapes/$TAPE_ID/notes" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"timestampSeconds":42,"content":"Good beat here","tag":"objective_action"}'
# Expected: 201, a TapeNoteItemDTO with your name/image/role attached

curl -i -X DELETE "http://localhost:3500/api/mobile/community/tapes/$TAPE_ID" -H "Authorization: Bearer $TOKEN"
# Expected: 200 { "success": true } if you're the tape's author (or an admin)
```

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/tapes.ts \
        "apps/studio-web/app/api/mobile/community/tapes/[tapeId]"
git commit -m "feat: add mobile tape notes and delete-tape routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 7: Extend the shared API client

**Files:**
- Modify: `packages/api-client/src/client.ts`
- Modify: `packages/api-client/src/client.test.ts`

**Interfaces:**
- Consumes: `CommunityChannel`, `RehearsalFormat`, `CastingType`, `ReaderStatus`, `CommunityPostDetailDTO`, `TapeItemDTO`, `TapeNoteItemDTO`, `TapeNoteTag` (`@coral-studio/types`).
- Produces: `ApiClient` gains — `createCommunityPost(input): Promise<CommunityPostDetailDTO>`, `updateReaderStatus(postId, status): Promise<{ success: boolean }>`, `offerToRead(postId): Promise<{ success: boolean }>`, `confirmReader(postId, userId): Promise<{ success: boolean }>`, `deleteCommunityPost(postId): Promise<{ success: boolean }>`, `requestTapeUploadToken(filename): Promise<{ token: string; pathname: string }>`, `createTape(input): Promise<TapeItemDTO>`, `listTapeNotes(tapeId): Promise<TapeNoteItemDTO[]>`, `addTapeNote(tapeId, input): Promise<TapeNoteItemDTO>`, `deleteTape(tapeId): Promise<{ success: boolean }>`. `request()` gains multipart/`FormData` support.

- [ ] **Step 1: Write the failing tests**

Add to `packages/api-client/src/client.test.ts`:

```ts
test('createCommunityPost sends a multipart FormData body with no Content-Type override', async () => {
  let capturedBody: unknown
  let capturedHeaders: Record<string, string> | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedBody = init?.body
    capturedHeaders = init?.headers as Record<string, string>
    return { ok: true, status: 201, json: async () => ({ id: 'p1', channel: 'general', attachments: [] }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.createCommunityPost({ channel: 'general', title: 'Hello', content: 'World' })

  assert.ok(capturedBody instanceof FormData)
  assert.equal(capturedHeaders?.['Content-Type'], undefined)
})

test('offerToRead POSTs with no body', async () => {
  let capturedMethod: string | undefined
  let capturedBody: unknown
  globalThis.fetch = (async (_input, init) => {
    capturedMethod = init?.method
    capturedBody = init?.body
    return { ok: true, status: 201, json: async () => ({ success: true }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.offerToRead('p1')

  assert.equal(capturedMethod, 'POST')
  assert.equal(capturedBody, undefined)
})

test('addTapeNote POSTs the input as JSON', async () => {
  let capturedBody: string | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedBody = init?.body as string
    return { ok: true, status: 201, json: async () => ({ id: 'n1' }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.addTapeNote('t1', { timestampSeconds: 42, content: 'Nice beat here', tag: 'objective_action' })

  assert.equal(capturedBody, JSON.stringify({ timestampSeconds: 42, content: 'Nice beat here', tag: 'objective_action' }))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: FAIL — `client.createCommunityPost is not a function` (and similarly for the other two).

- [ ] **Step 3: Add FormData support to `request()`**

In `packages/api-client/src/client.ts`, replace the `request()` function's header/body construction:

```ts
  async function request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean } = {}
  ): Promise<T> {
    const requiresAuth = options.auth ?? true
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' }

    if (requiresAuth) {
      const token = await config.getToken()
      if (!token) {
        config.onUnauthorized()
        throw new ApiError(401, 'Not signed in.')
      }
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: isFormData ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
```

Leave the rest of the function (payload parsing, error handling) unchanged. `FormData`'s multipart boundary header is set automatically by `fetch` when no `Content-Type` is supplied — setting one manually would omit the boundary and break the upload.

- [ ] **Step 4: Implement the new methods**

Add to the top-level type import from `@coral-studio/types`:

```ts
  CastingType,
  CommunityChannel,
  RehearsalFormat,
  TapeNoteItemDTO,
  TapeNoteTag,
```

(`CommunityPostDetailDTO`, `ReaderStatus`, `TapeItemDTO` are already imported.)

Add these methods to the object `createApiClient` returns:

```ts
    createCommunityPost(input: {
      channel: CommunityChannel
      title: string
      content: string
      rehearsalAt?: string
      rehearsalFormat?: RehearsalFormat
      sceneDetails?: string
      castingType?: CastingType
      deadlineAt?: string
      attachments?: { uri: string; name: string; type: string }[]
    }): Promise<CommunityPostDetailDTO> {
      const formData = new FormData()
      formData.append('channel', input.channel)
      formData.append('title', input.title)
      formData.append('content', input.content)
      if (input.rehearsalAt) formData.append('rehearsalAt', input.rehearsalAt)
      if (input.rehearsalFormat) formData.append('rehearsalFormat', input.rehearsalFormat)
      if (input.sceneDetails) formData.append('sceneDetails', input.sceneDetails)
      if (input.castingType) formData.append('castingType', input.castingType)
      if (input.deadlineAt) formData.append('deadlineAt', input.deadlineAt)
      for (const attachment of input.attachments ?? []) {
        formData.append('attachments', { uri: attachment.uri, name: attachment.name, type: attachment.type } as unknown as Blob)
      }
      return request<CommunityPostDetailDTO>('/api/mobile/community/posts', { method: 'POST', body: formData })
    },
    updateReaderStatus(postId: string, status: ReaderStatus): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/posts/${postId}/reader-status`, {
        method: 'PATCH',
        body: { status },
      })
    },
    offerToRead(postId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/posts/${postId}/offers`, { method: 'POST' })
    },
    confirmReader(postId: string, userId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/posts/${postId}/confirm-reader`, {
        method: 'POST',
        body: { userId },
      })
    },
    deleteCommunityPost(postId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/posts/${postId}`, { method: 'DELETE' })
    },
    requestTapeUploadToken(filename: string): Promise<{ token: string; pathname: string }> {
      return request<{ token: string; pathname: string }>('/api/mobile/community/tapes/upload-token', {
        method: 'POST',
        body: { filename },
      })
    },
    createTape(input: {
      title: string
      description: string
      videoPathname: string
      durationSeconds: number | null
    }): Promise<TapeItemDTO> {
      return request<TapeItemDTO>('/api/mobile/community/tapes', { method: 'POST', body: input })
    },
    listTapeNotes(tapeId: string): Promise<TapeNoteItemDTO[]> {
      return request<TapeNoteItemDTO[]>(`/api/mobile/community/tapes/${tapeId}/notes`)
    },
    addTapeNote(
      tapeId: string,
      input: { timestampSeconds: number; content: string; tag: TapeNoteTag | null }
    ): Promise<TapeNoteItemDTO> {
      return request<TapeNoteItemDTO>(`/api/mobile/community/tapes/${tapeId}/notes`, { method: 'POST', body: input })
    },
    deleteTape(tapeId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/community/tapes/${tapeId}`, { method: 'DELETE' })
    },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: PASS — all tests green (existing tests plus the 3 new ones).

- [ ] **Step 6: Commit**

```bash
git add packages/api-client
git commit -m "feat: add community-write methods to @coral-studio/api-client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 8: New post screen

**Files:**
- Create: `apps/mobile-app/app/(tabs)/community/new.tsx`
- Modify: `apps/mobile-app/app/(tabs)/community/index.tsx` (add a "New post" button)
- Modify: `apps/mobile-app/app/(tabs)/community/_layout.tsx` (register the `new` route)

**Interfaces:**
- Consumes: `apiClient.createCommunityPost` (Task 7).

- [ ] **Step 1: Install expo-image-picker**

From `apps/mobile-app/`:

```bash
npx expo install expo-image-picker
```

This adds `expo-image-picker` to `apps/mobile-app/package.json` at the SDK-compatible version — never `pnpm add` directly, per this app's dependency-isolation rule.

- [ ] **Step 2: Register the route and add the entry point**

Read `apps/mobile-app/app/(tabs)/community/_layout.tsx` first. Add a fourth screen:

```tsx
<Stack.Screen name="new" options={{ title: 'New post' }} />
```

Read `apps/mobile-app/app/(tabs)/community/index.tsx` first. Import `Pressable` (from `react-native`) if not already imported, and add a button above the `ChannelTabs` in both the tape-room and feed branches — the simplest correct placement is right after the opening `<View style={styles.container}>` in each `return`, before `<ChannelTabs .../>`:

```tsx
<Pressable style={styles.newButton} onPress={() => router.push('/community/new')}>
  <Text style={styles.newButtonText}>New post</Text>
</Pressable>
```

Add matching styles using the theme (import `colors, radius, spacing` — this file already imports `colors, spacing`, so just add `radius` to that import):

```ts
newButton: {
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
  marginBottom: spacing.sm,
  backgroundColor: colors.primary,
  borderRadius: radius,
  paddingVertical: 12,
  alignItems: 'center',
},
newButtonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 15 },
```

- [ ] **Step 3: Write the new-post screen**

Create `apps/mobile-app/app/(tabs)/community/new.tsx`:

```tsx
import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import type { CommunityChannel, CastingType, RehearsalFormat } from '@coral-studio/types'
import { apiClient } from '../../../lib/api'
import { colors, radius, spacing } from '../../../lib/theme'

const CHANNELS: { id: CommunityChannel; label: string }[] = [
  { id: 'reader_sos', label: 'Reader SOS' },
  { id: 'callboard', label: 'Callboard' },
  { id: 'craft_chat', label: 'Craft chat' },
  { id: 'general', label: 'General' },
]

const CASTING_TYPES: CastingType[] = ['student_film', 'theatre', 'feature', 'commercial', 'crew_rec']
const REHEARSAL_FORMATS: RehearsalFormat[] = ['studio', 'online']

type PickedImage = { uri: string; name: string; type: string }

export default function NewPostScreen() {
  const router = useRouter()
  const [channel, setChannel] = useState<CommunityChannel>('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [rehearsalAt, setRehearsalAt] = useState('')
  const [rehearsalFormat, setRehearsalFormat] = useState<RehearsalFormat | null>(null)
  const [sceneDetails, setSceneDetails] = useState('')
  const [castingType, setCastingType] = useState<CastingType | null>(null)
  const [deadlineAt, setDeadlineAt] = useState('')
  const [images, setImages] = useState<PickedImage[]>([])
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createCommunityPost({
        channel,
        title: title.trim(),
        content: content.trim(),
        rehearsalAt: channel === 'reader_sos' && rehearsalAt.trim() ? new Date(rehearsalAt.trim()).toISOString() : undefined,
        rehearsalFormat: channel === 'reader_sos' ? rehearsalFormat ?? undefined : undefined,
        sceneDetails: channel === 'reader_sos' && sceneDetails.trim() ? sceneDetails.trim() : undefined,
        castingType: channel === 'callboard' ? castingType ?? undefined : undefined,
        deadlineAt: channel === 'callboard' && deadlineAt.trim() ? new Date(deadlineAt.trim()).toISOString() : undefined,
        attachments: images,
      }),
    onSuccess: (post) => router.replace(`/community/${post.id}`),
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Photo library permission is required to attach images.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    })
    if (result.canceled) return
    setImages(
      result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName ?? `photo-${index}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      }))
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Channel</Text>
      <View style={styles.channelRow}>
        {CHANNELS.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.channelOption, channel === c.id && styles.channelOptionActive]}
            onPress={() => setChannel(c.id)}
          >
            <Text style={styles.channelOptionText}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor={colors.parchmentMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Content</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="What's on your mind?"
        placeholderTextColor={colors.parchmentMuted}
        value={content}
        onChangeText={setContent}
        multiline
      />

      {channel === 'reader_sos' ? (
        <View style={styles.section}>
          <Text style={styles.label}>Rehearsal date/time (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-10-01T18:00"
            placeholderTextColor={colors.parchmentMuted}
            value={rehearsalAt}
            onChangeText={setRehearsalAt}
          />
          <Text style={styles.label}>Format</Text>
          <View style={styles.channelRow}>
            {REHEARSAL_FORMATS.map((format) => (
              <Pressable
                key={format}
                style={[styles.channelOption, rehearsalFormat === format && styles.channelOptionActive]}
                onPress={() => setRehearsalFormat(format)}
              >
                <Text style={styles.channelOptionText}>{format}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Scene details (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Which scene, characters, etc."
            placeholderTextColor={colors.parchmentMuted}
            value={sceneDetails}
            onChangeText={setSceneDetails}
          />
        </View>
      ) : null}

      {channel === 'callboard' ? (
        <View style={styles.section}>
          <Text style={styles.label}>Casting type</Text>
          <View style={styles.channelRow}>
            {CASTING_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.channelOption, castingType === type && styles.channelOptionActive]}
                onPress={() => setCastingType(type)}
              >
                <Text style={styles.channelOptionText}>{type.replace('_', ' ')}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Deadline (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-10-15"
            placeholderTextColor={colors.parchmentMuted}
            value={deadlineAt}
            onChangeText={setDeadlineAt}
          />
        </View>
      ) : null}

      <Text style={styles.label}>Images (optional, up to 4)</Text>
      <Pressable style={styles.pickButton} onPress={pickImages}>
        <Text style={styles.pickButtonText}>Choose photos</Text>
      </Pressable>
      {images.length > 0 ? (
        <View style={styles.previewRow}>
          {images.map((image) => (
            <Image key={image.uri} source={{ uri: image.uri }} style={styles.previewImage} />
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={styles.button}
        onPress={() => mutation.mutate()}
        disabled={!title.trim() || !content.trim() || mutation.isPending}
      >
        {mutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.buttonText}>Post</Text>}
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  content: { padding: spacing.md, gap: spacing.sm },
  label: { color: colors.parchmentMuted, fontSize: 13, marginTop: spacing.sm },
  section: { gap: spacing.sm },
  input: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.parchment,
    fontSize: 16,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  channelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  channelOption: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  channelOptionActive: { borderColor: colors.accent },
  channelOptionText: { color: colors.parchment, fontSize: 13 },
  pickButton: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 10, alignItems: 'center' },
  pickButtonText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  previewRow: { flexDirection: 'row', gap: spacing.xs },
  previewImage: { width: 64, height: 64, borderRadius: radius },
  error: { color: colors.accent, fontSize: 14 },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 16 },
})
```

- [ ] **Step 4: Verify**

`pnpm --filter mobile-app exec tsc --noEmit` clean. Via `pnpm --filter mobile-app web` + `agent-browser`: sign in, tap "New post", try each channel (confirm conditional fields switch correctly), attach an image via the browser's file picker (the web target's `expo-image-picker` implementation opens the OS file dialog), submit, confirm it navigates to the new post's detail screen and the attachment renders there. Screenshot the form and the resulting post.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile-app/package.json apps/mobile-app/pnpm-lock.yaml "apps/mobile-app/app/(tabs)/community"
git commit -m "feat: add mobile new-post screen with image attachments

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 9: Offer/confirm-reader and delete-post actions on the post detail screen

**Files:**
- Modify: `apps/mobile-app/app/(tabs)/community/[id].tsx`

**Interfaces:**
- Consumes: `apiClient.offerToRead`, `apiClient.confirmReader`, `apiClient.deleteCommunityPost` (Task 7).

- [ ] **Step 1: Wire in the actions**

Read `apps/mobile-app/app/(tabs)/community/[id].tsx` first (shown in full above — it already has `useState`, `useMutation`, `useQueryClient`, `useRouter` is not yet imported). Add imports:

```tsx
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
```

Inside the component, after the existing `addCommentMutation`, add:

```tsx
const router = useRouter()

const offerMutation = useMutation({
  mutationFn: () => apiClient.offerToRead(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-offers', id] }),
})

const confirmReaderMutation = useMutation({
  mutationFn: (readerId: string) => apiClient.confirmReader(id, readerId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['community-post', id] })
    queryClient.invalidateQueries({ queryKey: ['community-offers', id] })
  },
})

const deleteMutation = useMutation({
  mutationFn: () => apiClient.deleteCommunityPost(id),
  onSuccess: () => router.replace('/community'),
})

function confirmDeletePost() {
  Alert.alert('Delete this post?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
  ])
}
```

Inside the `reader_sos` section of the `ListHeaderComponent` JSX, replace the existing offers-display block:

```tsx
{offersQuery.data ? (
  offersQuery.data.offers.length > 0 ? (
    <View>
      <Text style={styles.meta}>Offered to read:</Text>
      {offersQuery.data.offers.map((offer) => (
        <Pressable key={offer.id} onPress={() => confirmReaderMutation.mutate(offer.userId)}>
          <Text style={styles.offerLink}>{offer.userName ?? 'Someone'} — confirm as reader</Text>
        </Pressable>
      ))}
    </View>
  ) : offersQuery.data.hasOffered ? (
    <Text style={styles.meta}>You've offered to read.</Text>
  ) : (
    <Pressable onPress={() => offerMutation.mutate()} disabled={offerMutation.isPending}>
      <Text style={styles.offerLink}>Offer to read this</Text>
    </Pressable>
  )
) : null}
```

This distinguishes three states correctly: the post's author/admin sees confirmable offers (if any exist); a non-author who already offered sees the existing "You've offered to read." message; a non-author who hasn't offered yet now sees an actual "Offer to read this" action (closing the gap the Community read-only plan intentionally left open, since offers were read-only until this plan).

Add a delete button near the top of the `ListHeaderComponent`, after the `author` `<Text>`:

```tsx
<Pressable onPress={confirmDeletePost}>
  <Text style={styles.deleteLink}>Delete post</Text>
</Pressable>
```

Add matching styles to the file's existing `StyleSheet.create` call:

```ts
offerLink: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: 2 },
deleteLink: { color: colors.accent, fontSize: 12, marginHorizontal: spacing.md, marginBottom: spacing.xs },
```

- [ ] **Step 2: Verify**

`pnpm --filter mobile-app exec tsc --noEmit` clean. Via `pnpm --filter mobile-app web` + `agent-browser`, using two different signed-in accounts (or one account you can toggle) to exercise both sides: as a non-author on a `reader_sos` post, tap "Offer to read this" and confirm it flips to "You've offered to read."; as the post's author, confirm the offering user now appears with a "confirm as reader" link, tap it, and confirm the post's reader status becomes "matched". Then, as the author of a disposable test post (create one via Task 8's screen first), tap "Delete post", confirm the native confirm dialog, and confirm it navigates back to the feed and the post is gone. Screenshot each state.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/community/[id].tsx"
git commit -m "feat: add offer/confirm-reader and delete-post actions to mobile post detail

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 10: Tape recording/picking and upload flow

**Files:**
- Create: `apps/mobile-app/app/(tabs)/community/tapes/new.tsx`
- Modify: `apps/mobile-app/app/(tabs)/community/index.tsx` (add a "New tape" button in the tape-room branch)
- Modify: `apps/mobile-app/app/(tabs)/community/_layout.tsx` (register the `tapes/new` route)

**Interfaces:**
- Consumes: `apiClient.requestTapeUploadToken`, `apiClient.createTape` (Task 7); `@vercel/blob/client`'s `put`.

- [ ] **Step 1: Install expo-camera and @vercel/blob**

From `apps/mobile-app/`:

```bash
npx expo install expo-camera
```

`@vercel/blob` is a pure-JS package (no native module), so it's added the normal workspace way rather than via `expo install`:

```bash
pnpm add @vercel/blob --filter mobile-app
```

- [ ] **Step 2: Register the route and add the entry point**

Read `apps/mobile-app/app/(tabs)/community/_layout.tsx` first. Add a fifth screen:

```tsx
<Stack.Screen name="tapes/new" options={{ title: 'New tape' }} />
```

Read `apps/mobile-app/app/(tabs)/community/index.tsx` first (already modified in Task 8 to add "New post"). In the `isTapeRoom` branch's returned JSX, add a second button below the "New post" one:

```tsx
<Pressable style={styles.newButton} onPress={() => router.push('/community/tapes/new')}>
  <Text style={styles.newButtonText}>New tape</Text>
</Pressable>
```

(Reuses the `newButton`/`newButtonText` styles Task 8 already added.)

- [ ] **Step 3: Write the tape upload screen**

Recording via the device camera needs a native build (per this plan's Global Constraints, the web target has no camera) — this screen supports both recording (native only, gated behind `Platform.OS !== 'web'`) and picking an existing video from the library (works on both). Uploads directly to Blob storage from the device using the presigned client token from Task 5, then calls `createTape` once the upload finishes.

Create `apps/mobile-app/app/(tabs)/community/tapes/new.tsx`:

```tsx
import { useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { put } from '@vercel/blob/client'
import { apiClient } from '../../../../lib/api'
import { colors, radius, spacing } from '../../../../lib/theme'

type PickedVideo = { uri: string; name: string; type: string; durationSeconds: number | null }

export default function NewTapeScreen() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [video, setVideo] = useState<PickedVideo | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!video) throw new Error('Choose a video first.')

      setUploadProgress(0)
      const { token, pathname } = await apiClient.requestTapeUploadToken(video.name)

      const response = await fetch(video.uri)
      const blob = await response.blob()

      await put(pathname, blob, {
        access: 'private',
        token,
        contentType: video.type,
        onUploadProgress: (event) => setUploadProgress(event.percentage),
      })

      return apiClient.createTape({
        title: title.trim(),
        description: description.trim(),
        videoPathname: pathname,
        durationSeconds: video.durationSeconds,
      })
    },
    onSuccess: (tape) => router.replace(`/community/tapes/${tape.id}`),
    onError: (err) => {
      setUploadProgress(null)
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    },
  })

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Photo library permission is required to choose a video.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    })
    if (result.canceled || result.assets.length === 0) return
    const asset = result.assets[0]
    setVideo({
      uri: asset.uri,
      name: asset.fileName ?? 'tape.mp4',
      type: asset.mimeType ?? 'video/mp4',
      durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : null,
    })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Scene title"
        placeholderTextColor={colors.parchmentMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="What's the scene, who's in it..."
        placeholderTextColor={colors.parchmentMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Video</Text>
      <Pressable style={styles.pickButton} onPress={pickVideo}>
        <Text style={styles.pickButtonText}>{video ? video.name : 'Choose a video from your library'}</Text>
      </Pressable>
      {Platform.OS === 'web' ? (
        <Text style={styles.hint}>Recording directly is only available in the installed app, not this web preview.</Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {uploadProgress !== null ? <Text style={styles.hint}>Uploading… {Math.round(uploadProgress)}%</Text> : null}

      <Pressable
        style={styles.button}
        onPress={() => mutation.mutate()}
        disabled={!title.trim() || !description.trim() || !video || mutation.isPending}
      >
        {mutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.buttonText}>Upload tape</Text>}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, padding: spacing.md, gap: spacing.sm },
  label: { color: colors.parchmentMuted, fontSize: 13, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.parchment,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  pickButton: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  pickButtonText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  hint: { color: colors.parchmentMuted, fontSize: 12 },
  error: { color: colors.accent, fontSize: 14 },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 16 },
})
```

Recording via `expo-camera` (native-only) is intentionally left out of this screen's v1: picking an existing video already exercises the full upload pipeline (token mint → direct Blob PUT → `createTape`), and a native capture UI is a separate, purely-additive screen that needs a device pass to verify at all — safer to land the upload pipeline first and add an in-app record button in a follow-up once this flow is proven on-device. Note this scope cut in the task's commit message.

- [ ] **Step 4: Verify**

`pnpm --filter mobile-app exec tsc --noEmit` clean. Via `pnpm --filter mobile-app web` + `agent-browser`: open the tape room, tap "New tape", pick a small video file via the browser's file picker, fill in title/description, tap "Upload tape", confirm the progress indicator moves and it navigates to the new tape's playback screen when done. This exercises the full token-mint-and-direct-upload pipeline on the web target; note in your task report that the native recording path (Step 3's deferred scope) still needs a device/simulator pass before shipping, per this plan's Global Constraints.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile-app/package.json apps/mobile-app/pnpm-lock.yaml "apps/mobile-app/app/(tabs)/community"
git commit -m "feat: add mobile tape upload flow (pick video, direct-to-blob upload)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 11: Note composer on the tape playback screen

**Files:**
- Modify: `apps/mobile-app/app/(tabs)/community/tapes/[tapeId].tsx`

**Interfaces:**
- Consumes: `apiClient.listTapeNotes`, `apiClient.addTapeNote` (Task 7).

- [ ] **Step 1: Wire in the notes list and composer**

Read `apps/mobile-app/app/(tabs)/community/tapes/[tapeId].tsx` first (shown in full above). Replace its content with the notes list and composer added below the video player:

```tsx
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useVideoPlayer, VideoView } from 'expo-video'
import type { TapeNoteTag } from '@coral-studio/types'
import { apiClient } from '../../../../lib/api'
import { colors, radius, spacing } from '../../../../lib/theme'

const TAGS: { id: TapeNoteTag; label: string }[] = [
  { id: 'objective_action', label: 'Objective/action' },
  { id: 'truthfulness_listening', label: 'Truthfulness/listening' },
  { id: 'vocal_physicality', label: 'Vocal/physicality' },
  { id: 'framing_eyeline', label: 'Framing/eyeline' },
]

export default function TapeDetailScreen() {
  const { tapeId } = useLocalSearchParams<{ tapeId: string }>()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [tag, setTag] = useState<TapeNoteTag | null>(null)

  const videoUrlQuery = useQuery({
    queryKey: ['tape-video-url', tapeId],
    queryFn: () => apiClient.getTapeVideoUrl(tapeId),
    enabled: !!tapeId,
  })

  const notesQuery = useQuery({
    queryKey: ['tape-notes', tapeId],
    queryFn: () => apiClient.listTapeNotes(tapeId),
    enabled: !!tapeId,
  })

  const player = useVideoPlayer(videoUrlQuery.data?.url ?? null, (p) => {
    p.loop = false
  })

  const addNoteMutation = useMutation({
    mutationFn: () =>
      apiClient.addTapeNote(tapeId, {
        timestampSeconds: Math.floor(player.currentTime),
        content: draft.trim(),
        tag,
      }),
    onSuccess: () => {
      setDraft('')
      setTag(null)
      queryClient.invalidateQueries({ queryKey: ['tape-notes', tapeId] })
    },
  })

  if (videoUrlQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading…</Text>
      </View>
    )
  }
  if (videoUrlQuery.error || !videoUrlQuery.data) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Could not load this tape.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <VideoView style={styles.video} player={player} nativeControls />
      <FlatList
        data={notesQuery.data ?? []}
        keyExtractor={(note) => note.id}
        style={styles.notesList}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Notes</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.noteRow} onPress={() => player.currentTime = item.timestampSeconds}>
            <Text style={styles.noteTimestamp}>{formatTimestamp(item.timestampSeconds)}</Text>
            <View style={styles.noteBody}>
              {item.tag ? <Text style={styles.noteTag}>{item.tag.replace('_', ' ')}</Text> : null}
              <Text style={styles.noteContent}>{item.content}</Text>
              <Text style={styles.noteAuthor}>{item.authorName ?? 'Unknown'}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.message}>No notes yet.</Text>}
      />
      <View style={styles.tagRow}>
        {TAGS.map((t) => (
          <Pressable key={t.id} style={[styles.tagOption, tag === t.id && styles.tagOptionActive]} onPress={() => setTag(tag === t.id ? null : t.id)}>
            <Text style={styles.tagOptionText}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Add a note at the current timestamp…"
          placeholderTextColor={colors.parchmentMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          style={styles.sendButton}
          disabled={!draft.trim() || addNoteMutation.isPending}
          onPress={() => addNoteMutation.mutate()}
        >
          <Text style={styles.sendButtonText}>Add</Text>
        </Pressable>
      </View>
    </View>
  )
}

function formatTimestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  message: { padding: 24, textAlign: 'center', color: colors.parchmentMuted },
  video: { width: '100%', height: 240, backgroundColor: '#000' },
  notesList: { flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.parchment, margin: spacing.md, marginBottom: spacing.xs },
  noteRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderColor: colors.hairline },
  noteTimestamp: { color: colors.accent, fontWeight: '700', fontSize: 13, width: 40 },
  noteBody: { flex: 1, gap: 2 },
  noteTag: { color: colors.parchmentMuted, fontSize: 11, textTransform: 'uppercase' },
  noteContent: { color: colors.parchment },
  noteAuthor: { color: colors.parchmentMuted, fontSize: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  tagOption: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  tagOptionActive: { borderColor: colors.accent },
  tagOptionText: { color: colors.parchment, fontSize: 12 },
  composer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm + spacing.xs, borderTopWidth: 1, borderColor: colors.hairline },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    padding: 10,
    maxHeight: 100,
    backgroundColor: colors.inkCard,
    color: colors.parchment,
  },
  sendButton: { backgroundColor: colors.primary, borderRadius: radius, paddingHorizontal: spacing.md, justifyContent: 'center' },
  sendButtonText: { color: colors.primaryForeground, fontWeight: '600' },
})
```

- [ ] **Step 2: Verify**

`pnpm --filter mobile-app exec tsc --noEmit` clean. Via `pnpm --filter mobile-app web` + `agent-browser`: open a tape, let it play a few seconds, pick a tag, type a note, tap "Add", confirm it appears in the notes list with the right timestamp; tap an existing note and confirm playback seeks to it. Screenshot the notes list and the composer.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/community/tapes/[tapeId].tsx"
git commit -m "feat: add note composer to mobile tape playback screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```
