# React Query across Coral Studio

Status: Foundation + Community implemented; Workshops/Admin/Scripts pending.

## 1. Goal & scope

Bring [TanStack Query](https://tanstack.com/query/latest) in as the client-side
data layer for **every interactive feature area of the app**, not just one
page — replacing each area's hand-rolled `useTransition` + `router.refresh()`
bookkeeping with a proper cache. Four areas, each gets the full treatment
(queries + mutations wired through React Query), with the advanced features
(infinite scroll, optimistic updates, parallel queries) applied wherever the
data shape actually benefits from them rather than forced everywhere:

1. **Community** (`app/community/**`) — the flagship example: Infinite Query
   feed, parallel post-detail queries, optimistic comments/status/delete/create.
   Fully detailed in §7–§11.
2. **Workshops** (`app/workshops/**`) — sidebar list + selected detail is a
   second, distinct parallel-queries case; member-list mutations get optimistic
   removal. §13.
3. **Admin settings** (`app/admin/**`) — pending/registered user lists;
   approve/reject/delete are the cleanest possible "optimistic row removal"
   case in the app. §14.
4. **Scripts** (`app/scripts/**`) — smallest area: one list query, upload/delete
   mutations. §15.

Also converts the existing hand-rolled poll
(`components/workshops/go-live-button.tsx`) to `useQuery` with `refetchInterval`
(§12), as the simplest possible query example.

**Out of scope:** the Tape Room (`channel=tape_room`) and rehearsal
video/LiveKit wiring — these have their own real-time model (LiveKit's own
client, not HTTP polling) and don't benefit from a request/response cache.
Login/register/verify-email stay server-rendered forms — one-shot flows with
no list, cache, or repeat-fetch to speak of. Nothing here changes what a
signed-out user sees.

Sections §2–§6 are the shared foundation every area below builds on — read
those once, then each domain section (§7–§15) is a self-contained reference
for that area's hooks.

## 2. Decision: Route Handlers for reads, Server Actions for writes

This supersedes the earlier "call Server Actions directly for queries" plan.

`node_modules/next/dist/docs/01-app/02-guides/server-actions.md` (this repo
pins a Next.js version with behavior changes vs. training data — see
`AGENTS.md`) states plainly:

> Next.js dispatches Server Actions one at a time per client... do not rely on
> `Promise.all` to parallelize Server Actions from the client... use a Route
> Handler for non-mutation requests.

and the matching `client-side-data-fetching/tanstack-query.md` guide's own
worked example uses a `fetch('/api/products/...')` Route Handler as `queryFn`
and a Server Action only as `mutationFn`. So:

| | Mechanism | Why |
|---|---|---|
| Reads (`queryFn`) | New thin GET Route Handlers | Not subject to the serial action-dispatch queue → `usePostDetail` + `usePostComments` genuinely fire in parallel |
| Writes (`mutationFn`) | Existing `'use server'` functions in `app/community/actions.ts` / `rehearsal-actions.ts`, unchanged | Matches existing convention, DB access stays server-only, Next's serial dispatch is actually *fine* for writes (keeps them consistent) |

The Route Handlers are pure adapters — they call the same `lib/community/queries.ts`
/ `lib/community/reader-queries.ts` functions the Server Components already use.
No DB logic is duplicated.

## 3. Dependencies

```
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

## 4. Provider

`components/query-provider.tsx` (new), following the Next.js-recommended
pattern — one `QueryClient` per server render, one reused client in the
browser (this is *not* the same as the `useState`-per-component pattern
sketched earlier; the module-singleton form is what the pinned Next.js docs
recommend and avoids re-creating the client on every client-side navigation):

```tsx
'use client'

import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // this is a community board, not chat -- avoid refetch storms on focus
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

Wired into `app/layout.tsx`, sibling to the existing `AuthSessionProvider`:

```tsx
<AuthSessionProvider>
  <QueryProvider>{children}</QueryProvider>
</AuthSessionProvider>
```

## 5. Query keys

One key factory per domain, each colocated with that domain's `lib/` code —
single source of truth so mutations can invalidate precisely instead of
nuking unrelated caches.

`lib/community/query-keys.ts` (new):

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

`lib/workshops/query-keys.ts` (new):

```ts
export const workshopKeys = {
  all: ['workshops'] as const,
  list: () => [...workshopKeys.all, 'list'] as const,
  detail: (workshopId: string) => [...workshopKeys.all, 'detail', workshopId] as const,
  script: (slug: string) => [...workshopKeys.all, 'script', slug] as const,
  liveStatus: (workshopId: string) => [...workshopKeys.all, workshopId, 'live'] as const,
}
```

`lib/admin/query-keys.ts` (new):

```ts
export const adminKeys = {
  all: ['admin'] as const,
  pendingUsers: () => [...adminKeys.all, 'users', 'pending'] as const,
  registeredUsers: () => [...adminKeys.all, 'users', 'registered'] as const,
}
```

`lib/scripts/query-keys.ts` (new):

```ts
export const scriptKeys = {
  all: ['scripts'] as const,
  list: () => [...scriptKeys.all, 'list'] as const,
}
```

## 6. Serialization gotcha: Dates → strings everywhere

`CommunityPostItem` etc. carry real `Date` objects (Drizzle rows). RSC
`dehydrate()`/hydration can pass `Date` instances across the server→client
boundary fine, but the client's own `queryFn` gets its data from
`res.json()`, which has no `Date` type — those come back as ISO strings.
Mixing the two means the *same* cached entity has a `Date` on page 1
(prefetched) and a `string` on page 2+ (fetched client-side), which breaks
any component formatting `post.createdAt`.

Fix: define DTOs with string dates, and map to them in **both** the Route
Handler and the server-side prefetch call, so only one shape ever enters the
React Query cache. This rule applies to every domain below, not just
Community — each area gets its own small `dto.ts` next to its `queries.ts`
(`lib/workshops/dto.ts`, `lib/admin/dto.ts`; Scripts' `ScriptMeta` type has no
`Date` fields, so it skips this step entirely).

`lib/community/dto.ts` (new):

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

## 7. Pagination for the feed

`listCommunityPosts` currently takes `(channel?, status?)` and returns every
matching row — no cursor. Simplification for the keyset cursor: **pinned
posts are only included on the first page** (unfiltered load, no cursor).
They're rare (studio announcements) and always sort first, so folding them
into keyset math across pages isn't worth the complexity — YAGNI. Everything
after page 1 is a plain `(createdAt, id)` keyset over non-pinned posts.

`lib/community/pagination.ts` (new):

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

`lib/community/queries.ts` — `listCommunityPosts` signature change (both
existing call sites, `app/community/page.tsx` and `app/community/[id]/page.tsx`,
need updating to the new object param / `{ items, nextCursor }` return shape):

```ts
export async function listCommunityPosts(options: {
  channel?: CommunityChannel
  status?: ReaderStatus
  cursor?: PostsCursor | null
  limit?: number
}): Promise<{ items: CommunityPostItem[]; nextCursor: PostsCursor | null }> {
  const { channel, status, cursor, limit = 20 } = options
  const conditions = []
  if (channel) conditions.push(eq(communityPosts.channel, channel))
  if (status) conditions.push(eq(communityPosts.readerStatus, status))

  if (cursor) {
    // Paginated pages exclude pinned posts -- they were already shown on page 1.
    conditions.push(eq(communityPosts.isPinned, false))
    conditions.push(
      or(
        lt(communityPosts.createdAt, new Date(cursor.createdAt)),
        and(eq(communityPosts.createdAt, new Date(cursor.createdAt)), lt(communityPosts.id, cursor.id))
      )
    )
  }

  const query = db
    .select({ /* ...unchanged column list... */ })
    .from(communityPosts)
    .innerJoin(users, eq(communityPosts.authorId, users.id))
    .leftJoin(matchedUser, eq(communityPosts.matchedUserId, matchedUser.id))

  const rows = await (conditions.length > 0 ? query.where(and(...conditions)) : query)
    .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt), desc(communityPosts.id))
    .limit(limit + 1) // fetch one extra row to know if there's a next page

  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  // ...existing commentCountMap join logic, applied to pageRows...

  const last = pageRows[pageRows.length - 1]
  const nextCursor: PostsCursor | null =
    hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null

  return { items: /* existing row -> CommunityPostItem mapping, over pageRows */, nextCursor }
}
```

## 8. Route Handlers (reads)

All four are thin: auth check (same pattern as the existing
`app/workshops/[id]/live-status/route.ts`), call the existing query
function, map to a DTO, return JSON.

`app/community/posts/route.ts` (new) — list/feed:

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

`app/community/posts/[id]/route.ts` (new) — single post
(`/community/posts` as a static segment coexists with the existing dynamic
`/community/[id]` page the same way `/community/new` already does):

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

`app/community/posts/[id]/comments/route.ts` (new):

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

`app/community/posts/[id]/offers/route.ts` (new) — collapses the page's
current sequential `if (isReaderSOS && isPostAuthorOrAdmin) await ...` /
`if (isReaderSOS && !isPostAuthorOrAdmin) await ...` branches into one
endpoint that runs its two reads in parallel server-side (the sanctioned way
to get parallelism when the source is a Server Action / DB call, per the
Next.js docs quoted in §2):

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

## 9. Infinite Query — the post feed

`hooks/community/use-community-posts.ts` (new):

```ts
'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { communityKeys } from '@/lib/community/query-keys'
import { encodeCursor, type PostsCursor } from '@/lib/community/pagination'
import type { CommunityPostItemDTO } from '@/lib/community/dto'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

interface PostsPage {
  // isOptimistic is never present in server responses -- only §11's
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

`components/community/community-feed.tsx` (new client component, replaces the
`view.posts.map(...)` branch inside `CommunityShell`):

```tsx
'use client'

import { useCommunityPosts } from '@/hooks/community/use-community-posts'
import { PostCard } from './post-card'
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

  if (isPending) return <FeedSkeleton />
  if (isError) return <p className="text-sm text-red-300">Couldn't load the board. Try refreshing.</p>

  const posts = data.pages.flatMap((page) => page.items)
  if (posts.length === 0) return <EmptyBoardState channel={channel} />

  return (
    <>
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
    </>
  )
}
```

(`FeedSkeleton` / `EmptyBoardState` are extracted from `CommunityShell`'s
current empty-state JSX — no behavior change, just relocated so `CommunityFeed`
owns its own loading/empty states instead of `CommunityShell` branching on
`view.posts.length`.)

`app/community/page.tsx` — prefetch page 1, dehydrate, hand off to the client:

```tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { listCommunityPosts, listTapes } from '@/lib/community/queries'
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
  if (!session?.user?.id) redirect('/login?callbackUrl=/community')

  const params = await searchParams
  const rawChannel = params.channel

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
  const status = params.status as ReaderStatus | undefined

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
          view={{ kind: 'feed', channel: activeChannel, status: status ?? null }}
          activeChannel={activeChannel}
          activeChannelId={rawChannel ?? 'all'}
          activeStatus={status ?? null}
        />
      </HydrationBoundary>
    </main>
  )
}
```

`CommunityShell`'s `view` union gains a `{ kind: 'feed'; channel?; status }`
case that renders `<CommunityFeed .../>` instead of mapping `view.posts`
itself — `PostFormDialog`/`ChannelTabs`/empty-state chrome stay exactly
where they are.

## 10. Parallel queries — the post-detail view

`hooks/community/use-post-detail.ts` (new):

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
    queryFn: () => fetchJson<{ offers: ReaderOfferItemDTO[]; hasOffered: boolean }>(`/community/posts/${postId}/offers`),
    enabled,
  })
}
```

