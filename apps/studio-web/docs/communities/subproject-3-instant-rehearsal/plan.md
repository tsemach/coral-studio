# Community Sub-project 3: Instant Virtual Rehearsal Room — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let two actors open a private LiveKit video call directly from a matched `#reader-sos` post, with the post's attached sides shown alongside the call, and log a lightweight "sessions read" count for the confirmed reader.

**Architecture:** `community_posts` gains a `matchedUserId` column; a new `reader_offers` table tracks "I can read this" clicks, and a new `rehearsal_sessions` table logs one row each time the matched reader joins a room (backing a simple karma count — no webhooks, no duration tracking). The LiveKit plumbing already built for Workshops (COR-18) is split: its domain-agnostic parts move to a new `lib/livekit.ts`, and a second, simpler domain wrapper (`lib/community/rehearsal-live.ts`) mints always-both-publish tokens for 1-on-1 rooms. The room itself renders inline inside `PostDetailModal`, mirroring the existing `workshop-live-area.tsx` swap-in-place pattern rather than a new route.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), Drizzle ORM (PostgreSQL), `livekit-server-sdk` + `@livekit/components-react` (already installed for COR-18), Tailwind CSS v4.

**Spec:** [`docs/communities/subproject-3-instant-rehearsal/spec.md`](./spec.md)

## Global Constraints

* Zero external UI component libraries: adhere strictly to existing Tailwind CSS patterns in the studio codebase.
* Never run `npm start` or `yarn start` (dev server managed independently).
* No test suite is configured in this repo (per `CLAUDE.md`): verify every step with `npx tsc --noEmit` plus manual browser checks, not automated tests.
* The "I can read this" / "Confirm as reader" flow only applies to `#reader-sos` posts — no other channel is touched.
* Both rehearsal-room participants always publish audio/video — there is no viewer/promotion model (unlike Workshops' group rooms).
* No LiveKit webhooks, no session-history page, no synced/structured script viewer — see spec §6 for the full out-of-scope list.

---

### Task 1: Data model, and extracting shared LiveKit plumbing

**Files:**
- Modify: `lib/database/schema.ts`
- Create: `lib/livekit.ts`
- Modify: `lib/workshops/live.ts`

**Interfaces:**
- Produces: `communityPosts.matchedUserId` column; Drizzle tables `readerOffers`, `rehearsalSessions`; `lib/livekit.ts` exporting `requiredEnv(name): string`, `getLiveKitServerUrl(): string`, `roomServiceClient(): RoomServiceClient` for later tasks (and for `lib/workshops/live.ts`, updated in place) to import.

- [ ] **Step 1: Add `matchedUserId` to `communityPosts`, and the two new tables, in `lib/database/schema.ts`**

Add the `uniqueIndex` import is already present (used by `workshopMembers`) — no import changes needed there. In the `communityPosts` table definition, add one column inside the "Specialized fields for #reader-sos" group, right after `readerStatus`:

```typescript
  readerStatus: text('reader_status', {
    enum: ['seeking', 'matched', 'closed'],
  }).default('seeking'),
  // The confirmed reader for this request, set by confirmReader() once the
  // author picks one of the members who offered (reader_offers below) --
  // null until matched. onDelete: 'set null' so a post never becomes
  // unreadable data just because the matched member's account is removed.
  matchedUserId: text('matched_user_id').references(() => users.id, { onDelete: 'set null' }),
  rehearsalAt: timestamp('rehearsal_at', { mode: 'date' }),
```

Append two new tables after `communityAttachments`:

```typescript
// COR-22: Community Sub-project 3 -- Instant Virtual Rehearsal
export const readerOffers = pgTable(
  'reader_offers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    postId: text('post_id')
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueOfferPerUser: uniqueIndex('reader_offers_post_user_idx').on(table.postId, table.userId),
  })
)

export const rehearsalSessions = pgTable('rehearsal_sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Nullable + set null on delete -- a reader's session count should survive
  // the original post being deleted later, not silently drop.
  postId: text('post_id').references(() => communityPosts.id, { onDelete: 'set null' }),
  readerId: text('reader_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})
```

- [ ] **Step 2: Extract the domain-agnostic LiveKit helpers into `lib/livekit.ts`**

```typescript
import { RoomServiceClient } from 'livekit-server-sdk'

export function requiredEnv(name: 'LIVEKIT_URL' | 'LIVEKIT_API_KEY' | 'LIVEKIT_API_SECRET'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set -- see .env.example`)
  return value
}

