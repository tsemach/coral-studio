# React Query: Foundation + Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire TanStack Query into the app (provider + the one existing poll) and fully convert the Community feature (`app/community/**`) to it — Infinite Query feed, parallel post-detail queries, and optimistic mutations for comments, reader status, delete, and create.

**Architecture:** SSR + hydrate: Server Components keep doing the first DB read and `dehydrate()` it into a `HydrationBoundary`; the client's React Query cache takes over from there. Reads go through new thin GET Route Handlers (`queryFn`); writes stay the existing `'use server'` functions (`mutationFn`) — Next.js queues Server Action calls one-at-a-time on the client, so routing reads through them would silently kill the parallel-queries goal. All Dates crossing into the cache are normalized to ISO strings via a small DTO layer.

**Tech Stack:** `@tanstack/react-query` v5, `@tanstack/react-query-devtools`, Next.js 16 App Router (this repo pins a version with behavior changes vs. training data — see `AGENTS.md`), Drizzle ORM, existing `next-auth` session (`auth()`).

**Spec:** `docs/react-query/design.md` (sections §1–§11 cover this plan's scope; §13–§15 cover Workshops/Admin/Scripts, which are follow-on plans — see "Scope note" below).

## Scope note

The spec covers four feature areas (Community, Workshops, Admin, Scripts). This
plan implements the **foundation + Community** only — that's the fully-detailed,
fully-verified part of the spec, and Community is by far the largest surface
(Infinite Query, parallel queries, and every optimistic-update variant all
live here). Workshops/Admin/Scripts reuse the exact same patterns against
smaller, differently-shaped data (their route handlers and hooks are already
spec'd in §13–§15), but their component trees run several levels deeper than
what's been read in this session (e.g. `workshop-main.tsx` → sidebar/member/
rehearsal sub-components not yet inspected) — writing a placeholder-free,
bite-sized plan for them needs that reading done first. They'll follow as
separate plans on this same branch once this one lands.

## Global Constraints

- Package manager is pnpm — never introduce an npm/yarn lockfile (`CLAUDE.md`).
- No test suite exists in this repo (`CLAUDE.md`). Every task's verification
  step below uses `pnpm exec tsc --noEmit` (fast type-check) and/or `pnpm build`
  (full build + lint), plus a concrete manual check against `pnpm dev` — there
  is no automated test to run instead.
- Reads use Route Handlers as `queryFn`; writes use the existing `'use server'`
  functions as `mutationFn`. Never call a Server Action from inside a `queryFn`
  (spec §2).
- Every Date field returned to a `queryFn` caller must already be an ISO
  string (spec §6) — map through the DTO functions in `lib/community/dto.ts`,
  never pass a raw Drizzle row across a Route Handler or a `prefetchQuery` call.
- Every new Route Handler re-checks the session with `auth()` the same way
  `app/workshops/[id]/live-status/route.ts` already does — render-time gating
  is never a security boundary.
- Business logic in `lib/community/queries.ts`, `lib/community/reader-queries.ts`,
  `app/community/actions.ts`, and `app/community/rehearsal-actions.ts` does not
  change except the one pagination signature change in Task 4 — only what
  *calls* these functions changes.
- Follow existing Tailwind design tokens (`bg-ink`, `text-ink-foreground/NN`,
  etc.) and existing component conventions — don't introduce new visual
  patterns for loading/error/empty states; match what's already in
  `CommunityShell`'s current empty-state markup (Task 6 relocates it verbatim).

---

## Task 1: Install React Query and add the provider

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Create: `components/query-provider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `QueryProvider` (React component, `children: ReactNode`), used by every later task's pages.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

- [ ] **Step 2: Create the provider**

`components/query-provider.tsx`:

```tsx
'use client'

import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Wire it into the root layout**

In `app/layout.tsx`, add the import and wrap `children`:

```diff
 import { AuthSessionProvider } from '@/components/auth-session-provider'
+import { QueryProvider } from '@/components/query-provider'
 import './globals.css'
```

```diff
       <body className="font-sans antialiased">
-        <AuthSessionProvider>{children}</AuthSessionProvider>
+        <AuthSessionProvider>
+          <QueryProvider>{children}</QueryProvider>
+        </AuthSessionProvider>
       </body>
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

Run: `pnpm dev`, open any page (e.g. `/`), open browser devtools console — no
runtime errors. The React Query devtools icon (floating button, bottom of
screen) should be visible since `NODE_ENV=development` under `next dev`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml components/query-provider.tsx app/layout.tsx
git commit -m "feat(react-query): add QueryProvider and wire into root layout"
```

## Task 2: Convert the workshop go-live poll to useQuery

Smallest possible query example — no dependency on anything below, safe warm-up.

**Files:**
- Create: `hooks/workshops/use-live-status.ts`
- Modify: `components/workshops/go-live-button.tsx`

**Interfaces:**
- Produces: `useLiveStatus(workshopId: string)` → `UseQueryResult<{ live: boolean }>`

- [ ] **Step 1: Create the hook**

`hooks/workshops/use-live-status.ts`:

```ts
'use client'

import { useQuery } from '@tanstack/react-query'

export function useLiveStatus(workshopId: string) {
  return useQuery({
    queryKey: ['workshop', workshopId, 'live'] as const,
    queryFn: async () => {
      const res = await fetch(`/workshops/${workshopId}/live-status`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch live status')
      return (await res.json()) as { live: boolean }
    },
    refetchInterval: 8000,
    staleTime: 0,
  })
}
```

- [ ] **Step 2: Replace the manual poll in `GoLiveButton`**

`components/workshops/go-live-button.tsx` — full replacement:

```tsx
'use client'

import { useWorkshopLive } from '@/components/workshops/workshop-live-area'
import { useLiveStatus } from '@/hooks/workshops/use-live-status'

// Opt-in per member (COR-18): this only starts the video view locally for
// whoever clicks it. Other members keep seeing WorkshopMain until they press
// this same button themselves -- polling live-status is what turns it into
// "Live now Â· Join" for them once someone else is already in the room.
export function GoLiveButton({ workshopId }: { workshopId: string }) {
  const { goLive } = useWorkshopLive()
  const { data } = useLiveStatus(workshopId)
  const live = Boolean(data?.live)

  return (
    <button
      type="button"
      onClick={goLive}
      className={
        live
          ? 'inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground'
          : 'inline-flex items-center gap-2 rounded-xl border border-ink-foreground/16 px-4 py-2.5 text-sm font-semibold text-ink-foreground transition-colors hover:border-ink-foreground/30'
      }
    >
      {live && <span className="h-2 w-2 rounded-full bg-[#f0a8b4]" aria-hidden />}
      {live ? 'Live · Join' : 'Go live'}
    </button>
  )
}
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit` — no errors.

Manual: `pnpm dev`, open a workshop with another member in a second browser
session (or two tabs signed in as two different members), have one join the
live call, confirm the other's "Go live" button flips to "Live · Join" within
~8s — same behavior as before, now backed by `useLiveStatus`.

- [ ] **Step 4: Commit**

```bash
git add hooks/workshops/use-live-status.ts components/workshops/go-live-button.tsx
git commit -m "refactor(workshops): convert go-live polling to useQuery"
```

## Task 3: Community foundation — query keys, DTOs, pagination cursor

**Files:**
- Create: `lib/community/query-keys.ts`
- Create: `lib/community/dto.ts`
- Create: `lib/community/pagination.ts`

**Interfaces:**
- Produces: `communityKeys` (object), `toPostItemDTO`, `toPostDetailDTO`, `toCommentDTO`, `toOfferDTO` (functions), `CommunityPostItemDTO`, `CommunityPostDetailDTO`, `CommentWithAuthorDTO`, `ReaderOfferItemDTO`, `CommunityAttachmentItemDTO` (types), `PostsCursor` (type), `encodeCursor`, `decodeCursor` (functions) — all consumed by Tasks 4–8.
- Consumes: `CommunityChannel`, `ReaderStatus`, `CommunityPostItem`, `CommunityPostDetail`, `CommentWithAuthor`, `ReaderOfferItem` from `lib/community/types.ts` (existing, unchanged).

- [ ] **Step 1: Query keys**

`lib/community/query-keys.ts`:

```ts
import type { CommunityChannel, ReaderStatus } from './types'

export const communityKeys = {
  all: ['community'] as const,
  posts: () => [...communityKeys.all, 'posts'] as const,
  postsList: (channel?: CommunityChannel, status?: ReaderStatus) =>
    [...communityKeys.posts(), 'list', { channel: channel ?? null, status: status ?? null }] as const,
  postDetail: (postId: string) => [...communityKeys.all, 'post', postId] as const,
  comments: (postId: string) => [...communityKeys.all, 'comments', postId] as const,
  offers: (postId: string) => [...communityKeys.all, 'offers', postId] as const,
}
```

- [ ] **Step 2: DTOs (Date → string)**

`lib/community/dto.ts`:

```ts
import type {
  CommunityPostItem,
  CommunityPostDetail,
  CommentWithAuthor,
  ReaderOfferItem,
} from './types'

export type CommunityPostItemDTO = Omit<
  CommunityPostItem,
  'createdAt' | 'updatedAt' | 'rehearsalAt' | 'deadlineAt'
> & {
  createdAt: string
  updatedAt: string
  rehearsalAt: string | null
  deadlineAt: string | null
}

export function toPostItemDTO(post: CommunityPostItem): CommunityPostItemDTO {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    rehearsalAt: post.rehearsalAt?.toISOString() ?? null,
    deadlineAt: post.deadlineAt?.toISOString() ?? null,
  }
}

export type CommunityAttachmentItemDTO = Omit<CommunityPostDetail['attachments'][number], 'createdAt'> & {
  createdAt: string
}

export type CommunityPostDetailDTO = CommunityPostItemDTO & {
  attachments: CommunityAttachmentItemDTO[]
}

export function toPostDetailDTO(post: CommunityPostDetail): CommunityPostDetailDTO {
  return {
    ...toPostItemDTO(post),
    attachments: post.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  }
}

export type CommentWithAuthorDTO = Omit<CommentWithAuthor, 'createdAt'> & { createdAt: string }

export function toCommentDTO(comment: CommentWithAuthor): CommentWithAuthorDTO {
  return { ...comment, createdAt: comment.createdAt.toISOString() }
}

export type ReaderOfferItemDTO = Omit<ReaderOfferItem, 'createdAt'> & { createdAt: string }

export function toOfferDTO(offer: ReaderOfferItem): ReaderOfferItemDTO {
  return { ...offer, createdAt: offer.createdAt.toISOString() }
}
```

- [ ] **Step 3: Pagination cursor helpers**

`lib/community/pagination.ts`:

```ts
export interface PostsCursor {
  createdAt: string
  id: string
}

export function encodeCursor(cursor: PostsCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCursor(raw: string | null): PostsCursor | null {
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as PostsCursor
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit` — no errors. These three files aren't imported
anywhere yet, so this only checks they're internally well-typed.

- [ ] **Step 5: Commit**

```bash
git add lib/community/query-keys.ts lib/community/dto.ts lib/community/pagination.ts
git commit -m "feat(community): add react-query key factory, DTOs, and pagination cursor"
```

## Task 4: Paginate `listCommunityPosts`

**Files:**
- Modify: `lib/community/queries.ts:21-102`
- Modify: `app/community/page.tsx:33`
- Modify: `app/community/[id]/page.tsx:42`

**Interfaces:**
- Consumes: `PostsCursor` from `lib/community/pagination.ts` (Task 3).
- Produces: `listCommunityPosts(options: { channel?, status?, cursor?, limit? }): Promise<{ items: CommunityPostItem[]; nextCursor: PostsCursor | null }>` — **breaking signature change**, both call sites updated in this same task so the build stays green.

- [ ] **Step 1: Replace `listCommunityPosts`**

In `lib/community/queries.ts`, add the import and replace the function
(lines 21–102):

```diff
 import type {
   CommunityChannel,
   ReaderStatus,
   CommunityPostItem,
   CommunityPostDetail,
   CommentWithAuthor,
 } from './types'
+import type { PostsCursor } from './pagination'
```

```ts
export async function listCommunityPosts(options: {
  channel?: CommunityChannel
  status?: ReaderStatus
  cursor?: PostsCursor | null
  limit?: number
} = {}): Promise<{ items: CommunityPostItem[]; nextCursor: PostsCursor | null }> {
  const { channel, status, cursor, limit = 20 } = options
  const conditions = []
  if (channel) {
    conditions.push(eq(communityPosts.channel, channel))
  }
  if (status) {
    conditions.push(eq(communityPosts.readerStatus, status))
  }
  if (cursor) {
    // Paginated pages exclude pinned posts -- they were already shown,
    // unpaginated, on the first page (see below).
    conditions.push(eq(communityPosts.isPinned, false))
    conditions.push(
      or(
        lt(communityPosts.createdAt, new Date(cursor.createdAt)),
        and(eq(communityPosts.createdAt, new Date(cursor.createdAt)), lt(communityPosts.id, cursor.id))
      )
    )
  }

  const query = db
    .select({
      id: communityPosts.id,
      channel: communityPosts.channel,
      title: communityPosts.title,
      content: communityPosts.content,
      authorId: communityPosts.authorId,
      authorName: users.name,
      authorImage: users.image,
      authorRole: users.role,
      readerStatus: communityPosts.readerStatus,
      matchedUserId: communityPosts.matchedUserId,
      matchedUserName: matchedUser.name,
      rehearsalAt: communityPosts.rehearsalAt,
      rehearsalFormat: communityPosts.rehearsalFormat,
      sceneDetails: communityPosts.sceneDetails,
      castingType: communityPosts.castingType,
      deadlineAt: communityPosts.deadlineAt,
      isPinned: communityPosts.isPinned,
      createdAt: communityPosts.createdAt,
      updatedAt: communityPosts.updatedAt,
    })
    .from(communityPosts)
    .innerJoin(users, eq(communityPosts.authorId, users.id))
    .leftJoin(matchedUser, eq(communityPosts.matchedUserId, matchedUser.id))

  const rows = await (conditions.length > 0 ? query.where(and(...conditions)) : query)
    .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt), desc(communityPosts.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows

  if (pageRows.length === 0) return { items: [], nextCursor: null }

  const postIds = pageRows.map((r) => r.id)
  const commentCounts = await db
    .select({
      postId: communityComments.postId,
      count: count(communityComments.id),
    })
    .from(communityComments)
    .where(inArray(communityComments.postId, postIds))
    .groupBy(communityComments.postId)

  const commentCountMap = new Map<string, number>()
  for (const c of commentCounts) {
    commentCountMap.set(c.postId, Number(c.count))
  }

  const items = pageRows.map((row) => ({
    id: row.id,
    channel: row.channel as CommunityChannel,
    title: row.title,
    content: row.content,
    authorId: row.authorId,
    authorName: row.authorName,
    authorImage: row.authorImage,
    authorRole: row.authorRole,
    readerStatus: row.readerStatus as ReaderStatus | null,
    matchedUserId: row.matchedUserId,
    matchedUserName: row.matchedUserName,
    rehearsalAt: row.rehearsalAt,
    rehearsalFormat: row.rehearsalFormat as CommunityPostItem['rehearsalFormat'],
    sceneDetails: row.sceneDetails,
    castingType: row.castingType as CommunityPostItem['castingType'],
    deadlineAt: row.deadlineAt,
    isPinned: row.isPinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    commentsCount: commentCountMap.get(row.id) ?? 0,
  }))

  const last = pageRows[pageRows.length - 1]
  const nextCursor: PostsCursor | null =
    hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null

  return { items, nextCursor }
}
```

Also add `or` and `lt` to the drizzle-orm import at the top of the file:

```diff
-import { and, desc, eq, inArray, count } from 'drizzle-orm'
+import { and, desc, eq, inArray, count, or, lt } from 'drizzle-orm'
```

- [ ] **Step 2: Fix the two call sites (temporary shape, not yet paginated in the UI)**

`app/community/page.tsx:33` — change:

```diff
-  const posts = await listCommunityPosts(activeChannel, status)
+  const { items: posts } = await listCommunityPosts({ channel: activeChannel, status })
```

`app/community/[id]/page.tsx:42` — change:

```diff
-    listCommunityPosts(),
+    listCommunityPosts({}).then((r) => r.items),
```

(Both call sites are replaced properly by Task 6's hydration wiring — this
step only keeps the app compiling and behaviorally identical in the
meantime: first 20 non-cursor-paginated posts, same as `limit`'s default.)

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit` — no errors.

Run: `pnpm build` — no errors (this also runs ESLint; fix any lint findings
from the new `or`/`lt` usage before proceeding).

Manual: `pnpm dev`, load `/community` and `/community/<some-post-id>` —
both still render the post board exactly as before (this task changes the
DB layer only, no UI change yet).

- [ ] **Step 4: Commit**

```bash
git add lib/community/queries.ts app/community/page.tsx "app/community/[id]/page.tsx"
git commit -m "refactor(community): add keyset pagination to listCommunityPosts"
```

## Task 5: Community Route Handlers (reads)

**Files:**
- Create: `app/community/posts/route.ts`
- Create: `app/community/posts/[id]/route.ts`
- Create: `app/community/posts/[id]/comments/route.ts`
- Create: `app/community/posts/[id]/offers/route.ts`

**Interfaces:**
- Consumes: `listCommunityPosts` (Task 4), `getCommunityPostById`, `listCommentsForPost` (existing, `lib/community/queries.ts`), `listOffersForPost`, `hasUserOfferedToRead` (existing, `lib/community/reader-queries.ts`), `decodeCursor` (Task 3), `toPostItemDTO`/`toPostDetailDTO`/`toCommentDTO`/`toOfferDTO` (Task 3), `auth` from `@/auth`.
- Produces: `GET /community/posts?channel&status&cursor&limit` → `{ items: CommunityPostItemDTO[]; nextCursor: PostsCursor | null }`; `GET /community/posts/:id` → `CommunityPostDetailDTO | 404`; `GET /community/posts/:id/comments` → `CommentWithAuthorDTO[]`; `GET /community/posts/:id/offers` → `{ offers: ReaderOfferItemDTO[]; hasOffered: boolean }`. All 401 if unauthenticated. Consumed by Tasks 6–7's hooks.

`/community/posts` is a static segment that coexists with the existing
dynamic `app/community/[id]/page.tsx`, the same way `app/community/new/page.tsx`
already coexists with it today (static segments win over dynamic ones for an
exact-match path).

- [ ] **Step 1: List route**

`app/community/posts/route.ts`:

```ts
import { auth } from '@/auth'
import { listCommunityPosts } from '@/lib/community/queries'
import { decodeCursor } from '@/lib/community/pagination'
import { toPostItemDTO } from '@/lib/community/dto'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const channel = (searchParams.get('channel') as CommunityChannel) || undefined
  const status = (searchParams.get('status') as ReaderStatus) || undefined
  const cursor = decodeCursor(searchParams.get('cursor'))
  const limit = Number(searchParams.get('limit')) || 20

  const { items, nextCursor } = await listCommunityPosts({ channel, status, cursor, limit })
  return Response.json({ items: items.map(toPostItemDTO), nextCursor })
}
```

- [ ] **Step 2: Single post route**

`app/community/posts/[id]/route.ts`:

```ts
import { auth } from '@/auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { toPostDetailDTO } from '@/lib/community/dto'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await getCommunityPostById(id)
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(toPostDetailDTO(post))
}
```

- [ ] **Step 3: Comments route**

`app/community/posts/[id]/comments/route.ts`:

```ts
import { auth } from '@/auth'
import { listCommentsForPost } from '@/lib/community/queries'
import { toCommentDTO } from '@/lib/community/dto'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const comments = await listCommentsForPost(id)
  return Response.json(comments.map(toCommentDTO))
}
```

- [ ] **Step 4: Offers route**

`app/community/posts/[id]/offers/route.ts`:

```ts
import { auth } from '@/auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { listOffersForPost, hasUserOfferedToRead } from '@/lib/community/reader-queries'
import { toOfferDTO } from '@/lib/community/dto'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await getCommunityPostById(id)
  if (!post || post.channel !== 'reader_sos') {
    return Response.json({ offers: [], hasOffered: false })
  }

  const isAdmin = (session.user as { role?: string }).role === 'admin'
  const isPostAuthorOrAdmin = post.authorId === session.user.id || isAdmin

  const [offers, hasOffered] = await Promise.all([
    isPostAuthorOrAdmin ? listOffersForPost(id) : Promise.resolve([]),
    !isPostAuthorOrAdmin ? hasUserOfferedToRead(id, session.user.id) : Promise.resolve(false),
  ])

  return Response.json({ offers: offers.map(toOfferDTO), hasOffered })
}
```

- [ ] **Step 5: Verify**

Run: `pnpm exec tsc --noEmit` — no errors.

Manual: `pnpm dev`, sign in as a member in the browser, then navigate
directly to each URL and confirm JSON comes back (not an auth redirect,
since these are Route Handlers, not pages):
- `http://localhost:3500/community/posts?limit=5`
- `http://localhost:3500/community/posts/<a-real-post-id>`
- `http://localhost:3500/community/posts/<a-real-post-id>/comments`
- `http://localhost:3500/community/posts/<a-real-post-id>/offers`

