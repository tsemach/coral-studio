# Community Sub-project 2: The Tape Room — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tape Room" fifth channel to the existing `/community` board where actors record or upload video self-tapes and receive peer feedback pinned to specific moments in the video.

**Architecture:** Two new Drizzle tables (`tape_posts`, `tape_notes`) alongside the existing `community_posts` tables. Videos upload directly from the browser to Vercel Blob (bypassing server body-size limits entirely) via a token-issuing Route Handler, then a separate server action records the resulting metadata in the database. Private video content is served back to the browser through an authenticated Route Handler that never exposes the underlying Blob URL.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions, Route Handlers), Drizzle ORM (PostgreSQL), `@vercel/blob` and `@vercel/blob/client` v2.8.0, browser `MediaRecorder`/`getUserMedia` APIs, Tailwind CSS v4.

**Spec:** [`docs/communities/subproject-2-tape-room/spec.md`](./spec.md)

## Global Constraints

* Zero external UI component libraries: adhere strictly to existing Tailwind CSS patterns in the studio codebase.
* Never run `npm start` or `yarn start` (dev server managed independently).
* No test suite is configured in this repo (per `CLAUDE.md`): verify every step with `npx tsc --noEmit` plus manual browser checks, not automated tests.
* Any active studio member (not just admins or the tape's author) can view every tape and add notes to it — no visibility tiers.
* A note's craft-category tag is always optional, never required.
* **Known limitation, decided during planning:** the installed `@vercel/blob` (2.8.0) client's `get()` function types its result as `statusCode: 200 | 304` only — there is no typed guarantee of `206 Partial Content` support for forwarded `Range` headers. Rather than write code that assumes untested partial-content behavior, Task 5 serves the full video on every request (no true byte-range seeking in this version). This is a deliberate scope decision, not a bug to fix later in this plan — flagged to the user, not silently shipped.

---

### Task 1: Extract shared auth helper, add the Tape Room data model

**Files:**
- Create: `lib/community/auth.ts`
- Modify: `app/community/actions.ts`
- Modify: `lib/database/schema.ts`
- Create: `lib/community/tape-types.ts`

**Interfaces:**
- Produces: `requireActiveUser(): Promise<{ id: string; name: string | null; role: string; status: string }>` (moved, not duplicated), Drizzle tables `tapePosts`, `tapeNotes`, and types `TapeNoteTag`, `TapeItem`, `TapeNoteItem` for later tasks to import.

- [ ] **Step 1: Extract `requireActiveUser()` into `lib/community/auth.ts`**

Create `lib/community/auth.ts`:

```typescript
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'

export async function requireActiveUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userRecords = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const currentUser = userRecords[0]
  if (!currentUser || currentUser.status !== 'active') {
    throw new Error('Forbidden: active account required')
  }

  return currentUser
}
```

- [ ] **Step 2: Update `app/community/actions.ts` to import it instead of defining it**

In `app/community/actions.ts`, remove the existing inline `requireActiveUser` function definition (currently the first exported function in the file, using `auth`, `db`, `users` from the same imports already present) and replace it with an import:

```typescript
import { requireActiveUser } from '@/lib/community/auth'
```

Remove the now-duplicate `auth` import from `@/auth` in this file if `requireActiveUser` was its only remaining use — check by searching the rest of the file for other `auth()` calls before removing the import.

- [ ] **Step 3: Add the `tapePosts` and `tapeNotes` tables to `lib/database/schema.ts`**

Append after the existing `communityAttachments` table:

```typescript
// COR-21: Community Sub-project 2 -- The Tape Room
export const tapePosts = pgTable('tape_posts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Blob pathname, not a public URL -- resolved server-side via get() in the
  // video streaming route (app/community/tape-room/[tapeId]/video/route.ts),
  // never exposed directly to the browser.
  videoPathname: text('video_pathname').notNull(),
  durationSeconds: integer('duration_seconds'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const tapeNotes = pgTable('tape_notes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tapeId: text('tape_id')
    .notNull()
    .references(() => tapePosts.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  timestampSeconds: integer('timestamp_seconds').notNull(),
  tag: text('tag', {
    enum: ['objective_action', 'truthfulness_listening', 'vocal_physicality', 'framing_eyeline'],
  }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})
```

- [ ] **Step 4: Define shared Tape Room types in `lib/community/tape-types.ts`**

```typescript
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
```

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 6: Push the schema change**

Run: `pnpm db:push`
Expected: Database schema updated successfully (creates `tape_posts` and `tape_notes` tables).

- [ ] **Step 7: Commit**

```bash
git add lib/community/auth.ts lib/community/tape-types.ts app/community/actions.ts lib/database/schema.ts
git commit -m "feat(tape-room): add data model and shared auth helper (COR-21)"
```

---

### Task 2: Tape Room queries

**Files:**
- Create: `lib/community/tape-queries.ts`

**Interfaces:**
- Consumes: `db`, `tapePosts`, `tapeNotes`, `users` from `@/lib/database/schema`; `TapeItem`, `TapeNoteItem`, `TapeNoteTag` from `./tape-types` (Task 1).
- Produces: `listTapes(): Promise<TapeItem[]>`, `getTapeById(id: string): Promise<TapeItem | null>`, `listNotesForTape(tapeId: string): Promise<TapeNoteItem[]>`, `getTapeVideoPathname(id: string): Promise<string | null>` (used only by the video streaming route in Task 5, kept separate from `TapeItem` so the pathname is never accidentally serialized into a page prop sent to the browser).

- [ ] **Step 1: Implement `lib/community/tape-queries.ts`**

```typescript
import { desc, eq, inArray, count } from 'drizzle-orm'
import { db } from '@/lib/database'
import { tapePosts, tapeNotes, users } from '@/lib/database/schema'
import type { TapeItem, TapeNoteItem, TapeNoteTag } from './tape-types'

const TAPE_COLUMNS = {
  id: tapePosts.id,
  title: tapePosts.title,
  description: tapePosts.description,
  authorId: tapePosts.authorId,
  authorName: users.name,
  authorImage: users.image,
  authorRole: users.role,
  durationSeconds: tapePosts.durationSeconds,
  createdAt: tapePosts.createdAt,
}

export async function listTapes(): Promise<TapeItem[]> {
  const rows = await db
    .select(TAPE_COLUMNS)
    .from(tapePosts)
    .innerJoin(users, eq(tapePosts.authorId, users.id))
    .orderBy(desc(tapePosts.createdAt))

  if (rows.length === 0) return []

  const tapeIds = rows.map((row) => row.id)
  const noteCounts = await db
    .select({ tapeId: tapeNotes.tapeId, count: count(tapeNotes.id) })
    .from(tapeNotes)
    .where(inArray(tapeNotes.tapeId, tapeIds))
    .groupBy(tapeNotes.tapeId)

  const noteCountMap = new Map<string, number>()
  for (const row of noteCounts) {
    noteCountMap.set(row.tapeId, Number(row.count))
  }

  return rows.map((row) => ({ ...row, notesCount: noteCountMap.get(row.id) ?? 0 }))
}

export async function getTapeById(id: string): Promise<TapeItem | null> {
  const rows = await db
    .select(TAPE_COLUMNS)
    .from(tapePosts)
    .innerJoin(users, eq(tapePosts.authorId, users.id))
    .where(eq(tapePosts.id, id))
    .limit(1)

  if (rows.length === 0) return null
  const row = rows[0]

  const [countResult] = await db
    .select({ count: count(tapeNotes.id) })
    .from(tapeNotes)
    .where(eq(tapeNotes.tapeId, id))

  return { ...row, notesCount: Number(countResult?.count ?? 0) }
}

export async function listNotesForTape(tapeId: string): Promise<TapeNoteItem[]> {
  const rows = await db
    .select({
      id: tapeNotes.id,
      tapeId: tapeNotes.tapeId,
      authorId: tapeNotes.authorId,
      authorName: users.name,
      authorImage: users.image,
      authorRole: users.role,
      timestampSeconds: tapeNotes.timestampSeconds,
      tag: tapeNotes.tag,
      content: tapeNotes.content,
      createdAt: tapeNotes.createdAt,
    })
    .from(tapeNotes)
    .innerJoin(users, eq(tapeNotes.authorId, users.id))
    .where(eq(tapeNotes.tapeId, tapeId))
    .orderBy(tapeNotes.timestampSeconds)

  return rows.map((row) => ({ ...row, tag: row.tag as TapeNoteTag | null }))
}

export async function getTapeVideoPathname(id: string): Promise<string | null> {
  const [row] = await db
    .select({ videoPathname: tapePosts.videoPathname })
    .from(tapePosts)
    .where(eq(tapePosts.id, id))
    .limit(1)

  return row?.videoPathname ?? null
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/community/tape-queries.ts
git commit -m "feat(tape-room): add tape queries (COR-21)"
```

---

### Task 3: Tape Room server actions

**Files:**
- Create: `app/community/tape-actions.ts`

**Interfaces:**
- Consumes: `requireActiveUser` from `@/lib/community/auth` (Task 1); `tapePosts`, `tapeNotes` from `@/lib/database/schema`; `TapeNoteTag` from `@/lib/community/tape-types` (Task 1).
- Produces: `createTape(input: { title: string; description: string; videoPathname: string; durationSeconds: number | null }): Promise<{ error: string } | { success: true; tapeId: string }>`, `addTapeNote(tapeId: string, timestampSeconds: number, content: string, tag: TapeNoteTag | null): Promise<{ error: string } | { success: true; noteId: string }>`, `deleteTape(tapeId: string): Promise<{ error: string } | { success: true }>`.

**Note:** unlike `createCommunityPost` in `app/community/actions.ts` (which receives a `FormData` including the raw file and uploads it itself), `createTape` takes a plain object and an already-uploaded `videoPathname` string. This is because the video is uploaded directly from the browser to Blob *before* this action runs (Task 4) — by the time `createTape` is called, the file already exists in storage and only its pathname needs recording.

- [ ] **Step 1: Implement `app/community/tape-actions.ts`**

```typescript
'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/database'
import { tapePosts, tapeNotes } from '@/lib/database/schema'
import { requireActiveUser } from '@/lib/community/auth'
import type { TapeNoteTag } from '@/lib/community/tape-types'

const VALID_TAGS: TapeNoteTag[] = [
  'objective_action',
  'truthfulness_listening',
  'vocal_physicality',
  'framing_eyeline',
]

export async function createTape(input: {
  title: string
  description: string
  videoPathname: string
  durationSeconds: number | null
}) {
  const user = await requireActiveUser()

  const title = input.title.trim()
  const description = input.description.trim()

  if (!title || !description || !input.videoPathname) {
    return { error: 'Title, description, and a video are required' }
  }

  const [createdTape] = await db
    .insert(tapePosts)
    .values({
      title,
      description,
      authorId: user.id,
      videoPathname: input.videoPathname,
      durationSeconds: input.durationSeconds,
    })
    .returning()

  revalidatePath('/community')
  return { success: true as const, tapeId: createdTape.id }
}

export async function addTapeNote(
  tapeId: string,
  timestampSeconds: number,
  content: string,
  tag: TapeNoteTag | null
) {
  const user = await requireActiveUser()

  const trimmed = content?.trim()
  if (!trimmed) {
    return { error: 'Note cannot be empty' }
  }
  if (!Number.isInteger(timestampSeconds) || timestampSeconds < 0) {
    return { error: 'Invalid timestamp' }
  }
  if (tag !== null && !VALID_TAGS.includes(tag)) {
    return { error: 'Invalid tag' }
  }

  const [tape] = await db
    .select({ id: tapePosts.id })
    .from(tapePosts)
    .where(eq(tapePosts.id, tapeId))
    .limit(1)

  if (!tape) {
    return { error: 'Tape not found' }
  }

  const [note] = await db
    .insert(tapeNotes)
    .values({
      tapeId,
      authorId: user.id,
      timestampSeconds,
      tag,
      content: trimmed,
    })
    .returning()

  revalidatePath(`/community/tape-room/${tapeId}`)
  revalidatePath('/community')
  return { success: true as const, noteId: note.id }
}

export async function deleteTape(tapeId: string) {
  const user = await requireActiveUser()

  const [tape] = await db
    .select({ id: tapePosts.id, authorId: tapePosts.authorId })
    .from(tapePosts)
    .where(eq(tapePosts.id, tapeId))
    .limit(1)

  if (!tape) {
    return { error: 'Tape not found' }
  }

  if (tape.authorId !== user.id && user.role !== 'admin') {
    return { error: 'Unauthorized to delete this tape' }
  }

  await db.delete(tapePosts).where(eq(tapePosts.id, tapeId))

  revalidatePath('/community')
  return { success: true as const }
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/community/tape-actions.ts
git commit -m "feat(tape-room): add tape server actions (COR-21)"
```

---

### Task 4: Direct-to-Blob upload token route

**Files:**
- Create: `app/community/tape-room/upload/route.ts`

**Interfaces:**
- Consumes: `requireActiveUser` from `@/lib/community/auth` (Task 1); `handleUpload`, `type HandleUploadBody` from `@vercel/blob/client`.
- Produces: a `POST` Route Handler at `/community/tape-room/upload` that Task 7's client code calls (indirectly, via `@vercel/blob/client`'s `upload()` naming it as `handleUploadUrl`) to authorize uploads.