// Not secret (just the server address, like any websocket URL) -- returned
// alongside a token so the client can connect without a second,
// separately-maintained NEXT_PUBLIC_ env var.
export function getLiveKitServerUrl(): string {
  return requiredEnv('LIVEKIT_URL')
}

export function roomServiceClient(): RoomServiceClient {
  // RoomServiceClient talks over plain https, so http(s):// works even
  // though the client SDK connects to the same host over wss://.
  const url = requiredEnv('LIVEKIT_URL').replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
  return new RoomServiceClient(url, requiredEnv('LIVEKIT_API_KEY'), requiredEnv('LIVEKIT_API_SECRET'))
}
```

- [ ] **Step 3: Update `lib/workshops/live.ts` to import the shared helpers instead of defining them**

Replace the top of the file (the `import` line, `roomNameFor`, `requiredEnv`, `getLiveKitServerUrl`, and `roomServiceClient` — everything before `mintLiveToken`) with:

```typescript
import { AccessToken } from 'livekit-server-sdk'
import { requiredEnv, roomServiceClient } from '@/lib/livekit'

export { getLiveKitServerUrl } from '@/lib/livekit'

// One room per workshop, named by its id. LiveKit creates the room on first
// join and tears it down once empty -- no DB row or webhook needed to track
// "is this workshop live," isWorkshopLive() below just asks LiveKit directly.
function roomNameFor(workshopId: string): string {
  return workshopId
}
```

`getLiveKitServerUrl` is re-exported here (rather than callers switching to `@/lib/livekit` directly) so `app/workshops/actions.ts`'s existing `import { getLiveKitServerUrl, mintLiveToken, promoteParticipant } from '@/lib/workshops/live'` keeps working unchanged. The rest of the file (`mintLiveToken`, `isWorkshopLive`, `promoteParticipant`) is unchanged — they already call `requiredEnv()` and `roomServiceClient()` by name, which now resolve to the imported versions.

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Push the schema change**

Run: `pnpm db:push`
Expected: Database schema updated successfully (adds `matched_user_id` to `community_posts`, creates `reader_offers` and `rehearsal_sessions` tables).

- [ ] **Step 6: Commit**

```bash
git add lib/database/schema.ts lib/livekit.ts lib/workshops/live.ts
git commit -m "feat(rehearsal-room): add data model and extract shared LiveKit helpers (COR-22)"
```

---

### Task 2: Community types and reader-offer queries

**Files:**
- Modify: `lib/community/types.ts`
- Modify: `lib/community/queries.ts`
- Create: `lib/community/reader-queries.ts`

**Interfaces:**
- Consumes: `readerOffers`, `rehearsalSessions`, `communityPosts`, `users` from `@/lib/database/schema` (Task 1).
- Produces: `CommunityPostItem`/`CommunityPostDetail` gain `matchedUserId: string | null` and `matchedUserName: string | null`; new type `ReaderOfferItem`; `listOffersForPost(postId: string): Promise<ReaderOfferItem[]>` for later tasks to import.

- [ ] **Step 1: Add fields to `lib/community/types.ts`**

In `CommunityPostItem`, add two fields right after `readerStatus`:

```typescript
  readerStatus: ReaderStatus | null
  matchedUserId: string | null
  matchedUserName: string | null