Usage in `PostDetailModal` (or a thin `PostDetailContainer` wrapper around
today's `PostDetailModal`):

```tsx
'use client'

export function PostDetailContainer({ postId }: { postId: string }) {
  // Neither depends on the other's result -- both fire on the same tick.
  // This is real client-side parallelism (see §2): Route Handlers aren't
  // subject to Next's one-at-a-time Server Action dispatch queue.
  const postQuery = usePostDetail(postId)
  const commentsQuery = usePostComments(postId)

  const post = postQuery.data
  // Offers are intentionally a *dependent* query, not a fake-parallel one:
  // whether they're even relevant depends on post.channel, which we don't
  // know until postQuery resolves. Firing it unconditionally would waste a
  // request on the ~75% of posts that aren't reader_sos.
  const offersQuery = usePostOffers(postId, post?.channel === 'reader_sos')

  if (postQuery.isPending || commentsQuery.isPending) return <PostDetailSkeleton />
  if (postQuery.isError || !post) return <PostNotFound />

  return (
    <PostDetailModal
      post={post}
      comments={commentsQuery.data ?? []}
      offers={offersQuery.data?.offers ?? []}
      hasOffered={offersQuery.data?.hasOffered ?? false}
    />
  )
}
```

`app/community/[id]/page.tsx` prefetches all three the same way §9 prefetches
the feed (one `QueryClient`, three `prefetchQuery` calls issued without
`await`-ing each other so the server-side reads themselves run concurrently,
then one `Promise.all`, then `dehydrate()` + `HydrationBoundary` wrapping
`<PostDetailContainer postId={id} />` and the background `<CommunityFeed />`).

## 11. Mutations with optimistic updates

Shared shape: `onMutate` snapshots + writes the optimistic value,
`onError` rolls back from the snapshot, `onSettled` invalidates so the
server's actual state always wins eventually. `mutationFn` throws on the
action's `{ error }` return shape so React Query's error path (and thus
`onError`) actually fires — the action functions themselves are unchanged.

**Add comment** (`hooks/community/use-add-comment.ts`, new) — the
textbook case, replacing `CommentComposer`'s manual `useTransition` +
`useState<error>`:

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
      queryClient.invalidateQueries({ queryKey: communityKeys.posts() }) // feed's commentsCount badge
    },
  })
}
```

`CommentComposer` shrinks to:

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
      {/* textarea unchanged, value={content} onChange={...} */}
      <button type="submit" disabled={mutation.isPending || !content.trim()}>
        {mutation.isPending ? 'Posting...' : 'Reply'}
      </button>
    </form>
  )
}
```