Then open a private/incognito window (no session) and hit the same URLs —
each should return `{"error":"Unauthorized"}` with a 401.

- [ ] **Step 6: Commit**

```bash
git add app/community/posts
git commit -m "feat(community): add Route Handlers for posts, comments, and offers"
```

## Task 6: Infinite Query feed

**Files:**
- Create: `hooks/community/use-community-posts.ts`
- Create: `components/community/community-feed.tsx`
- Modify: `components/community/post-card.tsx`
- Modify: `components/community/community-shell.tsx`
- Modify: `app/community/page.tsx`
- Modify: `app/community/[id]/page.tsx`

**Interfaces:**
- Consumes: `communityKeys.postsList` (Task 3), `CommunityPostItemDTO` (Task 3), the `/community/posts` Route Handler (Task 5).
- Produces: `useCommunityPosts(channel?, status?)` → `UseInfiniteQueryResult<InfiniteData<PostsPage>>`; `CommunityFeed` component (props: `channel?`, `status?`, `activeChannelId: string`). Consumed by Task 8's `useCreatePost`/`useDeletePost` (same `PostsPage` shape) and by `CommunityShell`'s new `feed` view variant.

- [ ] **Step 1: The infinite query hook**

`hooks/community/use-community-posts.ts`:

```ts
'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { communityKeys } from '@/lib/community/query-keys'
import { encodeCursor, type PostsCursor } from '@/lib/community/pagination'
import type { CommunityPostItemDTO } from '@/lib/community/dto'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export interface PostsPage {
  // isOptimistic is never present in a server response -- only Task 8's
  // useCreatePost writes it, into this same cache entry, before settle.
  items: (CommunityPostItemDTO & { isOptimistic?: boolean })[]
  nextCursor: PostsCursor | null
}

async function fetchPostsPage(
  channel: CommunityChannel | undefined,
  status: ReaderStatus | undefined,
  cursor: PostsCursor | null
): Promise<PostsPage> {
  const params = new URLSearchParams()
  if (channel) params.set('channel', channel)
  if (status) params.set('status', status)
  if (cursor) params.set('cursor', encodeCursor(cursor))

  const res = await fetch(`/community/posts?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to load posts')
  return res.json()
}