```

Append a new interface after `CommentWithAuthor`:

```typescript
export interface ReaderOfferItem {
  id: string
  userId: string
  userName: string | null
  userImage: string | null
  sessionsRead: number
  createdAt: Date
}
```

- [ ] **Step 2: Join the matched user into `listCommunityPosts` and `getCommunityPostById` in `lib/community/queries.ts`**

Add `alias` to the drizzle import and define a second reference to `users` for the matched-user join, right after the existing imports:

```typescript
import { and, desc, eq, inArray, count } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/database'
import {
  communityPosts,
  communityComments,
  communityAttachments,
  users,
} from '@/lib/database/schema'
import type {
  CommunityChannel,
  ReaderStatus,
  CommunityPostItem,
  CommunityPostDetail,
  CommentWithAuthor,
} from './types'

const matchedUser = alias(users, 'matched_user')
```

In `listCommunityPosts`, add to the `.select({...})` block (right after `readerStatus: communityPosts.readerStatus,`):

```typescript
      readerStatus: communityPosts.readerStatus,
      matchedUserId: communityPosts.matchedUserId,
      matchedUserName: matchedUser.name,
```

and add the join, right after the existing `.innerJoin(users, eq(communityPosts.authorId, users.id))`:

```typescript
    .innerJoin(users, eq(communityPosts.authorId, users.id))
    .leftJoin(matchedUser, eq(communityPosts.matchedUserId, matchedUser.id))
```

Then in the final `.map()` that builds `CommunityPostItem[]`, add the two fields alongside `readerStatus`:

```typescript
    readerStatus: row.readerStatus as ReaderStatus | null,
    matchedUserId: row.matchedUserId,
    matchedUserName: row.matchedUserName,
```

Apply the identical three edits (select columns, join, map) to `getCommunityPostById` — same column names, same join, same field additions in its own `.map()`-equivalent return object.

- [ ] **Step 3: Implement `lib/community/reader-queries.ts`**

```typescript
import { eq, inArray, count } from 'drizzle-orm'
import { db } from '@/lib/database'
import { readerOffers, rehearsalSessions, users } from '@/lib/database/schema'
import type { ReaderOfferItem } from './types'

export async function listOffersForPost(postId: string): Promise<ReaderOfferItem[]> {
  const rows = await db
    .select({
      id: readerOffers.id,
      userId: readerOffers.userId,
      userName: users.name,
      userImage: users.image,
      createdAt: readerOffers.createdAt,
    })
    .from(readerOffers)
    .innerJoin(users, eq(readerOffers.userId, users.id))
    .where(eq(readerOffers.postId, postId))
    .orderBy(readerOffers.createdAt)

  if (rows.length === 0) return []

  const userIds = rows.map((row) => row.userId)
  const sessionCounts = await db
    .select({ readerId: rehearsalSessions.readerId, count: count(rehearsalSessions.id) })
    .from(rehearsalSessions)
    .where(inArray(rehearsalSessions.readerId, userIds))
    .groupBy(rehearsalSessions.readerId)

  const sessionCountMap = new Map<string, number>()
  for (const row of sessionCounts) {
    sessionCountMap.set(row.readerId, Number(row.count))
  }

  return rows.map((row) => ({ ...row, sessionsRead: sessionCountMap.get(row.userId) ?? 0 }))
}
```

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/community/types.ts lib/community/queries.ts lib/community/reader-queries.ts
git commit -m "feat(rehearsal-room): add matched-reader queries (COR-22)"
```

---

### Task 3: Matching and room-access server actions

**Files:**
- Create: `lib/community/rehearsal-live.ts`
- Create: `app/community/rehearsal-actions.ts`
- Modify: `app/community/actions.ts`

**Interfaces:**
- Consumes: `requireActiveUser` from `@/lib/community/auth`; `communityPosts`, `readerOffers`, `rehearsalSessions` from `@/lib/database/schema` (Task 1); `requiredEnv` from `@/lib/livekit` (Task 1).
- Produces: `offerToRead(postId: string): Promise<{ error: string } | { success: true }>`, `confirmReader(postId: string, userId: string): Promise<{ error: string } | { success: true }>`, `getRehearsalToken(postId: string): Promise<{ error: string } | { token: string; serverUrl: string }>` — all consumed by Task 4's UI and Task 5's room component.