**Update reader status** (`hooks/community/use-update-reader-status.ts`, new):

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

**Delete post** (`hooks/community/use-delete-post.ts`, new) — optimistic
removal across every cached feed page at once via `setQueriesData`:

```ts
'use client'

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { deleteCommunityPost } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommunityPostItemDTO } from '@/lib/community/dto'
import type { PostsCursor } from '@/lib/community/pagination'

interface PostsPage {
  items: CommunityPostItemDTO[]
  nextCursor: PostsCursor | null
}

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

**Create post** (`hooks/community/use-create-post.ts`, new) — optimistic
prepend into the *first* page of the matching feed query. Unlike the other
mutations, the server assigns the real `id`/timestamps, so the optimistic
entry is a partial placeholder flagged `isOptimistic` for the card to render
a "posting…" state until `onSettled`'s invalidate swaps in the real row:

```ts
'use client'

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { createCommunityPost } from '@/app/community/actions'
import { communityKeys } from '@/lib/community/query-keys'
import type { CommunityPostItemDTO } from '@/lib/community/dto'
import type { PostsCursor } from '@/lib/community/pagination'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

interface PostsPage {
  items: (CommunityPostItemDTO & { isOptimistic?: boolean })[]
  nextCursor: PostsCursor | null
}

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
          pages: [{ ...previous.pages[0], items: [optimistic, ...previous.pages[0].items] }, ...previous.pages.slice(1)],
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