export function useCommunityPosts(channel?: CommunityChannel, status?: ReaderStatus) {
  return useInfiniteQuery({
    queryKey: communityKeys.postsList(channel, status),
    queryFn: ({ pageParam }) => fetchPostsPage(channel, status, pageParam),
    initialPageParam: null as PostsCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
```

- [ ] **Step 2: Retype `PostCard` for the DTO shape**

`components/community/post-card.tsx` — the component already defensively
wraps every date field in `new Date(...)`, so only the types change:

```diff
-import type { CommunityPostItem } from '@/lib/community/types'
+import type { CommunityPostItemDTO } from '@/lib/community/dto'

-function formatRelativeTime(date: Date): string {
+function formatRelativeTime(date: string): string {
```

```diff
 export function PostCard({
   post,
   activeChannelId,
 }: {
-  post: CommunityPostItem
+  post: CommunityPostItemDTO & { isOptimistic?: boolean }
   activeChannelId?: string
 }) {
```

And, right after the existing `isReaderSOS`/`isCallboard` consts, dim the
card while its optimistic placeholder hasn't settled yet (resolves the
"posting…" affordance from the spec's open question #2):

```diff
   return (
     <Link
       href={detailHref}
-      className="group relative block rounded-xl border border-ink-foreground/16 bg-ink-card p-5 transition-all hover:border-ink-foreground/35 focus:outline-hidden"
+      className={`group relative block rounded-xl border border-ink-foreground/16 bg-ink-card p-5 transition-all hover:border-ink-foreground/35 focus:outline-hidden ${
+        post.isOptimistic ? 'pointer-events-none opacity-60' : ''
+      }`}
     >
```

- [ ] **Step 3: The feed component**

`components/community/community-feed.tsx`:

```tsx
'use client'

import { useCommunityPosts } from '@/hooks/community/use-community-posts'
import { PostCard } from './post-card'
import { PostFormDialog } from './post-form-dialog'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export function CommunityFeed({
  channel,
  status,
  activeChannelId,
}: {
  channel?: CommunityChannel
  status?: ReaderStatus
  activeChannelId: string
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending, isError } =
    useCommunityPosts(channel, status)

  if (isPending) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-ink-foreground/16 bg-ink-card/60" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-red-300">Couldn't load the board. Try refreshing.</p>
  }

  const posts = data.pages.flatMap((page) => page.items)

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-foreground/5 text-lg text-ink-foreground/60">
          🎭
        </div>
        <h3 className="text-base font-semibold text-ink-foreground">No posts in this channel yet</h3>
        <p className="mt-1 text-xs text-ink-foreground/55 max-w-sm mx-auto">
          Be the first to post a line-reading request, audition notice, or craft question.
        </p>
        <div className="mt-5">
          <PostFormDialog
            triggerLabel="Create a Post"
            triggerClassName="inline-flex items-center gap-1.5 rounded-xl border border-ink-foreground/20 px-3.5 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-foreground/5 transition-colors cursor-pointer"
            initialChannel={channel}
            feedChannel={channel}
            feedStatus={status}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} activeChannelId={activeChannelId} />
      ))}
      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full rounded-xl border border-ink-foreground/16 py-2.5 text-sm font-medium text-ink-foreground/70 hover:text-ink-foreground disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading more...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
```

(This inlines the same empty-state markup `CommunityShell` has today,
including its own "Create a Post" `PostFormDialog` trigger — Step 5 below
removes that markup from `CommunityShell` so it isn't duplicated. Task 8
adds the `feedChannel`/`feedStatus` props to `PostFormDialog` itself; until
then, pass them here as a forward reference — `tsc` will flag it as an
unknown prop if Task 8 hasn't landed, which is expected since these tasks
are meant to run in order.)

- [ ] **Step 4: Update `CommunityShell`'s view union**

`components/community/community-shell.tsx` — replace the `posts` view kind
with `feed`, and delete the now-duplicated empty-state/list-rendering JSX:

```diff
-import { ChannelTabs } from './channel-tabs'
-import { PostCard } from './post-card'
-import { PostFormDialog } from './post-form-dialog'
+import { ChannelTabs } from './channel-tabs'
+import { CommunityFeed } from './community-feed'
+import { PostFormDialog } from './post-form-dialog'
 import { TapeCard } from './tape-room/tape-card'
 import { TapeFormDialog } from './tape-room/tape-form-dialog'
-import type { CommunityChannel, CommunityPostItem, ReaderStatus } from '@/lib/community/types'
+import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'
 import type { TapeItem } from '@/lib/community/tape-types'

 type CommunityView =
-  | { kind: 'posts'; posts: CommunityPostItem[] }
+  | { kind: 'feed' }
   | { kind: 'tapes'; tapes: TapeItem[] }
```

```diff
         <div className="shrink-0">
-          {view.kind === 'posts' ? (
-            <PostFormDialog initialChannel={activeChannel} />
+          {view.kind === 'feed' ? (
+            <PostFormDialog initialChannel={activeChannel} feedChannel={activeChannel} feedStatus={activeStatus ?? undefined} />
           ) : (
             <TapeFormDialog />
           )}
         </div>
```

```diff
       <div className="mt-8 space-y-4">
-        {view.kind === 'posts' ? (
-          view.posts.length === 0 ? (
-            <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
-              ... (existing empty-state JSX, deleted) ...
-            </div>
-          ) : (
-            view.posts.map((post) => (
-              <PostCard key={post.id} post={post} activeChannelId={activeChannelId} />
-            ))
-          )
-        ) : view.tapes.length === 0 ? (
+        {view.kind === 'feed' ? (
+          <CommunityFeed channel={activeChannel} status={activeStatus ?? undefined} activeChannelId={activeChannelId} />
+        ) : view.tapes.length === 0 ? (
           <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
             ... (unchanged tape empty state) ...
```

(The tape-room branch is untouched — out of scope per the spec.)

- [ ] **Step 5: Prefetch + hydrate in `app/community/page.tsx`**

Full replacement:

```tsx
import { redirect } from 'next/navigation'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { auth } from '@/auth'
import { listCommunityPosts } from '@/lib/community/queries'
import { listTapes } from '@/lib/community/tape-queries'
import { toPostItemDTO } from '@/lib/community/dto'
import { communityKeys } from '@/lib/community/query-keys'
import { CommunityShell } from '@/components/community/community-shell'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/community')
  }

  const params = await searchParams
  const rawChannel = params.channel
  const status = params.status as ReaderStatus | undefined

  if (rawChannel === 'tape_room') {
    const tapes = await listTapes()
    return (
      <main className="flex-1">
        <CommunityShell view={{ kind: 'tapes', tapes }} activeChannelId={rawChannel} />
      </main>
    )
  }

  const channel = rawChannel as CommunityChannel | undefined
  const activeChannel = channel && channel !== ('all' as unknown) ? channel : undefined

  const queryClient = new QueryClient()
  await queryClient.prefetchInfiniteQuery({
    queryKey: communityKeys.postsList(activeChannel, status),
    queryFn: async () => {
      const { items, nextCursor } = await listCommunityPosts({ channel: activeChannel, status, limit: 20 })
      return { items: items.map(toPostItemDTO), nextCursor }
    },
    initialPageParam: null,
  })

  return (
    <main className="flex-1">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CommunityShell
          view={{ kind: 'feed' }}
          activeChannel={activeChannel}
          activeChannelId={rawChannel ?? 'all'}
          activeStatus={status ?? null}
        />
      </HydrationBoundary>
    </main>
  )
}
```

- [ ] **Step 6: Prefetch the background board in `app/community/[id]/page.tsx`**

Change only the `boardPosts` line and the `CommunityShell` render (the
`PostDetailModal` rendering here is rewritten in Task 7 — leave it as-is for
now, this step only fixes the board behind the modal):

```diff
-import { getCommunityPostById, listCommentsForPost, listCommunityPosts } from '@/lib/community/queries'
+import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
+import { getCommunityPostById, listCommentsForPost, listCommunityPosts } from '@/lib/community/queries'
+import { toPostItemDTO } from '@/lib/community/dto'
+import { communityKeys } from '@/lib/community/query-keys'
```

```diff
-  const [post, comments, boardPosts] = await Promise.all([
+  const [post, comments] = await Promise.all([
     getCommunityPostById(id),
     listCommentsForPost(id),
-    listCommunityPosts({}).then((r) => r.items),
   ])

   if (!post) {
     notFound()
   }
+
+  const queryClient = new QueryClient()
+  await queryClient.prefetchInfiniteQuery({
+    queryKey: communityKeys.postsList(undefined, undefined),
+    queryFn: async () => {
+      const { items, nextCursor } = await listCommunityPosts({ limit: 20 })
+      return { items: items.map(toPostItemDTO), nextCursor }
+    },
+    initialPageParam: null,
+  })
```

```diff
   return (
     <main className="flex-1 relative">
-      {/* Underlying Community Board */}
-      <CommunityShell view={{ kind: 'posts', posts: boardPosts }} />
+      <HydrationBoundary state={dehydrate(queryClient)}>
+        {/* Underlying Community Board -- same unfiltered query key as
+            /community's default view, so cache is shared between routes. */}
+        <CommunityShell view={{ kind: 'feed' }} />

-      {/* Floating Post Detail Modal */}
-      <PostDetailModal
-        post={post}
-        comments={comments}
-        currentUserId={session.user.id}
-        isAdmin={isAdmin}
-        offers={offers}
-        hasOffered={hasOffered}
-      />
+        {/* Floating Post Detail Modal -- rewired to PostDetailContainer in Task 7 */}
+        <PostDetailModal
+          post={post}
+          comments={comments}
+          currentUserId={session.user.id}
+          isAdmin={isAdmin}
+          offers={offers}
+          hasOffered={hasOffered}
+        />
+      </HydrationBoundary>
     </main>
   )
```

This is what Task 6 leaves in place; Step 3 below replaces the
`offers`/`hasOffered`/`comments` sourcing and the `PostDetailModal` call —
the `CommunityShell`/`HydrationBoundary` wrapper from this diff stays.

- [ ] **Step 7: Verify**

Run: `pnpm exec tsc --noEmit` — expect it to fail on `PostFormDialog`'s new
`feedChannel`/`feedStatus` props until Task 8 adds them. That's fine — note
it and continue; Step 4's own file (`community-shell.tsx`) and this task's
other files should have no *other* errors. If you'd rather keep every task
fully green in isolation, do Task 8's `PostFormDialog` prop change
(interface only, not the mutation itself) here instead — either ordering is
fine as long as the final state after Task 8 matches this plan.

Run: `pnpm build` once Task 8 lands, to confirm the whole chain compiles.

Manual (after Task 8's `PostFormDialog` change, or with the props
temporarily stubbed as accepted-but-unused): `pnpm dev`, load `/community` —
feed renders immediately (no spinner, hydrated from the server prefetch),
open Network tab, confirm no request fires for the first page (already
cached) but scrolling to "Load more" and clicking it fires
`GET /community/posts?...&cursor=...`.

- [ ] **Step 8: Commit**

```bash
git add hooks/community/use-community-posts.ts components/community/community-feed.tsx \
  components/community/post-card.tsx components/community/community-shell.tsx \
  app/community/page.tsx "app/community/[id]/page.tsx"
git commit -m "feat(community): infinite-query post feed with SSR hydration"
```

## Task 7: Parallel queries on the post-detail view

**Files:**
- Create: `hooks/community/use-post-detail.ts`
- Create: `components/community/post-detail-container.tsx`
- Modify: `app/community/[id]/page.tsx`

**Interfaces:**
- Consumes: `communityKeys.postDetail/comments/offers` (Task 3), the three Task 5 Route Handlers, `CommunityPostDetailDTO`/`CommentWithAuthorDTO`/`ReaderOfferItemDTO` (Task 3).
- Produces: `usePostDetail(postId)`, `usePostComments(postId)`, `usePostOffers(postId, enabled)` hooks; `PostDetailContainer` component (props: `postId: string`, `currentUserId: string`, `isAdmin: boolean`).

- [ ] **Step 1: The three hooks**

`hooks/community/use-post-detail.ts`:

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommunityPostDetailDTO, CommentWithAuthorDTO, ReaderOfferItemDTO } from '@/lib/community/dto'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${url}`)
  return res.json()
}

export function usePostDetail(postId: string) {
  return useQuery({
    queryKey: communityKeys.postDetail(postId),
    queryFn: () => fetchJson<CommunityPostDetailDTO>(`/community/posts/${postId}`),
  })
}

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: communityKeys.comments(postId),
    queryFn: () => fetchJson<CommentWithAuthorDTO[]>(`/community/posts/${postId}/comments`),
  })
}

export function usePostOffers(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: communityKeys.offers(postId),
    queryFn: () =>
      fetchJson<{ offers: ReaderOfferItemDTO[]; hasOffered: boolean }>(`/community/posts/${postId}/offers`),
    enabled,
  })
}
```

- [ ] **Step 2: The container**

`components/community/post-detail-container.tsx`:

```tsx
'use client'

import { usePostDetail, usePostComments, usePostOffers } from '@/hooks/community/use-post-detail'
import { PostDetailModal } from './post-detail-modal'

export function PostDetailContainer({
  postId,
  currentUserId,
  isAdmin,
}: {
  postId: string
  currentUserId: string
  isAdmin: boolean
}) {
  // Neither depends on the other's result -- both fire on the same tick.
  // This is real client-side parallelism: Route Handlers aren't subject to
  // Next's one-at-a-time Server Action dispatch queue (spec §2).
  const postQuery = usePostDetail(postId)
  const commentsQuery = usePostComments(postId)

  const post = postQuery.data
  // Dependent, not fake-parallel: offers are only relevant once we know the
  // post's channel, which we don't until postQuery resolves.
  const offersQuery = usePostOffers(postId, post?.channel === 'reader_sos')

  if (postQuery.isPending || commentsQuery.isPending) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        <div className="h-64 w-[min(42rem,95vw)] animate-pulse rounded-xl border border-ink-foreground/16 bg-ink-card" />
      </div>
    )
  }

  if (postQuery.isError || !post) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        <div className="rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-sm text-ink-foreground">
          Couldn't load this post.
        </div>
      </div>
    )
  }

  return (
    <PostDetailModal
      post={post}
      comments={commentsQuery.data ?? []}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      offers={offersQuery.data?.offers ?? []}
      hasOffered={offersQuery.data?.hasOffered ?? false}
    />
  )
}
```

Note: `PostDetailModal`'s prop types (`post`, `comments`, `offers`) are
still typed against `CommunityPostDetail`/`CommentWithAuthor`/`ReaderOfferItem`
(with `Date` fields) at this point — this task does not change
`post-detail-modal.tsx` itself, only what feeds it. Task 8 retypes it to the
DTO shapes at the same time it swaps in the mutation hooks (touching the
file once, not twice).

- [ ] **Step 3: Wire the container into the page**

`app/community/[id]/page.tsx` — replace the `getCommunityPostById`/
`listCommentsForPost`/offers fetching and the direct `PostDetailModal` call.
This builds on Task 6 Step 6's version of the file (which already added the
`QueryClient`/`dehydrate`/`HydrationBoundary` scaffolding for the background
board):

```diff
-import { getCommunityPostById, listCommunityPosts } from '@/lib/community/queries'
+import { getCommunityPostById, listCommentsForPost, listCommunityPosts } from '@/lib/community/queries'
+import { listOffersForPost, hasUserOfferedToRead } from '@/lib/community/reader-queries'
+import { toPostDetailDTO, toCommentDTO, toOfferDTO } from '@/lib/community/dto'
 import { CommunityShell } from '@/components/community/community-shell'