**Note on privacy:** the client's `upload()` call (Task 7) will pass `access: 'private'`, but per the installed `@vercel/blob` (2.8.0) types, `onBeforeGenerateToken`'s return value cannot itself override or re-declare `access` — only `allowedContentTypes`, `maximumSizeInBytes`, and a few other constraints. The real privacy boundary for tapes is therefore *not* solely "the blob is marked private" — it's that this app never surfaces the blob's public `url` anywhere in its UI or API responses (Task 7 discards it, storing only `pathname`), and playback is always served through the authenticated Route Handler in Task 5, which fetches the content server-side using the app's own Blob credentials. This is the same pattern already used for private script JSON in `lib/workshops/scripts.ts`.

- [ ] **Step 1: Implement the token route**

```typescript
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/community/auth'

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        await requireActiveUser()
        return {
          allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB -- generous for a multi-minute self-tape, still bounded
          addRandomSuffix: true,
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
```

`requireActiveUser()` throwing (unauthenticated or inactive account) is caught by the outer `try`/`catch` and returned as a 400 with the error message, which `@vercel/blob/client`'s `upload()` surfaces as a rejected promise on the caller's side (Task 7 handles this the same way `PostFormDialog` already handles action errors).

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/community/tape-room/upload/route.ts
git commit -m "feat(tape-room): add direct-to-blob upload token route (COR-21)"
```

---

### Task 5: Private video streaming route

**Files:**
- Create: `app/community/tape-room/[tapeId]/video/route.ts`

**Interfaces:**
- Consumes: `auth` from `@/auth`; `getTapeVideoPathname` from `@/lib/community/tape-queries` (Task 2); `get` from `@vercel/blob`.
- Produces: a `GET` Route Handler streaming a tape's video, consumed by `<video src>` in Tasks 7-8.

This route coexists with the existing dynamic route `app/community/[id]/page.tsx`: Next.js App Router resolves the literal `tape-room` path segment before falling back to the `[id]` dynamic segment at the same level, so `/community/tape-room/...` never gets captured by `/community/[id]`. This is standard, long-standing App Router route-matching behavior, unrelated to this repo's pinned-version breaking changes.

Per the Global Constraints note above, this serves the full video on every request rather than honoring `Range` requests — the installed SDK doesn't type a `206` response from `get()`, so this plan does not build on that unverified behavior.

- [ ] **Step 1: Implement the streaming route**

```typescript
import { NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { auth } from '@/auth'
import { getTapeVideoPathname } from '@/lib/community/tape-queries'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tapeId: string }> }
): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 })
  }

  const { tapeId } = await params
  const pathname = await getTapeVideoPathname(tapeId)
  if (!pathname) {
    return new NextResponse(null, { status: 404 })
  }

  const result = await get(pathname, { access: 'private' })
  if (!result || !result.stream) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      'Content-Type': result.blob.contentType || 'video/mp4',
      'Content-Length': String(result.blob.size),
      'Cache-Control': 'private, no-store',
    },
  })
}
```

`session?.user?.id` alone is sufficient here, matching the reasoning already established for `/community` and `/community/[id]`: both login paths in this app refuse a session to any account whose `status !== 'active'`, so a valid session already implies an active member.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/community/tape-room/\[tapeId\]/video/route.ts
git commit -m "feat(tape-room): serve private video through an authenticated route (COR-21)"
```

