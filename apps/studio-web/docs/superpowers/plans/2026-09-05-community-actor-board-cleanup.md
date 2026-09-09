# Community Actor Board Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three concrete issues found in code review of the COR-20 "Actor Board" community feature (dead code left over from an earlier UI iteration, unvalidated file uploads, and a spec/implementation mismatch on Markdown) without changing the feature's behavior otherwise.

**Architecture:** No new subsystems. Task 1 removes components superseded by the modal-dialog refactor. Task 2 adds a validation step inside the existing `createCommunityPost` server action, before the existing `put()` call. Task 3 corrects prose in the spec to match what the renderer actually does (plain text, not Markdown).

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Vercel Blob (`@vercel/blob`).

**Spec:** [`docs/communities/subproject-1-actor-board/spec.md`](../../communities/subproject-1-actor-board/spec.md)

## Global Constraints

* Zero external UI component libraries: adhere strictly to existing Tailwind CSS patterns in the studio codebase.
* Never run `npm start` or `yarn start` (dev server managed independently).
* Run `pnpm lint` and `npx tsc --noEmit` to verify every step — no test suite is configured in this repo (per `CLAUDE.md`).
* Decisions already made and out of scope for this plan: attachments stay on `access: 'public'` Blob storage (no auth-gated download route); `community_posts`/`community_comments` cascade-delete on user removal is left as-is; free-text search is deferred.

---

### Task 1: Remove dead components from the modal-dialog refactor

**Files:**
- Delete: `components/community/post-composer.tsx`
- Delete: `components/community/post-detail.tsx`
- Delete: `components/community/comment-thread.tsx`
- Modify: `components/community/community-shell.tsx`
- Modify: `app/community/page.tsx`
- Modify: `app/community/[id]/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CommunityShell` no longer accepts a `currentChannel` prop (it never read it — `components/community/channel-tabs.tsx` already derives the active channel from `useSearchParams()` itself).

- [ ] **Step 1: Confirm nothing else references the three dead files**

Run:
```bash
grep -rn "post-composer\|PostComposer\|comment-thread\|CommentThread\b" --include="*.tsx" --include="*.ts" . | grep -v node_modules
grep -rn "components/community/post-detail'" --include="*.tsx" . | grep -v node_modules
```
Expected: the only hits are each file's own self-reference (its own `export function` line). If anything else references them, stop and re-investigate before deleting — this plan assumes they are fully unused, as verified during review.

- [ ] **Step 2: Delete the three unused files**

```bash
git rm components/community/post-composer.tsx components/community/post-detail.tsx components/community/comment-thread.tsx
```

- [ ] **Step 3: Remove the unused `currentChannel` prop from `CommunityShell`**

In `components/community/community-shell.tsx`, change:

```typescript
export function CommunityShell({
  posts,
}: {
  posts: CommunityPostItem[]
  currentChannel: string
}) {
```

to:

```typescript
export function CommunityShell({
  posts,
}: {
  posts: CommunityPostItem[]
}) {
```

- [ ] **Step 4: Remove the now-invalid `currentChannel` props passed by callers**

In `app/community/page.tsx`, change:

```typescript
  return (
    <main className="flex-1">
      <CommunityShell posts={posts} currentChannel={channel || 'all'} />
    </main>
  )
```

to:

```typescript
  return (
    <main className="flex-1">
      <CommunityShell posts={posts} />
    </main>
  )
```

Leave the `channel`/`status` local variables in that file untouched — they're still consumed by the `listCommunityPosts(channel, status)` call a few lines above; only the `<CommunityShell>` call changes.

In `app/community/[id]/page.tsx`, change:

```typescript
      <CommunityShell posts={boardPosts} currentChannel={post.channel} />
```

to:

```typescript
      <CommunityShell posts={boardPosts} />
```

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: PASS with 0 errors (no unused-variable warnings on `currentChannel`).

- [ ] **Step 6: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 7: Manually verify in the browser**

Start the dev server (or use the one already running), sign in, and:
1. Visit `/community` — the board, channel tabs, and "+ New Post" dialog should work exactly as before.
2. Click into a post — the detail modal should open over the board as before.
3. Confirm no console errors about missing components.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore(community): remove dead code from pre-modal iteration"
```

---

### Task 2: Validate attachments server-side before upload

**Files:**
- Modify: `app/community/actions.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `createCommunityPost` now rejects oversized or disallowed-type files instead of uploading them silently; a rejected file is skipped (post creation still succeeds) with a warning logged server-side, matching the existing per-file `try/catch` pattern one block below it.

**Context:** the composer's `<input type="file" accept="image/*,.pdf">` (`components/community/post-form-dialog.tsx:316`) is a client-side hint only, and the server action currently does not check file type or size at all before calling `put()` with `access: 'public'`. This task adds the missing server-side check; it does **not** change Blob access mode or add an authenticated download route (decided out of scope above).

- [ ] **Step 1: Add validation constants and a helper above `createCommunityPost` in `app/community/actions.ts`**

```typescript
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

function isAllowedAttachment(file: File): boolean {
  return ALLOWED_ATTACHMENT_TYPES.has(file.type) && file.size > 0 && file.size <= MAX_ATTACHMENT_BYTES
}
```

- [ ] **Step 2: Use the helper in the attachment upload loop**