**Offer to read / confirm reader** (`hooks/community/use-reader-offers.ts`,
new) — simpler, deliberately *not* optimistic on the offers list itself: an
offer's validity depends on a server-side uniqueness/eligibility check
(`onConflictDoNothing`, "not your own post", "already seeking"), so faking it
client-side risks showing a state the server then rejects. `isPending`
disables the button to prevent double-submits instead:

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

## 12. Query example — workshop go-live polling

Kept from the original bounded proposal, unchanged in shape.
`hooks/workshops/use-live-status.ts` (new):

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { workshopKeys } from '@/lib/community/query-keys'

export function useLiveStatus(workshopId: string) {
  return useQuery({
    queryKey: workshopKeys.liveStatus(workshopId),
    queryFn: async () => {
      const res = await fetch(`/workshops/${workshopId}/live-status`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch live status')
      return (await res.json()) as { live: boolean }
    },
    refetchInterval: 8000,
    staleTime: 0, // needs to always poll fresh, unlike the community defaults
  })
}
```

`GoLiveButton` drops its `useState`/`useEffect`/`setInterval` block entirely
in favor of `const { data } = useLiveStatus(workshopId)`.

## 13. Workshops

Route Handlers (new), same thin-adapter shape as §8, nested as static
sub-paths under the dynamic segment exactly like the existing
`app/workshops/[id]/live-status/route.ts` already does:

- `app/workshops/list/route.ts` — GET, wraps `listWorkshopsForUser`. A static
  `list` segment coexisting with the dynamic `app/workshops/[id]`, same
  static-beats-dynamic precedent as `/community/posts` vs `/community/[id]`.
- `app/workshops/[id]/detail/route.ts` — GET, wraps `getWorkshopDetail`.
- `app/workshops/[id]/script/route.ts` — GET, wraps `getScript(scriptSlug)`.

`lib/workshops/dto.ts` (new) — only `rehearsalAt` needs the Date→string
treatment (`WorkshopListItem`, `WorkshopDetail`); `WorkshopMember` and
`AddableUser` have no date fields.

### Parallel + dependent queries

The workshop shell is a list-plus-detail layout (sidebar of workshops, one
selected workshop's panel) — a second real parallel-queries case, distinct
from Community's post+comments: the **list** and the **selected detail**
don't depend on each other and fire together; the **script** query is
dependent on `detail.scriptSlug` being known, same shape as Community's
offers query in §10.

`hooks/workshops/use-workshops.ts` (new):

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { workshopKeys } from '@/lib/workshops/query-keys'
import type { WorkshopListItemDTO, WorkshopDetailDTO } from '@/lib/workshops/dto'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${url}`)
  return res.json()
}