---

### Task 6: Tape Room tab and board wiring

**Files:**
- Modify: `components/community/channel-tabs.tsx`
- Modify: `components/community/community-shell.tsx`
- Modify: `app/community/page.tsx`
- Create: `components/community/tape-room/tape-card.tsx`

**Interfaces:**
- Consumes: `listTapes` from `@/lib/community/tape-queries` (Task 2); `TapeItem` from `@/lib/community/tape-types` (Task 1).
- Produces: `CommunityShell` now takes a discriminated `view` prop instead of a bare `posts` array, so a fresh reader of either branch can tell at a glance which data belongs to which UI; `TapeCard` component consumed by `CommunityShell`.

- [ ] **Step 1: Add the Tape Room tab to `channel-tabs.tsx`**

In `components/community/channel-tabs.tsx`, add a fifth entry to the `CHANNELS` array (after `general`):

```typescript
  { id: 'tape_room', label: 'Tape Room', description: 'Self-tapes and rehearsal clips with timecoded notes' },
```

No other changes needed in this file — the existing `Link href={ch.id === 'all' ? '/community' : \`/community?channel=${ch.id}\`}` logic and active-tab styling already work for any channel id, including `tape_room`. The `#reader-sos`-specific status-filter row (the second `{activeChannel === 'reader_sos' && ...}` block) is untouched — it only renders for that one channel.