In `app/community/actions.ts`, change:

```typescript
  // Handle uploaded attachments if present
  const files = formData.getAll('attachments')
  for (const item of files) {
    if (item instanceof File && item.size > 0) {
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
        console.error('Failed to upload community attachment to Vercel Blob:', err)
      }
    }
  }
```

to:

```typescript
  // Handle uploaded attachments if present
  const files = formData.getAll('attachments')
  for (const item of files) {
    if (!(item instanceof File) || item.size === 0) continue

    if (!isAllowedAttachment(item)) {
      console.error(
        `Rejected community attachment "${item.name}": type=${item.type} size=${item.size} (limit ${MAX_ATTACHMENT_BYTES} bytes, allowed types: ${[...ALLOWED_ATTACHMENT_TYPES].join(', ')})`
      )
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
      console.error('Failed to upload community attachment to Vercel Blob:', err)
    }
  }
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS with 0 errors.

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Manually verify in the browser**

1. Create a post attaching a `.jpg` or `.pdf` under 10 MB — it should upload and appear in the post detail's Attachments section, same as before.
2. Create a post attaching a disallowed file (e.g. rename any file to `.txt`, or pick one over 10 MB) — post creation should still succeed, but the attachment should be silently skipped (not appear in the Attachments section). Check the terminal running the dev server for the `Rejected community attachment` log line.

- [ ] **Step 6: Commit**

```bash
git add app/community/actions.ts
git commit -m "fix(community): validate attachment type and size server-side"
```

---

### Task 3: Correct the Markdown/plain-text mismatch in the spec

**Files:**
- Modify: `docs/communities/subproject-1-actor-board/spec.md`

**Interfaces:** none — documentation only, no code paths change. This task exists because the spec currently describes behavior (Markdown rendering, markdown sanitization) that was never implemented — `components/community/post-detail-modal.tsx:279-281` and `components/community/post-card.tsx:131-133` render `post.content` as plain escaped text with `whitespace-pre-wrap`, which is what actually ships. Rather than build a Markdown pipeline (a new dependency plus a sanitization surface) as part of a cleanup pass, this task brings the spec in line with the shipped behavior; Markdown rendering can be proposed later as its own scoped feature if actors ask for it.

- [ ] **Step 1: Update the data model comment**

In `docs/communities/subproject-1-actor-board/spec.md`, in the section 4 code sample, change:

```typescript
  content: text('content').notNull(), // Markdown text
```

to:

```typescript
  content: text('content').notNull(), // Plain text (rendered with whitespace-pre-wrap, not parsed as Markdown)
```

- [ ] **Step 2: Update the overview and composer prose**

In `docs/communities/subproject-1-actor-board/spec.md`, section 1, change:

```
The Actor Board is a dedicated community platform for authenticated members of Glumački Studio. It provides an organized channel-based feed designed around the real, practical needs of working actors: finding scene/line-reading partners quickly, sharing audition opportunities and casting intel, discussing scene technique, and studio announcements.
```

Leave this paragraph as-is (it doesn't mention Markdown). In section 5.2, change:

```
* `post-composer.tsx`: Dynamic form supporting markdown and file attachments.
```

to:

```
* `post-form-dialog.tsx`: Dynamic modal form supporting plain-text content and file attachments (channel-specific fields shown conditionally).
```

(This also fixes a stale filename — the composer shipped as a modal dialog, `post-form-dialog.tsx`, not the standalone `post-composer.tsx` the original spec named, which Task 1 deletes.)

In section 5.2, also change:

```
* `post-detail.tsx`: Single post view with author actions (Edit, Delete, Change Status).
```

to:

```
* `post-detail-modal.tsx`: Post detail rendered as a modal over the board, with author/admin actions (Delete, Change Status). There is no Edit action in the current implementation.
```

- [ ] **Step 3: Update the server actions section**

In `docs/communities/subproject-1-actor-board/spec.md`, section 6, change:

```
* `createPost(formData)`: Validates input, sanitizes markdown, uploads attachments to Vercel Blob, inserts records, and revalidates `/community`.
```

to:

```
* `createCommunityPost(formData)`: Validates input, validates attachment type/size, uploads accepted attachments to Vercel Blob (`access: 'public'`), inserts records, and revalidates `/community`.
```

(This also fixes the function name — the shipped action is `createCommunityPost`, not `createPost`.)

- [ ] **Step 4: Commit**

```bash
git add docs/communities/subproject-1-actor-board/spec.md
git commit -m "docs(community): correct spec to match shipped plain-text behavior"
```

---

## Explicitly out of scope (decided during planning, not bugs to fix here)

* **Attachment privacy model** — attachments stay `access: 'public'` on Vercel Blob. Only validation (Task 2) was added; no authenticated download route.
* **Cascade-delete on user removal** — `community_posts`/`community_comments` keep `onDelete: 'cascade'`. No schema migration in this plan.
* **Free-text search** — mentioned in the original spec's route description but never built; deferred.
* **Read-access gating for pending users** — investigated during review and found to be a non-issue: `lib/verifyCredentials.ts:21-23` and `auth.ts:40-42` both refuse to grant a session at all to any `status !== 'active'` user, so `/community`'s existing `session?.user?.id` check already fully satisfies the spec's access requirement. No change needed.