-import { PostDetailModal } from '@/components/community/post-detail-modal'
+import { PostDetailContainer } from '@/components/community/post-detail-container'
```

```diff
-  const [post, comments] = await Promise.all([
-    getCommunityPostById(id),
-    listCommentsForPost(id),
-  ])
+  const post = await getCommunityPostById(id)

   if (!post) {
     notFound()
   }

   const isAdmin = (session.user as { role?: string }).role === 'admin'
+  const isPostAuthorOrAdmin = post.authorId === session.user.id || isAdmin
+
+  const [comments, offers, hasOffered] = await Promise.all([
+    listCommentsForPost(id),
+    post.channel === 'reader_sos' && isPostAuthorOrAdmin ? listOffersForPost(id) : Promise.resolve([]),
+    post.channel === 'reader_sos' && !isPostAuthorOrAdmin
+      ? hasUserOfferedToRead(id, session.user.id)
+      : Promise.resolve(false),
+  ])

   const queryClient = new QueryClient()
   await queryClient.prefetchInfiniteQuery({
     queryKey: communityKeys.postsList(undefined, undefined),
     queryFn: async () => {
       const { items, nextCursor } = await listCommunityPosts({ limit: 20 })
       return { items: items.map(toPostItemDTO), nextCursor }
     },
     initialPageParam: null,
   })