- [ ] **Step 2: Build `TapeCard` in `components/community/tape-room/tape-card.tsx`**

Mirrors `PostCard`'s structure and the same relative-time formatting, but for a tape's shape (title, description excerpt, duration badge, note count instead of comment count):

```tsx
import Link from 'next/link'
import type { TapeItem } from '@/lib/community/tape-types'

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export function TapeCard({ tape }: { tape: TapeItem }) {
  const duration = formatDuration(tape.durationSeconds)

  return (
    <article className="group relative rounded-xl border border-ink-foreground/16 bg-ink-card p-5 transition-all hover:border-ink-foreground/35">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-foreground/55 mb-3">
        <span className="font-semibold text-primary">Tape Room</span>
        <time className="text-ink-foreground/45">{formatRelativeTime(tape.createdAt)}</time>
      </div>

      <Link href={`/community/tape-room/${tape.id}`} className="block focus:outline-hidden">
        <h3 className="font-serif text-lg font-semibold tracking-tight text-ink-foreground transition-colors group-hover:text-blue-200 md:text-xl">
          {tape.title}
        </h3>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-foreground/65">
          {tape.description}
        </p>
      </Link>

      <div className="mt-4 flex items-center justify-between border-t border-ink-foreground/12 pt-3 text-xs text-ink-foreground/55">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-foreground/15 text-xs font-semibold text-ink-foreground">
            {tape.authorName ? tape.authorName.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="font-medium text-ink-foreground/90">{tape.authorName || 'Anonymous Member'}</span>
        </div>

        <div className="flex items-center gap-3">
          {duration && <span>{duration}</span>}
          <span>{tape.notesCount} {tape.notesCount === 1 ? 'note' : 'notes'}</span>
        </div>
      </div>
    </article>
  )
}
```

Note the title hover uses `group-hover:text-blue-200`, matching the fix already applied to `PostCard` (not the old `text-primary`).

- [ ] **Step 3: Change `CommunityShell` to accept a discriminated `view` prop**

In `components/community/community-shell.tsx`, replace the current `posts`-only props and rendering with:

```tsx
import { ChannelTabs } from './channel-tabs'
import { PostCard } from './post-card'
import { PostFormDialog } from './post-form-dialog'
import { TapeCard } from './tape-room/tape-card'
import { TapeFormDialog } from './tape-room/tape-form-dialog'
import type { CommunityPostItem } from '@/lib/community/types'
import type { TapeItem } from '@/lib/community/tape-types'

type CommunityView =
  | { kind: 'posts'; posts: CommunityPostItem[] }
  | { kind: 'tapes'; tapes: TapeItem[] }

export function CommunityShell({ view }: { view: CommunityView }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-ink-foreground/16 pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent font-semibold mb-1">
            Glumački Studio Community
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink-foreground md:text-4xl">
            The Actor Board
          </h1>
          <p className="mt-2 text-sm text-ink-foreground/65 max-w-xl">
            A live collaborative hub to find line-reading partners, discover local castings and crew recommendations, and discuss scene work.
          </p>
        </div>

        <div className="shrink-0">{view.kind === 'posts' ? <PostFormDialog /> : <TapeFormDialog />}</div>
      </div>

      <ChannelTabs />

      <div className="mt-8 space-y-4">
        {view.kind === 'posts' ? (
          view.posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-foreground/5 text-lg text-ink-foreground/60">
                🎭
              </div>
              <h3 className="font-serif text-base font-semibold text-ink-foreground">No posts in this channel yet</h3>
              <p className="mt-1 text-xs text-ink-foreground/55 max-w-sm mx-auto">
                Be the first to post a line-reading request, audition notice, or craft question.
              </p>
              <div className="mt-5">
                <PostFormDialog
                  triggerLabel="Create a Post"
                  triggerClassName="inline-flex items-center gap-1.5 rounded-xl border border-ink-foreground/20 px-3.5 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-foreground/5 transition-colors cursor-pointer"
                />
              </div>
            </div>
          ) : (
            view.posts.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : view.tapes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-foreground/20 bg-ink-card/60 p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-foreground/5 text-lg text-ink-foreground/60">
              🎬
            </div>
            <h3 className="font-serif text-base font-semibold text-ink-foreground">No tapes yet</h3>
            <p className="mt-1 text-xs text-ink-foreground/55 max-w-sm mx-auto">
              Be the first to share a self-tape or rehearsal clip for feedback.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {view.tapes.map((tape) => (
              <TapeCard key={tape.id} tape={tape} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

This is a breaking change to `CommunityShell`'s props — Step 4 below updates its only caller.

- [ ] **Step 4: Update `app/community/page.tsx` to branch on the tape_room channel**

Replace the body of `app/community/page.tsx` from the `listCommunityPosts` call onward:

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { listCommunityPosts } from '@/lib/community/queries'
import { listTapes } from '@/lib/community/tape-queries'
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
        <CommunityShell view={{ kind: 'tapes', tapes }} />
      </main>
    )
  }

  const channel = rawChannel as CommunityChannel | undefined
  const posts = await listCommunityPosts(
    channel && channel !== ('all' as unknown) ? channel : undefined,
    status
  )

  return (
    <main className="flex-1">
      <CommunityShell view={{ kind: 'posts', posts }} />
    </main>
  )
}
```

`rawChannel` is deliberately left as a plain `string | undefined` for the `tape_room` check, *before* casting to `CommunityChannel | undefined`. `tape_room` is not a member of the `CommunityChannel` union (it's a query-string value, not a `community_posts.channel` database value), so comparing an already-narrowed `CommunityChannel | undefined` against the literal `'tape_room'` would fail this repo's `strict: true` TypeScript config with "this comparison appears to be unintentional" (TS2367) — confirmed against `tsconfig.json`. Checking the raw string first, then casting only in the branch where the value is actually used as a `CommunityChannel`, avoids that error entirely.

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: FAIL — `TapeFormDialog` doesn't exist yet (Task 7). This is expected; continue to Task 7 before the final verification of this task. (If you're executing tasks strictly in order and stopping to verify after each one, note this exception here rather than treating it as a broken step — Tasks 6 and 7 are interdependent by design, since `CommunityShell` needs `TapeFormDialog` to exist for `tsc` to pass, and `TapeFormDialog` is naturally where the recording/upload UI belongs.)

- [ ] **Step 6: Commit**

```bash
git add components/community/channel-tabs.tsx components/community/community-shell.tsx components/community/tape-room/tape-card.tsx app/community/page.tsx
git commit -m "feat(tape-room): wire the Tape Room tab into the community board (COR-21)"
```

---

### Task 7: Tape creation — recording, upload, and the composer dialog

**Files:**
- Create: `components/community/tape-room/video-duration.ts`
- Create: `components/community/tape-room/tape-recorder.tsx`
- Create: `components/community/tape-room/tape-form-dialog.tsx`

**Interfaces:**
- Consumes: `createTape` from `@/app/community/tape-actions` (Task 3); `upload` from `@vercel/blob/client`.
- Produces: `getVideoDuration(file: File | Blob): Promise<number | null>` (shared helper); `TapeRecorder` component with props `{ onRecorded: (file: File) => void }`; `TapeFormDialog` component (default export style matches `PostFormDialog` — a trigger button plus a `<dialog>`), which is what Task 6's `CommunityShell` renders.

- [ ] **Step 1: Add the shared duration-reading helper**

Both a picked file and a recorded clip need their duration read the same way — via a hidden `<video>` element's `loadedmetadata` event, since neither a `File` nor a `Blob` exposes duration directly. `components/community/tape-room/video-duration.ts`:

```typescript
export function getVideoDuration(file: File | Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : null
      resolve(duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    video.src = url
  })
}
```