export function useWorkshopsList() {
  return useQuery({
    queryKey: workshopKeys.list(),
    queryFn: () => fetchJson<WorkshopListItemDTO[]>('/workshops/list'),
  })
}

export function useWorkshopDetail(workshopId: string) {
  return useQuery({
    queryKey: workshopKeys.detail(workshopId),
    queryFn: () => fetchJson<WorkshopDetailDTO>(`/workshops/${workshopId}/detail`),
  })
}

export function useWorkshopScript(workshopId: string, scriptSlug: string | null) {
  return useQuery({
    queryKey: workshopKeys.script(scriptSlug ?? 'none'),
    queryFn: () => fetchJson(`/workshops/${workshopId}/script`),
    enabled: Boolean(scriptSlug), // dependent: only meaningful once the detail query resolves a slug
  })
}
```

`WorkshopShell`'s data now comes from `useWorkshopsList()` + `useWorkshopDetail(selectedId)`
fired together in the container, instead of the current single server-side
`Promise.all([listWorkshopsForUser, getWorkshopDetail, ...])` in
`app/workshops/[id]/page.tsx` — that page still does the *first* fetch
server-side (unchanged) and dehydrates both queries for hydration.

### Optimistic mutation — remove member

Fully worked, since it introduces the "splice an item out of a nested array
inside one cached object" technique (distinct from Community's list-of-pages
or single-object patches):

`hooks/workshops/use-remove-member.ts` (new):

```ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { removeMember } from '@/app/workshops/actions'
import { workshopKeys } from '@/lib/workshops/query-keys'
import type { WorkshopDetailDTO } from '@/lib/workshops/dto'