- [ ] **Step 1: Implement `lib/community/rehearsal-live.ts`**

```typescript
import { AccessToken } from 'livekit-server-sdk'
import { requiredEnv } from '@/lib/livekit'

export { getLiveKitServerUrl } from '@/lib/livekit'

// Unlike Workshops' mintLiveToken (group rooms, publish gated by "Actor"
// type + a promotion flow), a rehearsal room always has exactly two
// participants and both are always visible/audible -- there's no
// silent-viewer concept in a 1-on-1 call.
export async function mintRehearsalToken(postId: string, userId: string, name: string): Promise<string> {
  const token = new AccessToken(requiredEnv('LIVEKIT_API_KEY'), requiredEnv('LIVEKIT_API_SECRET'), {
    identity: userId,
    name,
  })
  token.addGrant({
    room: postId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  })
  return token.toJwt()
}
```

- [ ] **Step 2: Implement `app/community/rehearsal-actions.ts`**

```typescript
'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/database'
import { communityPosts, readerOffers, rehearsalSessions } from '@/lib/database/schema'
import { requireActiveUser } from '@/lib/community/auth'
import { mintRehearsalToken, getLiveKitServerUrl } from '@/lib/community/rehearsal-live'

export async function offerToRead(postId: string) {
  const user = await requireActiveUser()

  const [post] = await db
    .select({
      id: communityPosts.id,
      channel: communityPosts.channel,
      authorId: communityPosts.authorId,
      readerStatus: communityPosts.readerStatus,
    })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)

  if (!post) {
    return { error: 'Post not found' }
  }
  if (post.channel !== 'reader_sos' || post.readerStatus !== 'seeking') {
    return { error: 'This post is not open for offers' }
  }
  if (post.authorId === user.id) {
    return { error: "You can't offer to read your own post" }
  }

  await db.insert(readerOffers).values({ postId, userId: user.id }).onConflictDoNothing()

  revalidatePath(`/community/${postId}`)
  return { success: true as const }
}

export async function confirmReader(postId: string, userId: string) {
  const user = await requireActiveUser()

  const [post] = await db
    .select({ id: communityPosts.id, authorId: communityPosts.authorId })
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1)

  if (!post) {
    return { error: 'Post not found' }
  }
  if (post.authorId !== user.id && user.role !== 'admin') {
    return { error: 'Unauthorized to confirm a reader for this post' }
  }

  const [offer] = await db
    .select({ id: readerOffers.id })
    .from(readerOffers)
    .where(and(eq(readerOffers.postId, postId), eq(readerOffers.userId, userId)))
    .limit(1)

  if (!offer) {
    return { error: "This member hasn't offered to read this post" }
  }

  await db
    .update(communityPosts)
    .set({ matchedUserId: userId, readerStatus: 'matched', updatedAt: new Date() })
    .where(eq(communityPosts.id, postId))

  revalidatePath('/community')
  revalidatePath(`/community/${postId}`)
  return { success: true as const }
}

export async function getRehearsalToken(postId: string) {
  const user = await requireActiveUser()

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
    return { error: 'This rehearsal room is not available' }
  }
  if (user.id !== post.authorId && user.id !== post.matchedUserId) {
    return { error: 'Unauthorized to join this rehearsal room' }
  }

  const token = await mintRehearsalToken(postId, user.id, user.name ?? 'Member')

  // Only the reader's join counts toward their karma -- the author joining
  // their own request isn't "reading for someone."
  if (user.id === post.matchedUserId) {
    await db.insert(rehearsalSessions).values({ postId, readerId: user.id, authorId: post.authorId })
  }

  return { token, serverUrl: getLiveKitServerUrl() }
}
```

- [ ] **Step 3: Clear `matchedUserId` when a post leaves `'matched'` status, in `app/community/actions.ts`**