- [ ] **Step 2: Build `TapeRecorder` in `components/community/tape-room/tape-recorder.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

export function TapeRecorder({ onRecorded }: { onRecorded: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [isActive, setIsActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function startCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsActive(true)
    } catch {
      setError('Could not access your camera and microphone. Check your browser permissions.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsActive(false)
    setIsRecording(false)
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current)
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'video/webm'
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const file = new File([blob], `recording-${Date.now()}.${extension}`, { type: mimeType })
      onRecorded(file)
      stopCamera()
    }
    recorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
  }

  function stopRecording() {
    recorderRef.current?.stop()
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-200">{error}</p>
      )}

      {isActive && (
        <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black aspect-video" />
      )}

      <div className="flex gap-2">
        {!isActive && (
          <button
            type="button"
            onClick={startCamera}
            className="rounded-lg border border-ink-foreground/20 bg-ink px-3 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-card transition-colors cursor-pointer"
          >
            Turn on camera
          </button>
        )}
        {isActive && !isRecording && (
          <button
            type="button"
            onClick={startRecording}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors cursor-pointer"
          >
            ● Start recording
          </button>
        )}
        {isRecording && (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-lg bg-ink-foreground/15 px-3 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-foreground/25 transition-colors cursor-pointer"
          >
            ■ Stop recording
          </button>
        )}
        {isActive && !isRecording && (
          <button
            type="button"
            onClick={stopCamera}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-foreground/60 hover:text-ink-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build `TapeFormDialog` in `components/community/tape-room/tape-form-dialog.tsx`**

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { createTape } from '@/app/community/tape-actions'
import { TapeRecorder } from './tape-recorder'
import { getVideoDuration } from './video-duration'

export function TapeFormDialog() {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)

  function open() {
    setTitle('')
    setDescription('')
    setVideoFile(null)
    setError(null)
    dialogRef.current?.showModal()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.')
      return
    }
    if (!videoFile) {
      setError('Attach a video by uploading a file or recording one.')
      return
    }

    setIsUploading(true)
    ;(async () => {
      try {
        const durationSeconds = await getVideoDuration(videoFile)
        const blob = await upload(videoFile.name, videoFile, {
          access: 'private',
          handleUploadUrl: '/community/tape-room/upload',
        })

        startTransition(async () => {
          const res = await createTape({
            title,
            description,
            videoPathname: blob.pathname,
            durationSeconds,
          })
          if (res?.error) {
            setError(res.error)
          } else {
            dialogRef.current?.close()
            if ('tapeId' in res) {
              router.push(`/community/tape-room/${res.tapeId}`)
            } else {
              router.refresh()
            }
          }
        })
      } catch {
        setError('Could not upload the video. Please try again.')
      } finally {
        setIsUploading(false)
      }
    })()
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-xs transition-transform hover:-translate-y-0.5 cursor-pointer"
      >
        + New Tape
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto w-full max-w-lg border-0 bg-transparent p-4 backdrop:bg-black/60 [color-scheme:dark]"
      >
        <div className="w-full rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2">
            <div>
              <p className="text-lg font-semibold text-ink-foreground">New tape</p>
              <p className="mt-1 text-sm text-ink-foreground/60">
                Upload a self-tape or record one right now for peer feedback.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-ink-foreground/45 hover:text-ink-foreground text-xl leading-none p-1 cursor-pointer"
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {error && (
              <p className="rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-200">{error}</p>
            )}

            <label className="flex flex-col gap-1 text-sm">
              Title
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hedda Gabler monologue, take 3"
                className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Description
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's the scene, and what kind of feedback are you looking for?"
                className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm leading-relaxed text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
              />
            </label>

            <div className="flex flex-col gap-2 text-sm">
              <span>Video</span>

              {videoFile ? (
                <div className="flex items-center justify-between rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-xs text-ink-foreground/80">
                  <span className="truncate">{videoFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setVideoFile(null)}
                    className="text-ink-foreground/50 hover:text-ink-foreground cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setVideoFile(file)
                    }}
                    className="w-full text-xs text-ink-foreground/55 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-foreground/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink-foreground hover:file:bg-ink-foreground/20 cursor-pointer"
                  />
                  <p className="text-xs text-ink-foreground/45">or</p>
                  <TapeRecorder onRecorded={setVideoFile} />
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || isUploading}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? 'Uploading…' : isPending ? 'Publishing…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}
```

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors (this resolves Task 6 Step 5's expected failure, since `TapeFormDialog` now exists).

- [ ] **Step 5: Manually verify in the browser**

1. Sign in, go to `/community?channel=tape_room` (or click the new "Tape Room" tab).
2. Click "+ New Tape," fill in title/description, upload a short video file. Confirm it uploads, the dialog closes, and you land on the new tape's detail route (a 404 is expected until Task 8 builds that page — confirm the redirect happens and the `tape_posts` row was created via `pnpm db:studio` or by revisiting `/community?channel=tape_room` and seeing the `TapeCard`).
3. Repeat using "Turn on camera" → "Start recording" → "Stop recording" instead of a file, granting camera/mic permission when prompted.

- [ ] **Step 6: Commit**

```bash
git add components/community/tape-room/video-duration.ts components/community/tape-room/tape-recorder.tsx components/community/tape-room/tape-form-dialog.tsx
git commit -m "feat(tape-room): add recording, upload, and the new-tape dialog (COR-21)"
```

---

### Task 8: Tape detail view — player, timecoded notes, delete

**Files:**
- Create: `components/community/tape-room/delete-tape-dialog.tsx`
- Create: `components/community/tape-room/note-composer.tsx`
- Create: `components/community/tape-room/tape-detail-modal.tsx`
- Create: `app/community/tape-room/[tapeId]/page.tsx`

**Interfaces:**
- Consumes: `getTapeById`, `listNotesForTape` from `@/lib/community/tape-queries` (Task 2); `addTapeNote`, `deleteTape` from `@/app/community/tape-actions` (Task 3); `listTapes` (for the underlying board, same modal-over-board pattern as `app/community/[id]/page.tsx`).
- Produces: `/community/tape-room/[tapeId]` route rendering the board underneath and `TapeDetailModal` on top, matching `PostDetailModal`'s pattern exactly.

- [ ] **Step 1: Build `DeleteTapeDialog` in `components/community/tape-room/delete-tape-dialog.tsx`**

Identical structure to `components/community/delete-post-dialog.tsx`, calling `deleteTape` instead of `deleteCommunityPost`:

```tsx
'use client'

import { useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTape } from '@/app/community/tape-actions'

export function DeleteTapeDialog({ tapeId }: { tapeId: string }) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTape(tapeId)
      dialogRef.current?.close()
      router.push('/community')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
      >
        Delete Tape
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto w-full max-w-sm border-0 bg-transparent p-4 backdrop:bg-black/60 [color-scheme:dark]"
      >
        <div className="w-full rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl">
          <p className="text-lg font-semibold text-ink-foreground">Delete tape</p>
          <p className="mt-1 text-sm text-ink-foreground/60">
            Are you sure you want to delete this tape and all its notes? This action cannot be undone.
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
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-xl bg-red-800 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
```

- [ ] **Step 2: Build `NoteComposer` in `components/community/tape-room/note-composer.tsx`**

Takes the current playback position as a prop (read by the parent from the `<video>` element at the moment the actor opens the composer), plus an optional tag dropdown:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTapeNote } from '@/app/community/tape-actions'
import type { TapeNoteTag } from '@/lib/community/tape-types'

