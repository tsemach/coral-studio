# Specification: Sub-project 1 — The Actor Board

## 1. Overview
The Actor Board is a dedicated community platform for authenticated members of Glumački Studio. It provides an organized channel-based feed designed around the real, practical needs of working actors: finding scene/line-reading partners quickly, sharing audition opportunities and casting intel, discussing scene technique, and studio announcements.

---

## 2. Navigation & Access Control

### 2.1 Navigation Bar Updates
* In `components/site-header.tsx`:
  * For unauthenticated visitors: `Communities` links to `/#community` (landing page section).
  * For authenticated active members: `Communities` links to `/community`.
* If an unauthenticated user navigates directly to `/community`, Next.js redirects to `/login?callbackUrl=/community`.
* Only users with `status === 'active'` may post, reply, or upload attachments. Users with `pending_approval` or `pending_email` cannot access the community.

---

## 3. Channels & Post Types

The Actor Board is organized into four core channels:

### 3.1 `#reader-sos` (Scene Partner & Line-Reading)
* **Goal:** Urgent and planned requests for scene rehearsal / audition line reading.
* **Specialized Fields:**
  * `rehearsalAt` (timestamp): Target date/time for reading lines.
  * `rehearsalFormat` (`'studio' | 'online'`): In-person at Glumački Studio or over video call.
  * `sceneDetails` (text): Scene character, length/pages, and style (e.g., "2 pages, fast dialogue, ~15 mins").
  * `readerStatus` (`'seeking' | 'matched' | 'closed'`):
    * Defaults to `'seeking'`.
    * Post author or admin can click "Mark as Matched" or "Close Request".
* **Visual Presentation:** Displayed with high-visibility badges (e.g. amber `Seeking Reader`, green `Matched`, gray `Closed`).

### 3.2 `#the-callboard` (Auditions & Local Casting)
* **Goal:** Casting calls, student film auditions (FDU, BK, etc.), theatre roles, and vetted industry recommendations (photographers, coaches).
* **Specialized Fields:**
  * `castingType` (`'student_film' | 'theatre' | 'feature' | 'commercial' | 'crew_rec'`): Type of casting opportunity.
  * `deadlineAt` (timestamp): Audition submission or self-tape deadline.
* **Visual Presentation:** Blue badge displaying casting type and countdown/date to deadline.

### 3.3 `#craft-chat` (Acting Technique & Scene Study)
* **Goal:** Discussions on acting methods (Meisner, Chekhov, Strasberg), script analysis, audition prep tips, and workshop takeaways.
* **Fields:** Standard Title + Markdown Body + Attachments.

### 3.4 `#general` (Studio Announcements & Social)
* **Goal:** Studio news, social gatherings, workshop wrap-ups, and general conversation.
* **Special permissions:** Admins can pin posts (`isPinned = true`) to appear at the top of the feed.

---

## 4. Data Model (Drizzle ORM)

```typescript
// 1. Community Posts
export const communityPosts = pgTable('community_posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  channel: text('channel', {
    enum: ['reader_sos', 'callboard', 'craft_chat', 'general'],
  }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(), // Markdown text
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Channel-specific fields
  readerStatus: text('reader_status', {
    enum: ['seeking', 'matched', 'closed'],
  }).default('seeking'),
  rehearsalAt: timestamp('rehearsal_at', { mode: 'date' }),
  rehearsalFormat: text('rehearsal_format', { enum: ['studio', 'online'] }),
  sceneDetails: text('scene_details'),

  castingType: text('casting_type', {
    enum: ['student_film', 'theatre', 'feature', 'commercial', 'crew_rec'],
  }),
  deadlineAt: timestamp('deadline_at', { mode: 'date' }),

  isPinned: boolean('is_pinned').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
})

// 2. Community Comments
export const communityComments = pgTable('community_comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('postId')
    .notNull()
    .references(() => communityPosts.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

// 3. Attachments (Images, PDFs, sides)
export const communityAttachments = pgTable('community_attachments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id').references(() => communityPosts.id, { onDelete: 'cascade' }),
  commentId: text('comment_id').references(() => communityComments.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})
```

---

## 5. UI & Component Architecture

### 5.1 Route Structure
* `/community`: Main feed with channel tabs, active status filters, search, and list of post cards.
* `/community/new`: Composer page (or slide-over dialog) with channel dropdown that conditionally displays `#reader-sos` and `#the-callboard` inputs.
* `/community/[id]`: Post detail page with full formatted body, attachment previews/downloads, author status controls, and reply thread.

### 5.2 Components (`components/community/`)
* `community-shell.tsx`: Primary shell matching Glumački Studio's warm, minimalist aesthetic.
* `channel-tabs.tsx`: Tab navigation (`All`, `Reader SOS`, `The Callboard`, `Craft Chat`, `General`) with unread/active counters.
* `post-card.tsx`: Card summary showing author avatar, role/badge, timestamp, channel tag, status chip, title, excerpt, and comment count.
* `post-composer.tsx`: Dynamic form supporting markdown and file attachments.
* `post-detail.tsx`: Single post view with author actions (Edit, Delete, Change Status).
* `comment-thread.tsx` & `comment-composer.tsx`: Chronological comments with markdown rendering.

---

## 6. Server Actions & Security (`app/community/actions.ts`)

* `requireActiveUser()`: Verifies authenticated user session and `status === 'active'`.
* `createPost(formData)`: Validates input, sanitizes markdown, uploads attachments to Vercel Blob, inserts records, and revalidates `/community`.
* `updatePostStatus(postId, newStatus)`: Author-only permission to toggle reader request status.
* `deletePost(postId)`: Author-only or Admin permission.
* `addComment(postId, content)`: Validates content and saves reply.

---

## 7. Verification & Testing
* Unit/integration tests for server actions:
  * Access gating (unauthenticated users blocked, pending users blocked).
  * Post creation with and without channel-specific metadata.
  * Status updates restricted to author or admin.
  * Cascade deletion of comments and attachments on post removal.
* E2E browser verification with Playwright:
  * Navigating from header as logged-in vs logged-out.
  * Filtering by channel.
  * Creating a `#reader-sos` post and marking it matched.