In `updateReaderStatus`, change the update call from:

```typescript
  await db
    .update(communityPosts)
    .set({ readerStatus: status, updatedAt: new Date() })
    .where(eq(communityPosts.id, postId))
```

to:

```typescript
  // Reopening or closing a request invalidates whoever was previously
  // confirmed -- matching a reader now happens exclusively through
  // confirmReader() (app/community/rehearsal-actions.ts), which sets
  // matchedUserId and readerStatus together. Passing 'matched' to this
  // action directly (nothing in the UI does, after Task 4) leaves
  // matchedUserId untouched rather than guessing at a value.
  await db
    .update(communityPosts)
    .set({
      readerStatus: status,
      matchedUserId: status === 'matched' ? undefined : null,
      updatedAt: new Date(),
    })
    .where(eq(communityPosts.id, postId))
```

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/community/rehearsal-live.ts app/community/rehearsal-actions.ts app/community/actions.ts
git commit -m "feat(rehearsal-room): add matching and room-access server actions (COR-22)"
```

---

### Task 4: Post detail modal — offers, confirmation, and the room button

**Files:**
- Modify: `app/community/[id]/page.tsx`
- Modify: `components/community/post-detail-modal.tsx`

**Interfaces:**
- Consumes: `listOffersForPost` from `@/lib/community/reader-queries` (Task 2); `offerToRead`, `confirmReader` from `@/app/community/rehearsal-actions` (Task 3); `ReaderOfferItem` from `@/lib/community/types` (Task 2); `RehearsalRoom`, `SidesViewer` from Task 5 (not yet created — see Step 5's expected failure below, same interdependency pattern as sub-project 2's Tasks 6/7).

- [ ] **Step 1: Fetch offers in `app/community/[id]/page.tsx` and pass them down**

Add the import and a conditional fetch, then pass the result as a new prop:

```typescript
import { getCommunityPostById, listCommentsForPost, listCommunityPosts } from '@/lib/community/queries'
import { listOffersForPost } from '@/lib/community/reader-queries'
```

```typescript
  const [post, comments, boardPosts] = await Promise.all([
    getCommunityPostById(id),
    listCommentsForPost(id),
    listCommunityPosts(),
  ])

  if (!post) {
    notFound()
  }

  const offers = post.channel === 'reader_sos' && post.readerStatus === 'seeking'
    ? await listOffersForPost(id)
    : []

  const isAdmin = (session.user as { role?: string }).role === 'admin'
```

Pass `offers={offers}` on the existing `<PostDetailModal ... />` call.

- [ ] **Step 2: Remove the old "Mark as Matched" button in `components/community/post-detail-modal.tsx`**

Remove this block entirely (matching now happens exclusively through confirming a specific offer, added in Step 4 below):

```tsx
                  {post.readerStatus !== 'matched' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusChange('matched')}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                    >
                      ✓ Mark as Matched
                    </button>
                  )}
```

- [ ] **Step 3: Accept the new props and add client state for the room view**

Change the props signature and destructuring at the top of the component:

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updateReaderStatus } from '@/app/community/actions'
import { offerToRead, confirmReader } from '@/app/community/rehearsal-actions'
import { DeletePostDialog } from './delete-post-dialog'
import { CommentComposer } from './comment-composer'
import { MarkdownContent } from './markdown-content'
import { RehearsalRoom } from './rehearsal-room'
import { SidesViewer } from './sides-viewer'
import type { CommunityPostDetail, CommentWithAuthor, ReaderStatus, ReaderOfferItem } from '@/lib/community/types'

export function PostDetailModal({
  post,
  comments,
  currentUserId,
  isAdmin,
  offers,
}: {
  post: CommunityPostDetail
  comments: CommentWithAuthor[]
  currentUserId: string
  isAdmin: boolean
  offers: ReaderOfferItem[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOfferPending, startOfferTransition] = useTransition()
  const [inRoom, setInRoom] = useState(false)

  const isAuthor = currentUserId === post.authorId
  const canManage = isAuthor || isAdmin
  const isReaderSOS = post.channel === 'reader_sos'
  const isCallboard = post.channel === 'callboard'
  const isMatchedReader = currentUserId === post.matchedUserId
  const hasOffered = offers.some((o) => o.userId === currentUserId)
```