const TAG_OPTIONS: { value: TapeNoteTag; label: string }[] = [
  { value: 'objective_action', label: 'Objective & Action' },
  { value: 'truthfulness_listening', label: 'Truthfulness & Listening' },
  { value: 'vocal_physicality', label: 'Vocal & Physicality' },
  { value: 'framing_eyeline', label: 'Framing & Eyeline' },
]

export function NoteComposer({
  tapeId,
  timestampSeconds,
  onDone,
}: {
  tapeId: string
  timestampSeconds: number
  onDone: () => void
}) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [tag, setTag] = useState<TapeNoteTag | ''>('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const minutes = Math.floor(timestampSeconds / 60)
  const seconds = timestampSeconds % 60
  const formattedTimestamp = `${minutes}:${String(seconds).padStart(2, '0')}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setError(null)

    startTransition(async () => {
      const res = await addTapeNote(tapeId, timestampSeconds, content, tag || null)
      if (res?.error) {
        setError(res.error)
      } else {
        setContent('')
        setTag('')
        router.refresh()
        onDone()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-ink-foreground/16 bg-ink p-3">
      <p className="text-xs font-semibold text-ink-foreground/70">Adding a note at {formattedTimestamp}</p>

      {error && (
        <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-2 text-xs text-red-200">{error}</div>
      )}

      <textarea
        required
        rows={2}
        placeholder="What do you want to point out at this moment?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded-xl border border-ink-foreground/16 bg-ink-card p-3 text-xs leading-relaxed text-ink-foreground placeholder:text-ink-foreground/45 focus:border-ink-foreground/40 focus:outline-none"
      />

      <div className="flex items-center justify-between gap-2">
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value as TapeNoteTag | '')}
          className="rounded-lg border border-ink-foreground/16 bg-ink-card px-2.5 py-1.5 text-xs text-ink-foreground focus:outline-none"
        >
          <option value="">No category</option>
          {TAG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-foreground/60 hover:text-ink-foreground cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isPending ? 'Posting...' : 'Add note'}
          </button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Build `TapeDetailModal` in `components/community/tape-room/tape-detail-modal.tsx`**

Mirrors `PostDetailModal`'s modal shell (same close-on-Escape, close-on-backdrop-click, body-scroll-lock behavior), with a `<video>` player, a notes list where each note's timestamp seeks playback on click, and the "add a note here" control:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeleteTapeDialog } from './delete-tape-dialog'
import { NoteComposer } from './note-composer'
import type { TapeItem, TapeNoteItem, TapeNoteTag } from '@/lib/community/tape-types'

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

const TAG_LABELS: Record<TapeNoteTag, string> = {
  objective_action: 'Objective & Action',
  truthfulness_listening: 'Truthfulness & Listening',
  vocal_physicality: 'Vocal & Physicality',
  framing_eyeline: 'Framing & Eyeline',
}

export function TapeDetailModal({
  tape,
  notes,
  currentUserId,
  isAdmin,
}: {
  tape: TapeItem
  notes: TapeNoteItem[]
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [pendingTimestamp, setPendingTimestamp] = useState(0)

  const canManage = currentUserId === tape.authorId || isAdmin

  const handleClose = () => {
    router.push('/community?channel=tape_room')
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  function openNoteComposer() {
    setPendingTimestamp(Math.floor(videoRef.current?.currentTime ?? 0))
    setIsAddingNote(true)
  }

  function seekTo(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      videoRef.current.play()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs [color-scheme:dark]"
    >
      <div className="relative w-full max-w-3xl rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-ink-foreground/16 pb-3 shrink-0">
          <span className="font-semibold text-xs text-primary">Tape Room</span>
          <button
            type="button"
            onClick={handleClose}
            className="text-ink-foreground/45 hover:text-ink-foreground text-xl leading-none p-1 cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-5 mt-4">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-ink-foreground md:text-3xl">
              {tape.title}
            </h1>

            <div className="mt-3 flex items-center justify-between border-b border-ink-foreground/12 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-foreground/15 text-sm font-semibold text-ink-foreground">
                  {tape.authorName ? tape.authorName.charAt(0).toUpperCase() : '?'}
                </div>
                <span className="font-medium text-xs text-ink-foreground">{tape.authorName || 'Anonymous Member'}</span>
              </div>

              {canManage && <DeleteTapeDialog tapeId={tape.id} />}
            </div>
          </div>

          <video ref={videoRef} controls className="w-full rounded-lg bg-black aspect-video">
            <source src={`/community/tape-room/${tape.id}/video`} />
          </video>

          <p className="text-sm leading-relaxed text-ink-foreground/90">{tape.description}</p>

          <section className="border-t border-ink-foreground/16 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base font-semibold tracking-tight text-ink-foreground">
                Notes ({notes.length})
              </h2>
              {!isAddingNote && (
                <button
                  type="button"
                  onClick={openNoteComposer}
                  className="rounded-lg border border-ink-foreground/20 px-3 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-foreground/5 transition-colors cursor-pointer"
                >
                  Add a note here
                </button>
              )}
            </div>

            {isAddingNote && (
              <NoteComposer tapeId={tape.id} timestampSeconds={pendingTimestamp} onDone={() => setIsAddingNote(false)} />
            )}

            {notes.length === 0 ? (
              <p className="text-xs text-ink-foreground/50 py-2">No notes yet. Be the first to leave feedback.</p>
            ) : (
              <div className="space-y-3 divide-y divide-ink-foreground/12">
                {notes.map((note) => (
                  <div key={note.id} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => seekTo(note.timestampSeconds)}
                        className="rounded bg-ink-foreground/10 px-1.5 py-0.5 font-mono text-ink-foreground hover:bg-ink-foreground/20 cursor-pointer"
                      >
                        {formatTimestamp(note.timestampSeconds)}
                      </button>
                      <span className="font-medium text-ink-foreground">{note.authorName || 'Anonymous Member'}</span>
                      {note.tag && (
                        <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[0.65rem] font-medium text-primary-foreground">
                          {TAG_LABELS[note.tag]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-foreground/85 leading-relaxed pl-1">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-4 pt-3 border-t border-ink-foreground/16 flex justify-end shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Build `app/community/tape-room/[tapeId]/page.tsx`**

Same modal-over-board pattern as `app/community/[id]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { getTapeById, listNotesForTape } from '@/lib/community/tape-queries'
import { listTapes } from '@/lib/community/tape-queries'
import { CommunityShell } from '@/components/community/community-shell'
import { TapeDetailModal } from '@/components/community/tape-room/tape-detail-modal'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tapeId: string }>
}): Promise<Metadata> {
  const { tapeId } = await params
  const tape = await getTapeById(tapeId)

  if (!tape) {
    return { title: 'Tape Not Found — Glumački Studio' }
  }

  return {
    title: `${tape.title} — Tape Room`,
    description: tape.description.slice(0, 160),
  }
}