+  queryClient.setQueryData(communityKeys.postDetail(id), toPostDetailDTO(post))
+  queryClient.setQueryData(communityKeys.comments(id), comments.map(toCommentDTO))
+  if (post.channel === 'reader_sos') {
+    queryClient.setQueryData(communityKeys.offers(id), { offers: offers.map(toOfferDTO), hasOffered })
+  }
```

```diff
       <HydrationBoundary state={dehydrate(queryClient)}>
         <CommunityShell view={{ kind: 'feed' }} />
-        <PostDetailModal
-          post={post}
-          comments={comments}
-          currentUserId={session.user.id}
-          isAdmin={isAdmin}
-          offers={offers}
-          hasOffered={hasOffered}
-        />
+        <PostDetailContainer postId={id} currentUserId={session.user.id} isAdmin={isAdmin} />
       </HydrationBoundary>
```

This keeps the page doing exactly the same DB reads it does today (still one
`Promise.all`), just seeding three separate cache entries via
`setQueryData` instead of passing props straight to `PostDetailModal` — the
client then owns refetching/mutating each independently.

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit` — no errors (once Task 8's `PostDetailModal`
retyping has also landed; see the note in Step 2).

Manual: `pnpm dev`, open a post detail. Network tab shows no requests on
first load (fully hydrated). Force a client-side refetch (React Query
devtools → click "Refetch" on the post/comments queries) and confirm
`GET /community/posts/:id` and `GET /community/posts/:id/comments` fire
together, not one after another. Open a non-`reader_sos` post and confirm no
offers request fires at all.