- [ ] **Step 4: Add the offer/confirm UI inside the existing Reader SOS box**

Inside the `{isReaderSOS && (post.rehearsalAt || post.sceneDetails || post.rehearsalFormat) && (...)}` block, right after the `{canManage && (...)}` status-buttons block (the one Step 2 trimmed), add:

```tsx
              {!canManage && post.readerStatus === 'seeking' && !hasOffered && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <button
                    type="button"
                    disabled={isOfferPending}
                    onClick={() =>
                      startOfferTransition(async () => {
                        await offerToRead(post.id)
                        router.refresh()
                      })
                    }
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    I can read this
                  </button>
                </div>
              )}

              {canManage && post.readerStatus === 'seeking' && offers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-1.5">
                  <span className="text-ink-foreground/60 font-medium block">Offers to read:</span>
                  {offers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between gap-2 text-ink-foreground">
                      <span>
                        {offer.userName || 'Anonymous Member'}
                        <span className="text-ink-foreground/45"> — {offer.sessionsRead} {offer.sessionsRead === 1 ? 'session' : 'sessions'} read</span>
                      </span>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await confirmReader(post.id, offer.userId)
                            router.refresh()
                          })
                        }
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                      >
                        Confirm as reader
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {post.readerStatus === 'matched' && (isAuthor || isMatchedReader) && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <button
                    type="button"
                    onClick={() => setInRoom(true)}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    🎥 Open Rehearsal Room
                  </button>
                </div>
              )}
```

- [ ] **Step 5: Swap the modal's scrollable content for the room when `inRoom` is true**

Wrap the existing `{/* Scrollable Content Area */}` `<div>` (the whole block from `<div className="overflow-y-auto flex-1...">` through its matching closing `</div>`) in a conditional, leaving the header/close-button and bottom-actions bars unchanged:

```tsx
        {inRoom ? (
          <div className="overflow-y-auto flex-1 pr-1 mt-4 grid gap-4 md:grid-cols-2 min-h-0">
            <RehearsalRoom postId={post.id} onLeave={() => setInRoom(false)} />
            {post.attachments.length > 0 && <SidesViewer attachment={post.attachments[0]} />}
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 pr-1 space-y-5 mt-4">
            {/* ... existing content unchanged ... */}
          </div>
        )}
```

This step is expected to fail type-checking until Task 5 creates `RehearsalRoom` and `SidesViewer` — continue to Task 5 before verifying, same interdependency called out in sub-project 2's Tasks 6/7.

- [ ] **Step 6: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: FAIL — `./rehearsal-room` and `./sides-viewer` don't exist yet (Task 5). Continue to Task 5.

- [ ] **Step 7: Commit**

```bash
git add app/community/[id]/page.tsx components/community/post-detail-modal.tsx
git commit -m "feat(rehearsal-room): add offer/confirm UI and the room button (COR-22)"
```

---

### Task 5: Rehearsal video room and sides viewer

**Files:**
- Create: `components/community/rehearsal-room.tsx`
- Create: `components/community/sides-viewer.tsx`

**Interfaces:**
- Consumes: `getRehearsalToken` from `@/app/community/rehearsal-actions` (Task 3); `CommunityAttachmentItem` from `@/lib/community/types`; `LiveKitRoom`, `VideoConference` from `@livekit/components-react` (already installed for COR-18, see `components/workshops/workshop-video-room.tsx`).
- Produces: `RehearsalRoom` (props: `{ postId: string; onLeave: () => void }`) and `SidesViewer` (props: `{ attachment: CommunityAttachmentItem }`), both consumed by Task 4's `PostDetailModal`.