export default async function TapeDetailPage({
  params,
}: {
  params: Promise<{ tapeId: string }>
}) {
  const session = await auth()
  const { tapeId } = await params

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/community/tape-room/${tapeId}`)
  }

  const [tape, notes, allTapes] = await Promise.all([
    getTapeById(tapeId),
    listNotesForTape(tapeId),
    listTapes(),
  ])

  if (!tape) {
    notFound()
  }

  const isAdmin = (session.user as { role?: string }).role === 'admin'

  return (
    <main className="flex-1 relative">
      <CommunityShell view={{ kind: 'tapes', tapes: allTapes }} />
      <TapeDetailModal tape={tape} notes={notes} currentUserId={session.user.id} isAdmin={isAdmin} />
    </main>
  )
}
```

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 6: Manually verify the full flow in the browser**

1. As one member, create a tape (file upload path). Confirm it now opens the detail modal correctly (Task 7's redirect target exists now).
2. Play the video; confirm it plays back the actual uploaded content (proof the streaming route in Task 5 works end-to-end).
3. Pause partway through, click "Add a note here," submit a note with a tag, and confirm it appears in the list with the correct timestamp and tag label.
4. Add a second note with no tag selected; confirm it displays without a tag badge.
5. Click a note's timestamp; confirm the video seeks to that moment.
6. Log in as a different active member; confirm they can view the tape, play it, and add their own note, but do **not** see a "Delete Tape" button.
7. Log in as an admin (not the tape's author); confirm the "Delete Tape" button appears and works.
8. While logged out (or in a private/incognito window with no session), request `/community/tape-room/<tapeId>/video` directly; confirm it returns a 401 rather than the video content.

- [ ] **Step 7: Commit**

```bash
git add components/community/tape-room/delete-tape-dialog.tsx components/community/tape-room/note-composer.tsx components/community/tape-room/tape-detail-modal.tsx "app/community/tape-room/[tapeId]/page.tsx"
git commit -m "feat(tape-room): add tape detail view with timecoded notes (COR-21)"
```