- [ ] **Step 5: Commit**

```bash
git add hooks/community/use-post-detail.ts components/community/post-detail-container.tsx \
  "app/community/[id]/page.tsx"
git commit -m "feat(community): parallel post-detail queries via PostDetailContainer"
```

## Task 8: Mutations with optimistic updates

**Files:**
- Create: `hooks/community/use-add-comment.ts`
- Create: `hooks/community/use-update-reader-status.ts`
- Create: `hooks/community/use-delete-post.ts`
- Create: `hooks/community/use-create-post.ts`
- Create: `hooks/community/use-reader-offers.ts`
- Modify: `components/community/comment-composer.tsx`
- Modify: `components/community/post-detail-modal.tsx`
- Modify: `components/community/delete-post-dialog.tsx`
- Modify: `components/community/post-form-dialog.tsx`

**Interfaces:**
- Consumes: `communityKeys` (Task 3), DTO types (Task 3), `PostsPage` (Task 6), existing `'use server'` functions from `app/community/actions.ts` and `app/community/rehearsal-actions.ts` (unchanged).
- Produces: `useAddComment(postId)`, `useUpdateReaderStatus(postId)`, `useDeletePost()`, `useCreatePost(channel?, status?)`, `useOfferToRead(postId)`, `useConfirmReader(postId)` — each a `useMutation` hook.

- [ ] **Step 1: Add comment**

`hooks/community/use-add-comment.ts`:

```ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { addCommunityComment } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommentWithAuthorDTO } from '@/lib/community/dto'

export function useAddComment(postId: string) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const queryKey = communityKeys.comments(postId)

  return useMutation({
    mutationFn: async (content: string) => {
      const result = await addCommunityComment(postId, content)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<CommentWithAuthorDTO[]>(queryKey)

      if (session?.user) {
        const optimistic: CommentWithAuthorDTO = {
          id: `optimistic-${Date.now()}`,
          postId,
          authorId: session.user.id,
          authorName: session.user.name ?? null,
          authorImage: session.user.image ?? null,
          authorRole: (session.user as { role?: string }).role ?? 'member',
          content,
          createdAt: new Date().toISOString(),
        }
        queryClient.setQueryData(queryKey, (old: CommentWithAuthorDTO[] = []) => [...old, optimistic])
      }
      return { previous }
    },
    onError: (_err, _content, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: communityKeys.posts() })
    },
  })
}
```