export function useRemoveMember(workshopId: string) {
  const queryClient = useQueryClient()
  const detailKey = workshopKeys.detail(workshopId)

  return useMutation({
    // removeMember() throws on auth/not-found rather than returning
    // { error } -- every workshops/actions.ts function does, unlike
    // Community's { error } convention -- so no throw-adapter is needed here.
    mutationFn: (memberId: string) => removeMember(workshopId, memberId),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<WorkshopDetailDTO>(detailKey)
      if (previous) {
        queryClient.setQueryData(detailKey, {
          ...previous,
          members: previous.members.filter((m) => m.id !== memberId),
        })
      }
      return { previous }
    },
    onError: (_err, _memberId, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: detailKey }),
  })
}
```

### The rest of the mutations

Same `onMutate`/`onError`/`onSettled` shape as above or as §11, applied per
function. None return `{ error }`, so none need the throw-adapter:

| Hook | Wraps | Cache strategy |
|---|---|---|
| `useUpdateMember(workshopId)` | `updateMember(workshopId, memberId, formData)` | Optimistic: patch that member's `type`/`part` in the cached `members` array (same splice-and-replace shape as remove, but `map` instead of `filter`) |
| `useAddMember(workshopId)` | `addMember(workshopId, formData)` | Not optimistic — the new member's id/name only exist after the server's email lookup succeeds. Invalidate `detail` on settle |
| `useUpdateWorkshop(workshopId)` | `updateWorkshop(workshopId, formData)` | Not optimistic (script-slug validation happens server-side). Invalidate `detail` **and** `list` on settle — title shows in both |
| `useSetWorkshopScript(workshopId)` | `setWorkshopScript(workshopId, formData)` | Invalidate `detail` and the `script` query on settle |
| `useSetRehearsalDate(workshopId)` / `useCancelRehearsal(workshopId)` | `setRehearsalDate` / `cancelRehearsal` | Not optimistic — same rationale as Community's offer-to-read (§11): a best-effort Google Calendar side effect makes a client-side guess risky. Invalidate `detail` on settle |
| `useCreateWorkshop()` / `useLeaveWorkshop()` / `useDeleteWorkshop()` | `createWorkshop` / `leaveWorkshop` / `deleteWorkshop` | These call Next's `redirect()` *inside* the Server Action on success — the redirect signal propagates through the mutation call exactly as it does today through the existing `startTransition` call sites, so `mutate()` still triggers navigation. Don't rely on `onSuccess` running before that; just invalidate `workshopKeys.list()` in `onSettled` for the (rare) non-redirect error path |

## 14. Admin settings

Route Handler (new) — one endpoint, since the settings page always needs
both lists together and they're cheap, small queries (studio admin, not a
high-volume table):

`app/admin/users/list/route.ts` (new) — a static `list` segment, sibling to
the existing `app/admin/users/page.tsx` (which today just redirects to
`/admin/settings` and stops being needed once the client fetches this
directly):

```ts
import { asc, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'
import { toPendingUserDTO, toRegisteredUserDTO } from '@/lib/admin/dto'

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [pending, registered] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.status, 'pending_approval'))
      .orderBy(asc(users.createdAt)),
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.status, 'active'))
      .orderBy(asc(users.createdAt)),
  ])

  return Response.json({
    pending: pending.map(toPendingUserDTO),
    registered: registered.map(toRegisteredUserDTO),
  })
}
```

(This is the existing `Promise.all` from `app/admin/settings/page.tsx`,
moved verbatim into the handler; the page keeps doing this exact query for
its own first-paint prefetch too.)

`hooks/admin/use-admin-users.ts` (new):

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { adminKeys } from '@/lib/admin/query-keys'
import type { PendingUserDTO, RegisteredUserDTO } from '@/lib/admin/dto'

interface AdminUsers {
  pending: PendingUserDTO[]
  registered: RegisteredUserDTO[]
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.pendingUsers(), // one query key covers both -- see note below
    queryFn: async () => {
      const res = await fetch('/admin/users/list')
      if (!res.ok) throw new Error('Failed to load users')
      return res.json() as Promise<AdminUsers>
    },
  })
}
```

Note: `adminKeys.pendingUsers()`/`registeredUsers()` from §5 stay as two
separate keys for *invalidation* targeting (approving a user only needs to
invalidate the pending side, in principle), but since one request returns
both, `useAdminUsers()` itself only needs one query key to cache the combined
response under. Mutations below invalidate both keys' worth of data by
invalidating this single query.

### Optimistic mutation — approve/reject/delete a user

The cleanest optimistic case in the whole app: three mutations, all "remove
this row from whichever list it's in, instantly." One hook covers all three
since the optimistic patch is identical:

`hooks/admin/use-user-action.ts` (new):

```ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approveUser, rejectUser, deleteUser } from '@/app/admin/users/actions'
import { adminKeys } from '@/lib/admin/query-keys'

interface AdminUsers {
  pending: { id: string }[]
  registered: { id: string }[]
}

function useRemoveUserMutation(action: (userId: string) => Promise<void>) {
  const queryClient = useQueryClient()
  const queryKey = adminKeys.pendingUsers()

  return useMutation({
    mutationFn: action,
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<AdminUsers>(queryKey)
      if (previous) {
        queryClient.setQueryData(queryKey, {
          pending: previous.pending.filter((u) => u.id !== userId),
          registered: previous.registered.filter((u) => u.id !== userId),
        })
      }
      return { previous }
    },
    onError: (_err, _userId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}

export const useApproveUser = () => useRemoveUserMutation(approveUser)
export const useRejectUser = () => useRemoveUserMutation(rejectUser)
export const useDeleteUser = () => useRemoveUserMutation(deleteUser)
```