- [ ] **Step 1: Implement `components/community/rehearsal-room.tsx`**

Simpler than `WorkshopVideoRoom` — no `AddMeButton`/permission-promotion logic, since both participants always publish:

```tsx
'use client'

import '@livekit/components-styles'
import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import { getRehearsalToken } from '@/app/community/rehearsal-actions'

export function RehearsalRoom({ postId, onLeave }: { postId: string; onLeave: () => void }) {
  const [session, setSession] = useState<{ token: string; serverUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getRehearsalToken(postId).then((result) => {
      if (cancelled) return
      if ('error' in result) {
        setError(result.error)
      } else {
        setSession(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [postId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-ink-foreground/16 bg-ink p-6 text-center">
        <p className="text-sm text-ink-foreground/70">{error}</p>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 hover:text-ink-foreground cursor-pointer"
        >
          Back to post
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-ink-foreground/16 bg-ink p-6 text-sm text-ink-foreground/55">
        Connecting…
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.serverUrl}
      audio
      video
      data-lk-theme="default"
      className="relative flex min-h-64 flex-col rounded-xl overflow-hidden"
      onDisconnected={onLeave}
    >
      <VideoConference />
    </LiveKitRoom>
  )
}
```

- [ ] **Step 2: Implement `components/community/sides-viewer.tsx`**

```tsx
import type { CommunityAttachmentItem } from '@/lib/community/types'

export function SidesViewer({ attachment }: { attachment: CommunityAttachmentItem }) {
  const isImage = attachment.fileType.startsWith('image/')
  const isPdf = attachment.fileType === 'application/pdf'

  return (
    <div className="flex flex-col rounded-xl border border-ink-foreground/16 bg-ink p-3 min-h-64">
      <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-foreground/55">
        Sides — {attachment.filename}
      </span>

      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded attachment, not a next/image-optimizable local asset
        <img src={attachment.url} alt={attachment.filename} className="flex-1 rounded-lg object-contain" />
      ) : isPdf ? (
        <iframe src={attachment.url} title={attachment.filename} className="flex-1 rounded-lg bg-white" />
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-ink-foreground/20 text-sm text-ink-foreground/70 hover:text-ink-foreground transition-colors"
        >
          📄 Download {attachment.filename}
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors (this resolves Task 4 Step 6's expected failure).

- [ ] **Step 4: Manually verify in the browser**

Using two different member accounts (e.g. one regular tab, one private/incognito window signed in as a different active member):

1. As Account A, create a `#reader-sos` post.
2. As Account B, open the post and click "I can read this."
3. As Account A, confirm you see Account B listed under "Offers to read" with a session count, click "Confirm as reader," and confirm the post's status badge changes to "Reader Matched" and the old "Mark as Matched" button is gone.
4. As a third account (or logged out), confirm the "Open Rehearsal Room" button is not visible on this post.
5. As Account A, click "Open Rehearsal Room" — confirm the video call connects and, if the post has an attachment, it renders alongside the call.
6. As Account B, independently open the same post and click "Open Rehearsal Room" — confirm both video feeds appear in each other's call.
7. Leave the call from Account B's side; confirm reopening the post shows the room button still available (not one-shot).
8. Create a second `#reader-sos` post as Account A and have Account B offer to read it too. Before confirming, note the "— N sessions read" count shown next to Account B's name in the offers list; confirm it, join the room as Account B, leave, then reload the post and check the count increased by exactly one. Confirm Account A joining the same room did not also increment it (Account A only ever sees their own name in an offers list on a *different* post, as a check — the count is per-user, not per-post).
9. As Account A, reopen the first post to "seeking" via the existing reopen button; confirm the "Open Rehearsal Room" button disappears and a fresh "I can read this" flow is available again.

- [ ] **Step 5: Commit**

```bash
git add components/community/rehearsal-room.tsx components/community/sides-viewer.tsx
git commit -m "feat(rehearsal-room): add the video room and sides viewer (COR-22)"
```
