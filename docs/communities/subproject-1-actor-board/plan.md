# Community Sub-project 1: The Actor Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational community board for authenticated actors at Glumački Studio, featuring channel-based discussions (`#reader-sos`, `#the-callboard`, `#craft-chat`, `#general`), specialized metadata fields, and threaded replies.

**Linear:** [COR-20](https://linear.app/coral-studio/issue/COR-20/community-sub-project-1-the-actor-board)
**Branch:** `tsemachmizrachi/cor-20-community-sub-project-1-the-actor-board`

**Architecture:** Extend the PostgreSQL/Drizzle schema with `community_posts`, `community_comments`, and `community_attachments`. Expose server actions for post creation, status toggles, and commenting protected by active user authentication. Render a responsive, clean feed with dynamic channel-specific inputs and thread details.

**Tech Stack:** Next.js 16 (App Router, Server Components & Server Actions), NextAuth 5, Drizzle ORM (PostgreSQL), Tailwind CSS v4, Vercel Blob.

**Spec:** [`docs/communities/subproject-1-actor-board/spec.md`](./spec.md)

## Global Constraints

* Only users with `status === 'active'` can view or interact with `/community`; unauthenticated or pending users are redirected.
* Zero external UI component libraries: adhere strictly to existing Tailwind CSS patterns in the studio codebase.
* Never run `npm start` or `yarn start` (dev server managed independently).
* Run `npm run lint` and TypeScript checks (`npx tsc --noEmit`) to verify every step.

---

### Task 1: Community Data Model & Types

**Files:**
- Modify: `lib/database/schema.ts`
- Create: `lib/community/types.ts`

**Interfaces:**
- Produces: `communityPosts`, `communityComments`, `communityAttachments` Drizzle table definitions; `PostWithAuthor`, `ChannelType`, `ReaderStatus`, `CastingType` TypeScript types.

- [ ] **Step 1: Define TypeScript domain types in `lib/community/types.ts`**

```typescript
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
```

- [ ] **Step 2: Add Drizzle tables in `lib/database/schema.ts`**

Add `communityPosts`, `communityComments`, and `communityAttachments` tables to `lib/database/schema.ts` conforming to the spec.

- [ ] **Step 3: Run TypeScript compiler check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Push database schema change**

Run: `pnpm db:push` or `npm run db:push`
Expected: Database schema updated successfully.

---

### Task 2: Community Database Queries & Helpers

**Files:**
- Create: `lib/community/queries.ts`

**Interfaces:**
- Consumes: `db`, `communityPosts`, `communityComments`, `communityAttachments`, `users` from `@/lib/database/schema`
- Produces:
  * `listCommunityPosts(channel?: CommunityChannel, status?: ReaderStatus): Promise<CommunityPostItem[]>`
  * `getCommunityPostById(id: string): Promise<CommunityPostDetail | null>`
  * `listCommentsForPost(postId: string): Promise<CommentWithAuthor[]>`

- [ ] **Step 1: Implement query functions in `lib/community/queries.ts`**

Write typed queries using Drizzle ORM to fetch posts with joined user details and comment counts, order pinned posts first, followed by newest posts.

- [ ] **Step 2: Run TypeScript compiler check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Run lint check**

Run: `npm run lint`
Expected: PASS with 0 errors.

---

### Task 3: Community Server Actions & Security

**Files:**
- Create: `app/community/actions.ts`

**Interfaces:**
- Consumes: `auth()`, `db`, schema tables, `revalidatePath`
- Produces:
  * `createCommunityPost(formData: FormData)`
  * `updateReaderStatus(postId: string, status: ReaderStatus)`
  * `addCommunityComment(postId: string, content: string)`
  * `deleteCommunityPost(postId: string)`

- [ ] **Step 1: Implement `requireActiveUser()` helper**

Ensure current session exists and `session.user.id` has `status === 'active'`.

- [ ] **Step 2: Implement post creation and status update actions**

Extract and validate form fields conditionally based on the channel (`reader_sos`, `callboard`, etc.), insert into database, and call `revalidatePath('/community')`.

- [ ] **Step 3: Implement comment creation and deletion actions**

Insert comment records and revalidate the post detail route `/community/[id]`.

- [ ] **Step 4: Run lint and type check**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS.

---

### Task 4: Navigation Integration & Feed Page Shell

**Files:**
- Modify: `components/site-header.tsx`
- Create: `components/community/channel-tabs.tsx`
- Create: `components/community/post-card.tsx`
- Create: `components/community/community-shell.tsx`
- Create: `app/community/page.tsx`

**Interfaces:**
- Consumes: `listCommunityPosts` from `@/lib/community/queries`
- Produces: Interactive `/community` feed with channel filter tabs and post cards.

- [ ] **Step 1: Update navigation link in `components/site-header.tsx`**

Make `Communities` point to `isLoggedIn ? '/community' : '/#community'`.

- [ ] **Step 2: Build `ChannelTabs` component**

Render pills/tabs for `All`, `#reader-sos`, `#the-callboard`, `#craft-chat`, `#general`, handling URL query parameter updates.

- [ ] **Step 3: Build `PostCard` component**

Render post card with author avatar, role badge, timestamp, channel tag, reader status chip (e.g. `Seeking Reader`), excerpt, and comment count.

- [ ] **Step 4: Build `app/community/page.tsx`**

Enforce auth session redirect, read searchParams (`channel`, `status`), fetch posts via `listCommunityPosts`, and render inside `CommunityShell`.

- [ ] **Step 5: Run lint and type checks**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS.

---

### Task 5: Post Creation Flow (`/community/new`)

**Files:**
- Create: `components/community/post-composer.tsx`
- Create: `app/community/new/page.tsx`

**Interfaces:**
- Consumes: `createCommunityPost` action from `@/app/community/actions`
- Produces: Post creation form with dynamic inputs.

- [ ] **Step 1: Build `PostComposer` component**

Create client component with channel selector dropdown. Conditionally display:
* Date/time picker and rehearsal format (Studio / Online) for `reader_sos`.
* Casting type selection and deadline picker for `callboard`.
* Title input, markdown content textarea, and file attachment input.

- [ ] **Step 2: Build `app/community/new/page.tsx`**

Auth-gated page rendering the `PostComposer` within the studio layout.

- [ ] **Step 3: Run lint and type checks**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS.

---

### Task 6: Post Detail Page (`/community/[id]`) & Discussion Thread

**Files:**
- Create: `components/community/post-detail.tsx`
- Create: `components/community/comment-thread.tsx`
- Create: `components/community/comment-composer.tsx`
- Create: `app/community/[id]/page.tsx`

**Interfaces:**
- Consumes: `getCommunityPostById`, `listCommentsForPost`, `updateReaderStatus`, `addCommunityComment`
- Produces: Comprehensive discussion view for a single post.

- [ ] **Step 1: Build `PostDetail` component**

Render full markdown post body, metadata header, status chips, author action controls (e.g. "Mark as Matched" for reader requests).

- [ ] **Step 2: Build `CommentThread` and `CommentComposer`**

List comments in chronological order with user info and timestamps. Include quick reply composer at the bottom.

- [ ] **Step 3: Build `app/community/[id]/page.tsx`**

Server component loading post details and comments, rendering 404 if not found, with back-link to `/community`.

- [ ] **Step 4: Run end-to-end verification and lint checks**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS with 0 errors.