- [ ] **Step 2: Update `CommentComposer`**

`components/community/comment-composer.tsx` — full replacement:

```tsx
'use client'

import { useState } from 'react'
import { useAddComment } from '@/hooks/community/use-add-comment'

export function CommentComposer({ postId }: { postId: string }) {
  const [content, setContent] = useState('')
  const mutation = useAddComment(postId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    mutation.mutate(content, { onSuccess: () => setContent('') })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mutation.isError && (
        <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-2 text-xs text-red-200">
          {mutation.error.message}
        </div>
      )}

      <div>
        <label htmlFor="comment-input" className="sr-only">
          Write a response
        </label>
        <textarea
          id="comment-input"
          required
          rows={3}
          placeholder="Offer to read lines, ask a question, or reply..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-xl border border-ink-foreground/16 bg-ink p-3 text-xs leading-relaxed text-ink-foreground placeholder:text-ink-foreground/45 focus:border-ink-foreground/40 focus:outline-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending || !content.trim()}
          className="rounded-xl border border-blue-400/50 bg-blue-500/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-blue-500/65 disabled:opacity-50 transition-all cursor-pointer"
        >
          {mutation.isPending ? 'Posting...' : 'Reply'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Update reader status + confirm reader**

`hooks/community/use-update-reader-status.ts`:

```ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateReaderStatus } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommunityPostDetailDTO } from '@/lib/community/dto'
import type { ReaderStatus } from '@/lib/community/types'

export function useUpdateReaderStatus(postId: string) {
  const queryClient = useQueryClient()
  const detailKey = communityKeys.postDetail(postId)

  return useMutation({
    mutationFn: async (status: ReaderStatus) => {
      const result = await updateReaderStatus(postId, status)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<CommunityPostDetailDTO>(detailKey)
      if (previous) {
        queryClient.setQueryData(detailKey, {
          ...previous,
          readerStatus: status,
          matchedUserId: status === 'matched' ? previous.matchedUserId : null,
        })
      }
      return { previous }
    },
    onError: (_err, _status, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey })
      queryClient.invalidateQueries({ queryKey: communityKeys.posts() })
    },
  })
}
```

`hooks/community/use-reader-offers.ts`:

```ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { offerToRead, confirmReader } from '@/app/community/rehearsal-actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommunityPostDetailDTO } from '@/lib/community/dto'

export function useOfferToRead(postId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const result = await offerToRead(postId)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityKeys.offers(postId) }),
  })
}

export function useConfirmReader(postId: string) {
  const queryClient = useQueryClient()
  const detailKey = communityKeys.postDetail(postId)

  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await confirmReader(postId, userId)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<CommunityPostDetailDTO>(detailKey)
      if (previous) {
        queryClient.setQueryData(detailKey, { ...previous, matchedUserId: userId, readerStatus: 'matched' as const })
      }
      return { previous }
    },
    onError: (_err, _userId, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey })
      queryClient.invalidateQueries({ queryKey: communityKeys.offers(postId) })
      queryClient.invalidateQueries({ queryKey: communityKeys.posts() })
    },
  })
}
```

- [ ] **Step 4: Retype and rewire `PostDetailModal`**

`components/community/post-detail-modal.tsx` — targeted changes only (the
JSX structure is unchanged):

```diff
-import { updateReaderStatus } from '@/app/community/actions'
-import { offerToRead, confirmReader } from '@/app/community/rehearsal-actions'
+import { useUpdateReaderStatus } from '@/hooks/community/use-update-reader-status'
+import { useOfferToRead, useConfirmReader } from '@/hooks/community/use-reader-offers'
 import { DeletePostDialog } from './delete-post-dialog'
 import { CommentComposer } from './comment-composer'
 import { MarkdownContent } from './markdown-content'
 import { RehearsalRoom } from './rehearsal-room'
 import { SidesViewer } from './sides-viewer'
-import type { CommunityPostDetail, CommentWithAuthor, ReaderStatus, ReaderOfferItem } from '@/lib/community/types'
+import type { CommunityPostDetailDTO, CommentWithAuthorDTO, ReaderOfferItemDTO } from '@/lib/community/dto'
+import type { ReaderStatus } from '@/lib/community/types'
```

```diff
 export function PostDetailModal({
   post,
   comments,
   currentUserId,
   isAdmin,
   offers,
   hasOffered,
 }: {
-  post: CommunityPostDetail
-  comments: CommentWithAuthor[]
+  post: CommunityPostDetailDTO
+  comments: CommentWithAuthorDTO[]
   currentUserId: string
   isAdmin: boolean
-  offers: ReaderOfferItem[]
+  offers: ReaderOfferItemDTO[]
   hasOffered: boolean
 }) {
   const router = useRouter()
   const searchParams = useSearchParams()
-  const [isPending, startTransition] = useTransition()
-  const [isOfferPending, startOfferTransition] = useTransition()
+  const updateStatus = useUpdateReaderStatus(post.id)
+  const offerToReadMutation = useOfferToRead(post.id)
+  const confirmReaderMutation = useConfirmReader(post.id)
```

Also remove `useTransition` from the `react` import if nothing else in the
file uses it (check before deleting — `isInRoom`/`isFullscreen` use
`useState`, not `useTransition`, so it should be safe to drop).

```diff
-  const handleStatusChange = (status: ReaderStatus) => {
-    startTransition(async () => {
-      await updateReaderStatus(post.id, status)
-      router.refresh()
-    })
-  }
+  const handleStatusChange = (status: ReaderStatus) => {
+    updateStatus.mutate(status)
+  }
```

Every `disabled={isPending}` on the reader-status buttons becomes
`disabled={updateStatus.isPending}`.

The "I can read this" button:

```diff
-                    disabled={isOfferPending}
-                    onClick={() =>
-                      startOfferTransition(async () => {
-                        await offerToRead(post.id)
-                        router.refresh()
-                      })
-                    }
+                    disabled={offerToReadMutation.isPending}
+                    onClick={() => offerToReadMutation.mutate()}
```

The "Confirm as reader" button:

```diff
-                        disabled={isPending}
-                        onClick={() =>
-                          startTransition(async () => {
-                            await confirmReader(post.id, offer.userId)
-                            router.refresh()
-                          })
-                        }
+                        disabled={confirmReaderMutation.isPending}
+                        onClick={() => confirmReaderMutation.mutate(offer.userId)}
```

- [ ] **Step 5: Delete post**

`hooks/community/use-delete-post.ts`:

```ts
'use client'

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { deleteCommunityPost } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { PostsPage } from './use-community-posts'

export function useDeletePost() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await deleteCommunityPost(postId)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: communityKeys.posts() })
      const previousQueries = queryClient.getQueriesData<InfiniteData<PostsPage>>({
        queryKey: communityKeys.posts(),
      })

      queryClient.setQueriesData<InfiniteData<PostsPage>>({ queryKey: communityKeys.posts() }, (old) =>
        old && {
          ...old,
          pages: old.pages.map((page) => ({ ...page, items: page.items.filter((p) => p.id !== postId) })),
        }
      )
      return { previousQueries }
    },
    onError: (_err, _postId, context) => {
      context?.previousQueries.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSuccess: () => router.push('/community'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityKeys.posts() }),
  })
}
```

`components/community/delete-post-dialog.tsx` — full replacement:

```tsx
'use client'