`useApproveAllPending()` is the same shape but clears the whole `pending`
array at once instead of filtering one id:

```ts
export function useApproveAllPending() {
  const queryClient = useQueryClient()
  const queryKey = adminKeys.pendingUsers()

  return useMutation({
    mutationFn: approveAllPending,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<AdminUsers>(queryKey)
      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          registered: [...previous.registered, ...previous.pending],
          pending: [],
        })
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
```

## 15. Scripts

Smallest area — one list (with content, since `listScriptsWithContent` already
batches it, per the existing comment in `app/scripts/[slug]/page.tsx` about
avoiding a double-fetch), two mutations, no Date fields to convert.

`app/scripts/list/route.ts` (new):

```ts
import { auth } from '@/auth'
import { listScriptsWithContent } from '@/lib/workshops/scripts'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || (session.user as { role?: string }).role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return Response.json(await listScriptsWithContent())
}
```

`hooks/scripts/use-scripts.ts` (new):

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { scriptKeys } from '@/lib/scripts/query-keys'
import type { ScriptWithContent } from '@/lib/workshops/scripts'

export function useScripts() {
  return useQuery({
    queryKey: scriptKeys.list(),
    queryFn: async () => {
      const res = await fetch('/scripts/list')
      if (!res.ok) throw new Error('Failed to load scripts')
      return res.json() as Promise<ScriptWithContent[]>
    },
  })
}
```

`hooks/scripts/use-script-mutations.ts` (new):

```ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadScript, removeScript } from '@/app/scripts/actions'
import { scriptKeys } from '@/lib/scripts/query-keys'
import type { ScriptWithContent } from '@/lib/workshops/scripts'

export function useUploadScript() {
  const queryClient = useQueryClient()
  return useMutation({
    // uploadScript returns { error } on failure (unlike workshops' throw
    // convention) -- same throw-adapter as Community's mutations in §11.
    mutationFn: async (formData: FormData) => {
      const result = await uploadScript(formData)
      if (result?.error) throw new Error(result.error)
    },
    // Not optimistic -- the uploaded file's parsed title/scene only exist
    // after the server reads it out of Blob storage.
    onSettled: () => queryClient.invalidateQueries({ queryKey: scriptKeys.list() }),
  })
}

