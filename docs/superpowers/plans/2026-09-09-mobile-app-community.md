# Mobile App Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Community tab's placeholder with a real, read-heavy Community experience — a channel-filtered feed, post detail with comments (the one write flow), reader offers (read-only), and a tape room list + playback — reusing the foundation (`@coral-studio/types`, `@coral-studio/api-client`, mobile auth, tab shell) built in the Foundation + Workshops plan.

**Architecture:** Same additive-only approach as the foundation plan: `studio-web` gains only new `/api/mobile/*` route files (plus import-path-only relocations of pure Community/Tape types into `packages/types`), `packages/api-client` grows new typed methods, and `apps/mobile-app` gets a real `community/` route group replacing Task 6's placeholder from the previous plan.

**Tech Stack:** Same as the foundation plan, plus `react-native-markdown-display` (post content rendering) and `expo-video` (tape playback) on the mobile side.

**Spec:** `docs/superpowers/specs/2026-09-09-mobile-app-mvp-design.md`

**Depends on:** `docs/superpowers/plans/2026-09-09-mobile-app-foundation-workshops.md` must be implemented first — this plan builds directly on its `packages/types`, `packages/api-client`, `lib/mobile-auth.ts`, and the mobile app's tab shell/auth/query-client setup.

## Global Constraints

- Same as the foundation plan: no existing `studio-web` file's *behavior* changes — only import-path-only edits when relocating pure types/DTOs into `packages/types`. All new mobile capability is new, additive files under `apps/studio-web/app/api/mobile/*`.
- New routes use `getMobileUser` / `isAdminUser` from `lib/mobile-auth.ts` (already built) — never `auth()`.
- New routes return the same `{ error: string }` + status-code convention as everywhere else.
- No i18n on any new mobile route or screen — mobile v1 is English-only by deliberate simplification (the same choice already made for the mobile login route), even though the equivalent web routes use `getDictionary()`.
- Recording/uploading tapes and tape notes are explicitly out of scope — the tape room is playback-only.
- `npx expo install <pkg>` for native-touching mobile dependencies (`expo-video`), plain `pnpm add --filter mobile-app <pkg>` for pure-JS ones (`react-native-markdown-display`).
- Same testing approach as the foundation plan: no new test framework in `studio-web` (new routes verified via `curl`); new `packages/api-client` methods get `node:test` coverage; mobile screens verified manually via `pnpm --filter mobile-app web`.

---

### Task 1: Extend shared types — relocate Community & Tape types/DTOs

**Files:**
- Create: `packages/types/src/community.ts`
- Create: `packages/types/src/tapes.ts`
- Modify: `packages/types/src/index.ts` (add the two new barrel exports)
- Modify: `apps/studio-web/lib/community/types.ts` (becomes a re-export shim)
- Modify: `apps/studio-web/lib/community/dto.ts` (becomes a re-export shim)
- Modify: `apps/studio-web/lib/community/tape-types.ts` (becomes a re-export shim)

**Interfaces:**
- Produces: `@coral-studio/types` gains — `CommunityChannel`, `ReaderStatus`, `RehearsalFormat`, `CastingType`, `CommunityPostItem`, `CommunityAttachmentItem`, `CommunityPostDetail`, `CommentWithAuthor`, `ReaderOfferItem`, `CommunityPostItemDTO`, `CommunityAttachmentItemDTO`, `CommunityPostDetailDTO`, `CommentWithAuthorDTO`, `ReaderOfferItemDTO`, `toPostItemDTO`, `toPostDetailDTO`, `toCommentDTO`, `toOfferDTO`, `TapeNoteTag`, `TapeItem`, `TapeNoteItem`, `TapeItemDTO`, `toTapeItemDTO`. Every later task in this plan imports these from `@coral-studio/types`.

- [ ] **Step 1: Move Community types + DTOs verbatim**

Create `packages/types/src/community.ts` — the exact content of today's `apps/studio-web/lib/community/types.ts` (all of it) followed by today's `apps/studio-web/lib/community/dto.ts` (all of it, minus its now-unnecessary `import type {...} from './types'` line since those types are now co-located):

```ts
export type CommunityChannel = 'reader_sos' | 'callboard' | 'craft_chat' | 'general'
export type ReaderStatus = 'seeking' | 'matched' | 'closed'
export type RehearsalFormat = 'studio' | 'online'
export type CastingType = 'student_film' | 'theatre' | 'feature' | 'commercial' | 'crew_rec'

export interface CommunityPostItem {
  id: string
  channel: CommunityChannel
  title: string
  content: string
  authorId: string
  authorName: string | null
  authorImage: string | null
  authorRole: string
  readerStatus: ReaderStatus | null
  matchedUserId: string | null
  matchedUserName: string | null
  rehearsalAt: Date | null
  rehearsalFormat: RehearsalFormat | null
  sceneDetails: string | null
  castingType: CastingType | null
  deadlineAt: Date | null
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
  commentsCount: number
}

export interface CommunityAttachmentItem {
  id: string
  postId: string | null
  commentId: string | null
  url: string
  filename: string
  fileType: string
  fileSize: number | null
  createdAt: Date
}

export interface CommunityPostDetail extends CommunityPostItem {
  attachments: CommunityAttachmentItem[]
}

export interface CommentWithAuthor {
  id: string
  postId: string
  authorId: string
  authorName: string | null
  authorImage: string | null
  authorRole: string
  content: string
  createdAt: Date
}

export interface ReaderOfferItem {
  id: string
  userId: string
  userName: string | null
  userImage: string | null
  sessionsRead: number
  createdAt: Date
}

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

- [ ] **Step 2: Move Tape types verbatim, adding a DTO**

Create `packages/types/src/tapes.ts` — the exact content of today's `apps/studio-web/lib/community/tape-types.ts`, plus a new `TapeItemDTO`/`toTapeItemDTO` pair (the web app never serializes tapes through JSON — `listTapes()` is called directly from a Server Component — so no DTO existed for it before; mobile's new route in Task 4 needs one, the same way Community's posts already have one):

```ts
export type TapeNoteTag = 'objective_action' | 'truthfulness_listening' | 'vocal_physicality' | 'framing_eyeline'