import { useRef } from 'react'
import { useDeletePost } from '@/hooks/community/use-delete-post'

export function DeletePostDialog({ postId }: { postId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const mutation = useDeletePost()

  const handleDelete = () => {
    mutation.mutate(postId, { onSuccess: () => dialogRef.current?.close() })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
      >
        Delete Post
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto w-full max-w-sm border-0 bg-transparent p-4 backdrop:bg-black/60 [color-scheme:dark]"
      >
        <div className="w-full rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl">
          <p className="text-lg font-semibold text-ink-foreground">Delete post</p>
          <p className="mt-1 text-sm text-ink-foreground/60">
            Are you sure you want to delete this post? This action cannot be undone.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={handleDelete}
              className="rounded-xl bg-red-800 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {mutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
```

- [ ] **Step 6: Create post**

`hooks/community/use-create-post.ts`:

```ts
'use client'

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { createCommunityPost } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { PostsPage } from './use-community-posts'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export function useCreatePost(channel: CommunityChannel | undefined, status: ReaderStatus | undefined) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const queryKey = communityKeys.postsList(channel, status)

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createCommunityPost(formData)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<InfiniteData<PostsPage>>(queryKey)

      if (session?.user && previous) {
        const optimistic: PostsPage['items'][number] = {
          id: `optimistic-${Date.now()}`,
          channel: (formData.get('channel') as CommunityChannel) ?? 'general',
          title: String(formData.get('title') ?? ''),
          content: String(formData.get('content') ?? ''),
          authorId: session.user.id,
          authorName: session.user.name ?? null,
          authorImage: session.user.image ?? null,
          authorRole: (session.user as { role?: string }).role ?? 'member',
          readerStatus: null,
          matchedUserId: null,
          matchedUserName: null,
          rehearsalAt: null,
          rehearsalFormat: null,
          sceneDetails: null,
          castingType: null,
          deadlineAt: null,
          isPinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          commentsCount: 0,
          isOptimistic: true,
        }
        queryClient.setQueryData<InfiniteData<PostsPage>>(queryKey, {
          ...previous,
          pages: [
            { ...previous.pages[0], items: [optimistic, ...previous.pages[0].items] },
            ...previous.pages.slice(1),
          ],
        })
      }
      return { previous }
    },
    onError: (_err, _formData, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityKeys.posts() }),
  })
}
```

`components/community/post-form-dialog.tsx` — add the two new props and
swap the submit handler onto the mutation (structure/JSX otherwise
unchanged):

```diff
 import { forwardRef, useImperativeHandle, useRef, useState, useTransition } from 'react'
 import { useRouter } from 'next/navigation'
-import { createCommunityPost } from '@/app/community/actions'
+import { useCreatePost } from '@/hooks/community/use-create-post'
 import type { CommunityChannel, CastingType, RehearsalFormat } from '@/lib/community/types'
+import type { ReaderStatus } from '@/lib/community/types'

 export type DialogHandle = { open: () => void }

 interface PostFormDialogProps {
   hideTrigger?: boolean
   triggerLabel?: string
   triggerClassName?: string
   initialChannel?: CommunityChannel
+  feedChannel?: CommunityChannel
+  feedStatus?: ReaderStatus
 }

 export const PostFormDialog = forwardRef<DialogHandle, PostFormDialogProps>(function PostFormDialog(
-  { hideTrigger = false, triggerLabel = '+ New Post', triggerClassName, initialChannel = 'reader_sos' },
+  { hideTrigger = false, triggerLabel = '+ New Post', triggerClassName, initialChannel = 'reader_sos', feedChannel, feedStatus },
   ref
 ) {
   const router = useRouter()
   const dialogRef = useRef<HTMLDialogElement>(null)
-  const [isPending, startTransition] = useTransition()
   const [error, setError] = useState<string | null>(null)
+  const mutation = useCreatePost(feedChannel, feedStatus)
```

```diff
     for (const file of files) {
       formData.append('attachments', file)
     }

-    startTransition(async () => {
-      const res = await createCommunityPost(formData)
-      if (res?.error) {
-        setError(res.error)
-      } else {
-        dialogRef.current?.close()
-        if (res?.postId) {
-          router.push(`/community/${res.postId}`)
-        } else {
-          router.refresh()
-        }
-      }
-    })
+    mutation.mutate(formData, {
+      onError: (err) => setError(err.message),
+      onSuccess: (res) => {
+        dialogRef.current?.close()
+        if (res?.postId) router.push(`/community/${res.postId}`)
+      },
+    })
   }
```

Every remaining `isPending` reference in the JSX (the submit button's
`disabled`/label) becomes `mutation.isPending`. `useTransition` import can
be dropped once nothing else in the file uses it.

- [ ] **Step 7: Verify**

Run: `pnpm exec tsc --noEmit` — no errors across the whole Community area.

Run: `pnpm build` — full check, including lint.

Manual, per spec §17's Community checklist:
- Post a comment — appears instantly; temporarily throw inside
  `addCommunityComment` (comment it back out after testing) to confirm the
  optimistic comment rolls back and the error banner shows.
- Change a reader-sos post's status — updates instantly in the modal.
- Delete a post — disappears from the feed immediately and redirects to
  `/community`.
- Create a post — appears at the top of the feed immediately, dimmed until
  the server responds, then resolves to the real card (or navigates to the
  new post's detail page, per existing behavior).
- Offer to read / confirm a reader — buttons disable while pending, offers
  list updates after the request settles.

- [ ] **Step 8: Commit**

```bash
git add hooks/community/use-add-comment.ts hooks/community/use-update-reader-status.ts \
  hooks/community/use-delete-post.ts hooks/community/use-create-post.ts \
  hooks/community/use-reader-offers.ts components/community/comment-composer.tsx \
  components/community/post-detail-modal.tsx components/community/delete-post-dialog.tsx \
  components/community/post-form-dialog.tsx
git commit -m "feat(community): optimistic mutations for comments, status, delete, and create"
```

## Task 9: Final verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: succeeds with no type or lint errors.

- [ ] **Step 2: Full manual smoke test**

`pnpm dev`, walk through every item in spec §17's Community and Workshops
checklists (the go-live poll from Task 2 is the only Workshops item in this
plan's scope):
- Feed loads instantly, paginates via "Load more".
- Post detail: Network tab confirms post+comments fire together; offers
  only for `reader_sos` and only after the post resolves.
- All five mutations (comment, status, delete, create, offer/confirm) behave
  as in Task 8's checklist, including the forced-error rollback check.
- Go-live indicator still flips within ~8s.
- Tape Room (`?channel=tape_room`) still renders unchanged — confirms the
  out-of-scope branch wasn't disturbed.

- [ ] **Step 3: Confirm no debug artifacts left behind**

`git status` — confirm nothing untracked was staged (this repo's working
tree has pre-existing untracked files — `coral-scripts.zip`,
`glumacki-client_secre-apps.googleusercontent.com`, `new-env.txt`,
`workshops/` — that belong to the user, not this feature; make sure none of
Task 8's temporary debug `throw`s remain uncommented in `app/community/actions.ts`.

- [ ] **Step 4: Update the spec status**

In `docs/react-query/design.md`, change the `Status:` line at the top from
`draft, awaiting review` to `Foundation + Community implemented; Workshops/Admin/Scripts pending`.

```bash
git add docs/react-query/design.md
git commit -m "docs(react-query): mark Foundation + Community as implemented"
```