export function useRemoveScript() {
  const queryClient = useQueryClient()
  const queryKey = scriptKeys.list()

  return useMutation({
    mutationFn: (slug: string) => removeScript(slug),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ScriptWithContent[]>(queryKey)
      if (previous) {
        queryClient.setQueryData(queryKey, previous.filter((s) => s.slug !== slug))
      }
      return { previous }
    },
    onError: (_err, _slug, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
```

## 16. File manifest

New — shared foundation:
- `components/query-provider.tsx`
- `package.json` — add `@tanstack/react-query`, `@tanstack/react-query-devtools`

New — Community:
- `lib/community/query-keys.ts`, `lib/community/dto.ts`, `lib/community/pagination.ts`
- `app/community/posts/route.ts`, `app/community/posts/[id]/route.ts`,
  `app/community/posts/[id]/comments/route.ts`, `app/community/posts/[id]/offers/route.ts`
- `hooks/community/use-community-posts.ts`, `use-post-detail.ts`, `use-add-comment.ts`,
  `use-update-reader-status.ts`, `use-delete-post.ts`, `use-create-post.ts`, `use-reader-offers.ts`
- `components/community/community-feed.tsx`, `components/community/post-detail-container.tsx`

New — Workshops:
- `lib/workshops/query-keys.ts`, `lib/workshops/dto.ts`
- `app/workshops/list/route.ts`, `app/workshops/[id]/detail/route.ts`, `app/workshops/[id]/script/route.ts`
- `hooks/workshops/use-workshops.ts`, `use-live-status.ts`, `use-remove-member.ts`,
  and one hook each for the remaining mutations in §13's table

New — Admin:
- `lib/admin/query-keys.ts`, `lib/admin/dto.ts`
- `app/admin/users/list/route.ts`
- `hooks/admin/use-admin-users.ts`, `use-user-action.ts`

New — Scripts:
- `lib/scripts/query-keys.ts`
- `app/scripts/list/route.ts`
- `hooks/scripts/use-scripts.ts`, `use-script-mutations.ts`

Changed:
- `app/layout.tsx` — add `QueryProvider`
- `lib/community/queries.ts` — `listCommunityPosts` gains cursor pagination
- `app/community/page.tsx`, `app/community/[id]/page.tsx` — prefetch + `HydrationBoundary`
- `components/community/community-shell.tsx` — `feed` view variant renders `<CommunityFeed>`
- `components/community/comment-composer.tsx`, `post-detail-modal.tsx` — use the new hooks
- `app/workshops/page.tsx`, `app/workshops/[id]/page.tsx` — prefetch + `HydrationBoundary`
- `components/workshops/workshop-shell.tsx` and its member-list/rehearsal sub-components — use the new hooks instead of props threaded from the server component
- `components/workshops/go-live-button.tsx` — use `useLiveStatus`
- `app/admin/settings/page.tsx` — prefetch + `HydrationBoundary`; `components/admin/users-view.tsx` — use the new hooks
- `app/admin/users/page.tsx` — deleted (its only job was redirecting to `/admin/settings`; no longer needed once nothing links to `/admin/users` for data)
- `app/scripts/page.tsx`, `app/scripts/[slug]/page.tsx` — prefetch + `HydrationBoundary`; `components/scripts/scripts-shell.tsx` — use the new hooks

Unchanged: every `'use server'` action file (`app/community/actions.ts`,
`app/community/rehearsal-actions.ts`, `app/workshops/actions.ts`,
`app/admin/users/actions.ts`, `app/scripts/actions.ts`) and every
`lib/**/queries.ts` — all business logic and auth checks stay exactly as-is;
only what calls them changes.

## 17. Testing

No test suite exists in this repo (per `CLAUDE.md`). Verification is manual
via `pnpm dev`, one pass per area:

**Community:**
- Feed loads with no spinner (SSR+hydrate working), "Load more" paginates,
  new posts from another tab appear after the 30s `staleTime` or a refetch.
- Posting a comment appears instantly (optimistic), survives a forced
  server error (temporarily throw in `addCommunityComment`) by rolling back
  and showing the error text.
- Post detail: Network tab shows the post and comments requests firing
  together, not sequentially; offers request only fires for `reader_sos` posts
  and only after the post request resolves.
- Deleting a post removes it from the feed immediately and redirects.

**Workshops:**
- Sidebar list and selected detail requests fire together in the Network tab.
- Removing a member disappears immediately; force an error to confirm rollback.
- Go-live indicator still flips within ~8s of another member joining.

**Admin:**
- Approving/rejecting/deleting a user removes the row instantly; the email
  side effect (`approveUser`'s `sendApprovedEmail`) still fires — check the
  configured email provider's logs, not just the UI.
- "Approve all pending" clears the whole pending list optimistically.

**Scripts:**
- Uploading a script shows it in the list only after the server responds
  (no optimistic entry); deleting one disappears instantly.

## 18. Open questions for review

1. `CommunityShell`'s empty/loading states move into `CommunityFeed` — fine to inline them there, or should they become shared components reused by the Tape Room list too (still out of scope for this pass)?
2. Optimistic post creation shows a placeholder card with no `id`-derived link until settle — acceptable, or should `PostCard` disable its own click-through while `isOptimistic` is true?
3. Devtools: gated on `NODE_ENV === 'development'` only, or also expose behind an admin-only flag in production for debugging live issues?
4. `app/admin/users/page.tsx` currently exists only to redirect to `/admin/settings` — the manifest above proposes deleting it once nothing needs it. Confirm nothing external links directly to `/admin/users`.
5. This is now four feature areas in one spec. Fine to implement as one sequential plan (foundation → Community → Workshops → Admin → Scripts), or would you rather each area land as its own PR/plan?