export interface TapeItem {
  id: string
  title: string
  description: string
  authorId: string
  authorName: string | null
  authorImage: string | null
  authorRole: string
  durationSeconds: number | null
  createdAt: Date
  notesCount: number
}

export interface TapeNoteItem {
  id: string
  tapeId: string
  authorId: string
  authorName: string | null
  authorImage: string | null
  authorRole: string
  timestampSeconds: number
  tag: TapeNoteTag | null
  content: string
  createdAt: Date
}

export type TapeItemDTO = Omit<TapeItem, 'createdAt'> & { createdAt: string }

export function toTapeItemDTO(tape: TapeItem): TapeItemDTO {
  return { ...tape, createdAt: tape.createdAt.toISOString() }
}
```

- [ ] **Step 3: Extend the index barrel**

Edit `packages/types/src/index.ts` to add two lines (keep the existing `./scripts` and `./workshops` lines from the foundation plan):

```ts
export * from './scripts'
export * from './workshops'
export * from './community'
export * from './tapes'
```

- [ ] **Step 4: Turn `lib/community/types.ts` into a re-export shim**

Replace the entire contents of `apps/studio-web/lib/community/types.ts` with:

```ts
export type {
  CommunityChannel,
  ReaderStatus,
  RehearsalFormat,
  CastingType,
  CommunityPostItem,
  CommunityAttachmentItem,
  CommunityPostDetail,
  CommentWithAuthor,
  ReaderOfferItem,
} from '@coral-studio/types'
```

Its many existing importers (`lib/community/queries.ts`, `lib/community/reader-queries.ts`, `app/community/actions.ts`, `components/community/*`, `hooks/community/*`, etc.) need no changes — they still import from `@/lib/community/types` or `./types`, which now just forwards to the package.

- [ ] **Step 5: Turn `lib/community/dto.ts` into a re-export shim**

Replace the entire contents of `apps/studio-web/lib/community/dto.ts` with:

```ts
export type {
  CommunityPostItemDTO,
  CommunityAttachmentItemDTO,
  CommunityPostDetailDTO,
  CommentWithAuthorDTO,
  ReaderOfferItemDTO,
} from '@coral-studio/types'
export { toPostItemDTO, toPostDetailDTO, toCommentDTO, toOfferDTO } from '@coral-studio/types'
```

Its existing importers (all the `app/community/**/route.ts` files, `hooks/community/*`, etc.) need no changes.

- [ ] **Step 6: Turn `lib/community/tape-types.ts` into a re-export shim**

Replace the entire contents of `apps/studio-web/lib/community/tape-types.ts` with:

```ts
export type { TapeNoteTag, TapeItem, TapeNoteItem } from '@coral-studio/types'
```

- [ ] **Step 7: Verify nothing broke**

Run:
```bash
pnpm --filter studio-web exec tsc --noEmit
```
Expected: no new errors. Then run `pnpm --filter studio-web dev`, open `/community` (feed, a post detail, the tape room) signed in as an existing user, and confirm everything renders exactly as before.

- [ ] **Step 8: Commit**

```bash
git add packages/types apps/studio-web/lib/community/types.ts apps/studio-web/lib/community/dto.ts apps/studio-web/lib/community/tape-types.ts
git commit -m "refactor: move community/tape types into @coral-studio/types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 2: Community read routes for mobile

**Files:**
- Create: `apps/studio-web/app/api/mobile/community/posts/route.ts`
- Create: `apps/studio-web/app/api/mobile/community/posts/[id]/route.ts`
- Create: `apps/studio-web/app/api/mobile/community/posts/[id]/comments/route.ts` (GET only in this task — POST is added in Task 3, in the same file)
- Create: `apps/studio-web/app/api/mobile/community/posts/[id]/offers/route.ts`

**Interfaces:**
- Consumes: `getMobileUser`, `isAdminUser` from `lib/mobile-auth.ts`; `listCommunityPosts`, `getCommunityPostById`, `listCommentsForPost` from `lib/community/queries.ts` (existing, unchanged); `decodeCursor` from `lib/community/pagination.ts` (existing, unchanged); `toPostItemDTO`, `toPostDetailDTO`, `toCommentDTO`, `toOfferDTO` from `lib/community/dto.ts`; `listOffersForPost`, `hasUserOfferedToRead` from `lib/community/reader-queries.ts` (existing, unchanged).
- Produces: `GET /api/mobile/community/posts?channel=&status=&cursor=&limit=` → `{ items: CommunityPostItemDTO[]; nextCursor: string | null }`; `GET /api/mobile/community/posts/:id` → `CommunityPostDetailDTO`; `GET /api/mobile/community/posts/:id/comments` → `CommentWithAuthorDTO[]`; `GET /api/mobile/community/posts/:id/offers` → `{ offers: ReaderOfferItemDTO[]; hasOffered: boolean }`. Task 5's `packages/api-client` calls these exact paths/shapes.

- [ ] **Step 1: Posts list route**

Create `apps/studio-web/app/api/mobile/community/posts/route.ts`:

```ts
import { getMobileUser } from '@/lib/mobile-auth'
import { listCommunityPosts } from '@/lib/community/queries'
import { decodeCursor } from '@/lib/community/pagination'
import { toPostItemDTO } from '@/lib/community/dto'
import type { CommunityChannel, ReaderStatus } from '@/lib/community/types'

export async function GET(request: Request) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const channel = (searchParams.get('channel') as CommunityChannel) || undefined
  const status = (searchParams.get('status') as ReaderStatus) || undefined
  const cursor = decodeCursor(searchParams.get('cursor'))
  const rawLimit = Number(searchParams.get('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20

  const { items, nextCursor } = await listCommunityPosts({ channel, status, cursor, limit })
  return Response.json({ items: items.map(toPostItemDTO), nextCursor })
}
```

- [ ] **Step 2: Post detail route**

Create `apps/studio-web/app/api/mobile/community/posts/[id]/route.ts`:

```ts
import { getMobileUser } from '@/lib/mobile-auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { toPostDetailDTO } from '@/lib/community/dto'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await getCommunityPostById(id)
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(toPostDetailDTO(post))
}
```

- [ ] **Step 3: Comments list route**

Create `apps/studio-web/app/api/mobile/community/posts/[id]/comments/route.ts`:

```ts
import { getMobileUser } from '@/lib/mobile-auth'
import { listCommentsForPost } from '@/lib/community/queries'
import { toCommentDTO } from '@/lib/community/dto'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const comments = await listCommentsForPost(id)
  return Response.json(comments.map(toCommentDTO))
}
```

- [ ] **Step 4: Offers route**

Create `apps/studio-web/app/api/mobile/community/posts/[id]/offers/route.ts`:

```ts
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getCommunityPostById } from '@/lib/community/queries'
import { listOffersForPost, hasUserOfferedToRead } from '@/lib/community/reader-queries'
import { toOfferDTO } from '@/lib/community/dto'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await getCommunityPostById(id)
  if (!post || post.channel !== 'reader_sos') {
    return Response.json({ offers: [], hasOffered: false })
  }

  const isAdmin = await isAdminUser(user.userId)
  const isPostAuthorOrAdmin = post.authorId === user.userId || isAdmin

  const [offers, hasOffered] = await Promise.all([
    isPostAuthorOrAdmin ? listOffersForPost(id) : Promise.resolve([]),
    !isPostAuthorOrAdmin ? hasUserOfferedToRead(id, user.userId) : Promise.resolve(false),
  ])

  return Response.json({ offers: offers.map(toOfferDTO), hasOffered })
}
```

- [ ] **Step 5: Verify manually**

With the dev server running and a mobile token from the foundation plan's login route:
```bash
TOKEN="paste-a-fresh-token-here"

curl -i "http://localhost:3000/api/mobile/community/posts?limit=5" -H "Authorization: Bearer $TOKEN"
# Expected: 200, { "items": [...], "nextCursor": ... }

curl -i "http://localhost:3000/api/mobile/community/posts?channel=reader_sos" -H "Authorization: Bearer $TOKEN"
# Expected: 200, items all have channel: "reader_sos"
```
If you have a real post id from the response above:
```bash
POST_ID="paste-an-id-here"
curl -i "http://localhost:3000/api/mobile/community/posts/$POST_ID" -H "Authorization: Bearer $TOKEN"
curl -i "http://localhost:3000/api/mobile/community/posts/$POST_ID/comments" -H "Authorization: Bearer $TOKEN"
curl -i "http://localhost:3000/api/mobile/community/posts/$POST_ID/offers" -H "Authorization: Bearer $TOKEN"
```
Expected: `200` with the matching shapes; an unknown id returns `404` on the detail route.

- [ ] **Step 6: Commit**

```bash
git add apps/studio-web/app/api/mobile/community/posts
git commit -m "feat: add mobile read routes for community posts, comments, and offers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 3: Comment-write route for mobile

**Files:**
- Modify: `apps/studio-web/app/api/mobile/community/posts/[id]/comments/route.ts` (add `POST` alongside Task 2's `GET`)

**Interfaces:**
- Consumes: `db`, `communityComments`, `communityPosts`, `users` from `lib/database/*` (existing, unchanged); `toCommentDTO` from `lib/community/dto.ts`.
- Produces: `POST /api/mobile/community/posts/:id/comments` with body `{ content: string }` → `201` with `CommentWithAuthorDTO`, or `400`/`404`/`401` on failure. Task 5's `packages/api-client.addComment(postId, content)` calls this.

- [ ] **Step 1: Add the POST handler**

This is deliberately a small, separate reimplementation of `app/community/actions.ts`'s `addCommunityComment` server action's DB write — not an edit to that action, per this plan's no-touch constraint. Add this to the bottom of `apps/studio-web/app/api/mobile/community/posts/[id]/comments/route.ts` (which Task 2 created with just the `GET` handler — leave that `GET` function exactly as-is, add this below it), and add the two new imports at the top:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { communityComments, communityPosts, users } from '@/lib/database/schema'
```

```ts
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: postId } = await params
  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!content) return Response.json({ error: 'Comment cannot be empty.' }, { status: 400 })

  const [post] = await db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.id, postId)).limit(1)
  if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })

  const [author] = await db
    .select({ name: users.name, image: users.image, role: users.role })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1)
  if (!author) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [comment] = await db
    .insert(communityComments)
    .values({ postId, authorId: user.userId, content })
    .returning()

  return Response.json(
    toCommentDTO({
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      authorName: author.name,
      authorImage: author.image,
      authorRole: author.role,
      content: comment.content,
      createdAt: comment.createdAt,
    }),
    { status: 201 }
  )
}
```

The full file should now have both `GET` (from Task 2) and this `POST`, both using the `getMobileUser` import already at the top from Task 2.

- [ ] **Step 2: Verify manually**

```bash
POST_ID="paste-a-real-post-id"
curl -i -X POST "http://localhost:3000/api/mobile/community/posts/$POST_ID/comments" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"content":"Testing from curl"}'
# Expected: 201 with the new comment (id, postId, authorId, authorName, content, createdAt as an ISO string)

curl -i -X POST "http://localhost:3000/api/mobile/community/posts/$POST_ID/comments" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"content":"  "}'
# Expected: 400 { "error": "Comment cannot be empty." }
```
Then re-run Task 2's `GET .../comments` curl and confirm the new comment shows up.

- [ ] **Step 3: Commit**

```bash
git add "apps/studio-web/app/api/mobile/community/posts/[id]/comments/route.ts"
git commit -m "feat: add mobile comment-creation route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 4: Tape room routes for mobile

**Files:**
- Create: `apps/studio-web/app/api/mobile/community/tapes/route.ts`
- Create: `apps/studio-web/app/api/mobile/community/tapes/[tapeId]/video/route.ts`

**Interfaces:**
- Consumes: `getMobileUser` from `lib/mobile-auth.ts`; `listTapes`, `getTapeVideoPathname` from `lib/community/tape-queries.ts` (existing, unchanged); `toTapeItemDTO` from `lib/community/tape-types.ts` (Task 1); `issueSignedToken`, `presignUrl` from `@vercel/blob` (existing dependency).
- Produces: `GET /api/mobile/community/tapes` → `TapeItemDTO[]`; `GET /api/mobile/community/tapes/:tapeId/video` → `{ url: string }` — **note this returns JSON with the presigned URL, not an HTTP redirect** like the web route does, because a native video player takes a plain URI string and can't carry the mobile app's `Authorization` header through a redirect the way a browser carries cookies. Task 8's mobile screen fetches this once, then hands the returned `url` straight to the video player.

- [ ] **Step 1: Tapes list route**

Create `apps/studio-web/app/api/mobile/community/tapes/route.ts`:

```ts
import { getMobileUser } from '@/lib/mobile-auth'
import { listTapes } from '@/lib/community/tape-queries'
import { toTapeItemDTO } from '@/lib/community/tape-types'

export async function GET(request: Request) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tapes = await listTapes()
  return Response.json(tapes.map(toTapeItemDTO))
}
```

- [ ] **Step 2: Video URL route**

Create `apps/studio-web/app/api/mobile/community/tapes/[tapeId]/video/route.ts`:

```ts
import { issueSignedToken, presignUrl } from '@vercel/blob'
import { getMobileUser } from '@/lib/mobile-auth'
import { getTapeVideoPathname } from '@/lib/community/tape-queries'

export async function GET(request: Request, { params }: { params: Promise<{ tapeId: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { tapeId } = await params
  const pathname = await getTapeVideoPathname(tapeId)
  if (!pathname) return Response.json({ error: 'Not found' }, { status: 404 })

  const token = await issueSignedToken({
    pathname,
    operations: ['get'],
    validUntil: Date.now() + 6 * 60 * 60 * 1000, // 6 hours -- long enough for one viewing session
  })

  const { presignedUrl } = await presignUrl(token, {
    operation: 'get',
    pathname,
    access: 'private',
  })

  return Response.json({ url: presignedUrl })
}
```

- [ ] **Step 3: Verify manually**

```bash
curl -i "http://localhost:3000/api/mobile/community/tapes" -H "Authorization: Bearer $TOKEN"
# Expected: 200, a JSON array (empty if no tapes exist yet -- record one via the web app's Tape Room first)
```
With a real tape id from that response:
```bash
TAPE_ID="paste-a-tape-id"
curl -i "http://localhost:3000/api/mobile/community/tapes/$TAPE_ID/video" -H "Authorization: Bearer $TOKEN"
# Expected: 200, { "url": "https://...blob.vercel-storage.com/...?..." }
```
Paste that `url` into a browser tab directly — it should play/download the video, confirming the presigned URL itself is valid independent of our API's auth.

- [ ] **Step 4: Commit**

```bash
git add apps/studio-web/app/api/mobile/community/tapes
git commit -m "feat: add mobile tape list and video-url routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 5: Extend the shared API client

**Files:**
- Modify: `packages/api-client/src/client.ts` (add Community + Tape methods)
- Modify: `packages/api-client/src/client.test.ts` (add tests for the new methods)

**Interfaces:**
- Consumes: `CommunityChannel`, `ReaderStatus`, `CommunityPostItemDTO`, `CommunityPostDetailDTO`, `CommentWithAuthorDTO`, `ReaderOfferItemDTO`, `TapeItemDTO` from `@coral-studio/types` (Task 1).
- Produces: `ApiClient` (from the foundation plan's `createApiClient`) gains — `getCommunityPosts(params?: { channel?: CommunityChannel; status?: ReaderStatus; cursor?: string | null }): Promise<{ items: CommunityPostItemDTO[]; nextCursor: string | null }>`, `getCommunityPost(id: string): Promise<CommunityPostDetailDTO>`, `getComments(postId: string): Promise<CommentWithAuthorDTO[]>`, `addComment(postId: string, content: string): Promise<CommentWithAuthorDTO>`, `getOffers(postId: string): Promise<{ offers: ReaderOfferItemDTO[]; hasOffered: boolean }>`, `getTapes(): Promise<TapeItemDTO[]>`, `getTapeVideoUrl(tapeId: string): Promise<{ url: string }>`. Tasks 6-8's mobile screens call these.

- [ ] **Step 1: Write the failing tests**

Add to `packages/api-client/src/client.test.ts` (below the existing 4 tests from the foundation plan):

```ts
test('getCommunityPosts builds the query string from channel/status/cursor', async () => {
  let capturedUrl: string | undefined
  globalThis.fetch = (async (input) => {
    capturedUrl = String(input)
    return { ok: true, status: 200, json: async () => ({ items: [], nextCursor: null }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.getCommunityPosts({ channel: 'reader_sos', status: 'seeking', cursor: 'abc' })

  assert.equal(capturedUrl, 'https://example.test/api/mobile/community/posts?channel=reader_sos&status=seeking&cursor=abc')
})

test('getCommunityPosts omits the query string when called with no params', async () => {
  let capturedUrl: string | undefined
  globalThis.fetch = (async (input) => {
    capturedUrl = String(input)
    return { ok: true, status: 200, json: async () => ({ items: [], nextCursor: null }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.getCommunityPosts()

  assert.equal(capturedUrl, 'https://example.test/api/mobile/community/posts')
})

test('addComment POSTs the content as JSON', async () => {
  let capturedBody: string | undefined
  let capturedMethod: string | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedBody = init?.body as string
    capturedMethod = init?.method
    return {
      ok: true,
      status: 201,
      json: async () => ({ id: 'c1', postId: 'p1', authorId: 'u1', authorName: 'A', authorImage: null, authorRole: 'user', content: 'hi', createdAt: '2026-01-01T00:00:00.000Z' }),
    } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  const result = await client.addComment('p1', 'hi')

  assert.equal(capturedMethod, 'POST')
  assert.equal(capturedBody, JSON.stringify({ content: 'hi' }))
  assert.equal(result.id, 'c1')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: FAIL — `client.getCommunityPosts is not a function`.

- [ ] **Step 3: Implement the new methods**

In `packages/api-client/src/client.ts`, change the top import line to also bring in the new types:

```ts
import type {
  CommunityChannel,
  CommunityPostDetailDTO,
  CommunityPostItemDTO,
  CommentWithAuthorDTO,
  ReaderOfferItemDTO,
  ReaderStatus,
  Script,
  TapeItemDTO,
  WorkshopDetail,
  WorkshopListItem,
} from '@coral-studio/types'
```

Add this type near the other exported types (alongside `LoginResult` / `WorkshopLiveStatus`):

```ts
export type CommunityPostsPage = { items: CommunityPostItemDTO[]; nextCursor: string | null }
export type OffersResult = { offers: ReaderOfferItemDTO[]; hasOffered: boolean }
```

Add these methods to the object returned by `createApiClient` (alongside `login`, `getWorkshops`, etc.):

```ts
    getCommunityPosts(params: { channel?: CommunityChannel; status?: ReaderStatus; cursor?: string | null } = {}): Promise<CommunityPostsPage> {
      const search = new URLSearchParams()
      if (params.channel) search.set('channel', params.channel)
      if (params.status) search.set('status', params.status)
      if (params.cursor) search.set('cursor', params.cursor)
      const query = search.toString()
      return request<CommunityPostsPage>(`/api/mobile/community/posts${query ? `?${query}` : ''}`)
    },
    getCommunityPost(id: string): Promise<CommunityPostDetailDTO> {
      return request<CommunityPostDetailDTO>(`/api/mobile/community/posts/${id}`)
    },
    getComments(postId: string): Promise<CommentWithAuthorDTO[]> {
      return request<CommentWithAuthorDTO[]>(`/api/mobile/community/posts/${postId}/comments`)
    },
    addComment(postId: string, content: string): Promise<CommentWithAuthorDTO> {
      return request<CommentWithAuthorDTO>(`/api/mobile/community/posts/${postId}/comments`, {
        method: 'POST',
        body: { content },
      })
    },
    getOffers(postId: string): Promise<OffersResult> {
      return request<OffersResult>(`/api/mobile/community/posts/${postId}/offers`)
    },
    getTapes(): Promise<TapeItemDTO[]> {
      return request<TapeItemDTO[]>('/api/mobile/community/tapes')
    },
    getTapeVideoUrl(tapeId: string): Promise<{ url: string }> {
      return request<{ url: string }>(`/api/mobile/community/tapes/${tapeId}/video`)
    },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Export the new types from the barrel**

In `packages/api-client/src/index.ts`, add `CommunityPostsPage` and `OffersResult` to the existing `export type { ... } from './client'` line:

```ts
export type { ApiClient, ApiClientConfig, LoginResult, WorkshopLiveStatus, CommunityPostsPage, OffersResult } from './client'
```

- [ ] **Step 6: Commit**

```bash
git add packages/api-client
git commit -m "feat: add community/tape methods to @coral-studio/api-client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 6: Community feed screen (posts + tape room toggle)

**Files:**
- Delete: `apps/mobile-app/app/(tabs)/community.tsx` (the foundation plan's placeholder — replaced by the folder below)
- Create: `apps/mobile-app/app/(tabs)/community/_layout.tsx`
- Create: `apps/mobile-app/app/(tabs)/community/index.tsx`
- Create: `apps/mobile-app/components/channel-tabs.tsx`
- Create: `apps/mobile-app/components/post-card.tsx`
- Create: `apps/mobile-app/components/tape-card.tsx`

**Interfaces:**
- Consumes: `apiClient.getCommunityPosts`, `apiClient.getTapes` from `lib/api.ts` (already exists from the foundation plan, now returning the extended `ApiClient`).
- Produces: navigation to `/community/:id` (Task 7) and `/community/tapes/:tapeId` (Task 8).

- [ ] **Step 1: Remove the placeholder**

Delete `apps/mobile-app/app/(tabs)/community.tsx`. Expo Router cannot have both a `community.tsx` file and a `community/` folder for the same route segment.

- [ ] **Step 2: Stack layout**

Create `apps/mobile-app/app/(tabs)/community/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'

export default function CommunityStackLayout() {
  return <Stack />
}
```

- [ ] **Step 3: Channel tabs component**

Create `apps/mobile-app/components/channel-tabs.tsx`:

```tsx
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

export type CommunityChannelId = 'all' | 'reader_sos' | 'callboard' | 'craft_chat' | 'general' | 'tape_room'

const CHANNELS: { id: CommunityChannelId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'reader_sos', label: '#reader-sos' },
  { id: 'callboard', label: '#the-callboard' },
  { id: 'craft_chat', label: '#craft-chat' },
  { id: 'general', label: '#general' },
  { id: 'tape_room', label: 'Tape Room' },
]

export function ChannelTabs({ active, onChange }: { active: CommunityChannelId; onChange: (id: CommunityChannelId) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {CHANNELS.map((channel) => {
        const isActive = channel.id === active
        return (
          <Pressable key={channel.id} style={[styles.tab, isActive && styles.tabActive]} onPress={() => onChange(channel.id)}>
            <Text style={[styles.label, isActive && styles.labelActive]}>{channel.label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, borderColor: '#eee' },
  content: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f2f2f2' },
  tabActive: { backgroundColor: '#111' },
  label: { fontSize: 13, color: '#444' },
  labelActive: { color: '#fff', fontWeight: '600' },
})
```

- [ ] **Step 4: Post card component**

Create `apps/mobile-app/components/post-card.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native'
import type { CommunityPostItemDTO } from '@coral-studio/types'

export function PostCard({ post, onPress }: { post: CommunityPostItemDTO; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.channel}>#{post.channel.replace('_', '-')}</Text>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.author}>{post.authorName ?? 'Unknown'}</Text>
      {post.channel === 'reader_sos' && post.readerStatus ? <Text style={styles.meta}>Status: {post.readerStatus}</Text> : null}
      {post.channel === 'callboard' && post.castingType ? (
        <Text style={styles.meta}>
          {post.castingType}
          {post.deadlineAt ? ` · due ${new Date(post.deadlineAt).toLocaleDateString()}` : ''}
        </Text>
      ) : null}
      <Text style={styles.meta}>
        {post.commentsCount} comment{post.commentsCount === 1 ? '' : 's'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  channel: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  author: { color: '#666', marginTop: 2 },
  meta: { color: '#666', marginTop: 4, fontSize: 13 },
})
```

- [ ] **Step 5: Tape card component**

Create `apps/mobile-app/components/tape-card.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native'
import type { TapeItemDTO } from '@coral-studio/types'

export function TapeCard({ tape, onPress }: { tape: TapeItemDTO; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.title}>{tape.title}</Text>
      <Text style={styles.author}>{tape.authorName ?? 'Unknown'}</Text>
      <Text style={styles.meta}>
        {tape.notesCount} note{tape.notesCount === 1 ? '' : 's'}
        {tape.durationSeconds ? ` · ${Math.round(tape.durationSeconds)}s` : ''}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '600' },
  author: { color: '#666', marginTop: 2 },
  meta: { color: '#666', marginTop: 4, fontSize: 13 },
})
```

- [ ] **Step 6: Feed screen**

Create `apps/mobile-app/app/(tabs)/community/index.tsx`:

```tsx
import { useState } from 'react'
import { FlatList, StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { CommunityChannel } from '@coral-studio/types'
import { apiClient } from '../../../lib/api'
import { ChannelTabs, type CommunityChannelId } from '../../../components/channel-tabs'
import { PostCard } from '../../../components/post-card'
import { TapeCard } from '../../../components/tape-card'

export default function CommunityFeedScreen() {
  const router = useRouter()
  const [activeChannel, setActiveChannel] = useState<CommunityChannelId>('all')
  const isTapeRoom = activeChannel === 'tape_room'
  const channel = isTapeRoom || activeChannel === 'all' ? undefined : (activeChannel as CommunityChannel)

  const postsQuery = useInfiniteQuery({
    queryKey: ['community-posts', channel],
    queryFn: ({ pageParam }) => apiClient.getCommunityPosts({ channel, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !isTapeRoom,
  })

  const tapesQuery = useQuery({
    queryKey: ['tapes'],
    queryFn: () => apiClient.getTapes(),
    enabled: isTapeRoom,
  })

  if (isTapeRoom) {
    return (
      <>
        <ChannelTabs active={activeChannel} onChange={setActiveChannel} />
        {tapesQuery.isLoading ? (
          <Text style={styles.message}>Loading…</Text>
        ) : tapesQuery.error ? (
          <Text style={styles.message}>Could not load tapes.</Text>
        ) : (
          <FlatList
            data={tapesQuery.data ?? []}
            keyExtractor={(tape) => tape.id}
            renderItem={({ item }) => <TapeCard tape={item} onPress={() => router.push(`/community/tapes/${item.id}`)} />}
            ListEmptyComponent={<Text style={styles.message}>No tapes yet.</Text>}
          />
        )}
      </>
    )
  }

  const posts = postsQuery.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <>
      <ChannelTabs active={activeChannel} onChange={setActiveChannel} />
      {postsQuery.isLoading ? (
        <Text style={styles.message}>Loading…</Text>
      ) : postsQuery.error ? (
        <Text style={styles.message}>Could not load posts.</Text>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(post) => post.id}
          renderItem={({ item }) => <PostCard post={item} onPress={() => router.push(`/community/${item.id}`)} />}
          onEndReached={() => {
            if (postsQuery.hasNextPage) postsQuery.fetchNextPage()
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.message}>No posts yet.</Text>}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  message: { padding: 24, textAlign: 'center', color: '#666' },
})
```

- [ ] **Step 7: Verify manually**

Run `pnpm --filter mobile-app web`, sign in, open the Community tab. Expected: the channel tab strip scrolls horizontally; switching channels reloads the list filtered accordingly; scrolling to the bottom of a long feed loads more posts; switching to "Tape Room" shows the tape list instead.

- [ ] **Step 8: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/community" apps/mobile-app/components/channel-tabs.tsx apps/mobile-app/components/post-card.tsx apps/mobile-app/components/tape-card.tsx
git commit -m "feat: add mobile community feed screen with channel filter and tape room toggle

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 7: Post detail screen with comments

**Files:**
- Create: `apps/mobile-app/app/(tabs)/community/[id].tsx`

**Interfaces:**
- Consumes: `apiClient.getCommunityPost`, `apiClient.getComments`, `apiClient.addComment`, `apiClient.getOffers` from `lib/api.ts` (Task 5).

- [ ] **Step 1: Install the markdown renderer**

```bash
pnpm add --filter mobile-app react-native-markdown-display
```

- [ ] **Step 2: Post detail screen**

Create `apps/mobile-app/app/(tabs)/community/[id].tsx`:

```tsx
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Markdown from 'react-native-markdown-display'
import { apiClient } from '../../../lib/api'

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')

  const postQuery = useQuery({
    queryKey: ['community-post', id],
    queryFn: () => apiClient.getCommunityPost(id),
    enabled: !!id,
  })

  const commentsQuery = useQuery({
    queryKey: ['community-comments', id],
    queryFn: () => apiClient.getComments(id),
    enabled: !!id,
  })

  const offersQuery = useQuery({
    queryKey: ['community-offers', id],
    queryFn: () => apiClient.getOffers(id),
    enabled: !!id && postQuery.data?.channel === 'reader_sos',
  })

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => apiClient.addComment(id, content),
    onSuccess: () => {
      setDraft('')
      queryClient.invalidateQueries({ queryKey: ['community-comments', id] })
    },
  })

  if (postQuery.isLoading) return <Text style={styles.message}>Loading…</Text>
  if (postQuery.error || !postQuery.data) return <Text style={styles.message}>Could not load this post.</Text>

  const post = postQuery.data

  return (
    <View style={styles.container}>
      <FlatList
        data={commentsQuery.data ?? []}
        keyExtractor={(comment) => comment.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.channel}>#{post.channel.replace('_', '-')}</Text>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.author}>{post.authorName ?? 'Unknown'}</Text>
            <View style={styles.body}>
              <Markdown>{post.content}</Markdown>
            </View>

            {post.channel === 'reader_sos' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reader request</Text>
                <Text style={styles.meta}>Status: {post.readerStatus ?? 'seeking'}</Text>
                {post.rehearsalAt ? <Text style={styles.meta}>{new Date(post.rehearsalAt).toLocaleString()}</Text> : null}
                {post.rehearsalFormat ? <Text style={styles.meta}>{post.rehearsalFormat}</Text> : null}
                {post.sceneDetails ? <Text style={styles.meta}>{post.sceneDetails}</Text> : null}
                {offersQuery.data ? (
                  offersQuery.data.offers.length > 0 ? (
                    <Text style={styles.meta}>
                      Offered to read: {offersQuery.data.offers.map((o) => o.userName ?? 'Someone').join(', ')}
                    </Text>
                  ) : (
                    <Text style={styles.meta}>{offersQuery.data.hasOffered ? "You've offered to read." : 'No offers yet.'}</Text>
                  )
                ) : null}
              </View>
            ) : null}

            {post.channel === 'callboard' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Casting details</Text>
                {post.castingType ? <Text style={styles.meta}>{post.castingType}</Text> : null}
                {post.deadlineAt ? <Text style={styles.meta}>Due {new Date(post.deadlineAt).toLocaleDateString()}</Text> : null}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Comments</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.commentAuthor}>{item.authorName ?? 'Unknown'}</Text>
            <Text>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.message}>No comments yet.</Text>}
      />
      <View style={styles.composer}>
        <TextInput style={styles.input} placeholder="Write a comment…" value={draft} onChangeText={setDraft} multiline />
        <Pressable
          style={styles.sendButton}
          disabled={!draft.trim() || addCommentMutation.isPending}
          onPress={() => addCommentMutation.mutate(draft.trim())}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  message: { padding: 24, textAlign: 'center', color: '#666' },
  channel: { fontSize: 11, color: '#888', textTransform: 'uppercase', margin: 16, marginBottom: 0 },
  title: { fontSize: 20, fontWeight: '600', marginHorizontal: 16, marginTop: 4 },
  author: { color: '#666', marginHorizontal: 16, marginTop: 4, marginBottom: 8 },
  body: { marginHorizontal: 16 },
  section: { marginHorizontal: 16, marginTop: 12, gap: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginHorizontal: 16, marginTop: 16, marginBottom: 4 },
  meta: { color: '#666', fontSize: 13 },
  comment: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderColor: '#f2f2f2' },
  commentAuthor: { fontWeight: '600', marginBottom: 2 },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, maxHeight: 100 },
  sendButton: { backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontWeight: '600' },
})
```

- [ ] **Step 3: Verify manually**

Run `pnpm --filter mobile-app web`, tap into a post from the feed. Expected: markdown content renders (bold/links/etc. if the post used them), channel-specific details show for `reader_sos`/`callboard` posts, comments list below, and sending a comment appends it to the list immediately without a manual pull-to-refresh.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/community/[id].tsx" apps/mobile-app/package.json
git commit -m "feat: add mobile post detail screen with comments

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 8: Tape playback screen

**Files:**
- Create: `apps/mobile-app/app/(tabs)/community/tapes/[tapeId].tsx`

**Interfaces:**
- Consumes: `apiClient.getTapeVideoUrl` from `lib/api.ts` (Task 5).

- [ ] **Step 1: Install the video player**

```bash
npx expo install expo-video
```

- [ ] **Step 2: Playback screen**

Create `apps/mobile-app/app/(tabs)/community/tapes/[tapeId].tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useVideoPlayer, VideoView } from 'expo-video'
import { apiClient } from '../../../../lib/api'

export default function TapeDetailScreen() {
  const { tapeId } = useLocalSearchParams<{ tapeId: string }>()

  const videoUrlQuery = useQuery({
    queryKey: ['tape-video-url', tapeId],
    queryFn: () => apiClient.getTapeVideoUrl(tapeId),
    enabled: !!tapeId,
  })

  const player = useVideoPlayer(videoUrlQuery.data?.url ?? null, (p) => {
    p.loop = false
  })

  if (videoUrlQuery.isLoading) return <Text style={styles.message}>Loading…</Text>
  if (videoUrlQuery.error || !videoUrlQuery.data) return <Text style={styles.message}>Could not load this tape.</Text>

  return (
    <View style={styles.container}>
      <VideoView style={styles.video} player={player} allowsFullscreen nativeControls />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  message: { padding: 24, textAlign: 'center', color: '#666' },
  video: { width: '100%', height: 240 },
})
```

- [ ] **Step 3: Verify manually**

Run `pnpm --filter mobile-app web` (video playback on web uses the browser's native `<video>` under the hood via `expo-video`'s web support), open the Tape Room, tap a tape. Expected: the video loads and plays with native controls. Also do at least one pass on an actual iOS/Android simulator or device before considering this task done, since `expo-video`'s web fallback doesn't fully exercise the native player path.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/community/tapes" apps/mobile-app/package.json
git commit -m "feat: add mobile tape playback screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

## After this plan

Both plans together deliver the read-heavy mobile MVP described in the spec. Deferred work (live video, content creation beyond comments, tape recording/upload, OAuth on mobile, push notifications) stays out of scope until a future phase is explicitly requested.
