# Specification: Sub-project 2 — The Tape Room

## 1. Overview

The Tape Room is a video self-tape and rehearsal-clip review space for authenticated, active Glumački Studio members. An actor uploads or records a clip (a monologue, an audition self-tape, a rehearsal moment) and other members leave feedback pinned to specific moments in the video, optionally tagged by craft dimension.

It lives inside the existing Actor Board (`/community`) as a fifth channel tab, not as a separate page or nav item — same board, same tab row (`All`, `#reader-sos`, `#the-callboard`, `#craft-chat`, `#general`, now also `Tape Room`). A tape is a structurally different kind of post than a text post (it has a video and timestamped notes instead of a body and flat comments), so it is backed by its own tables and its own detail view, even though it's reached through the same page and tab row as everything else.

---

## 2. Navigation & Access Control

* The `Tape Room` tab is added to `components/community/channel-tabs.tsx` alongside the existing four channels, linking to `/community?channel=tape_room`.
* `app/community/page.tsx` branches on `channel === 'tape_room'`: instead of calling `listCommunityPosts()` and rendering `PostCard`s, it calls `listTapes()` (new, see §4) and renders `TapeCard`s in the same feed area.
* Access control is unchanged from the Actor Board: `session?.user?.id` gates the page (redirect to `/login?callbackUrl=/community` if absent), and `requireActiveUser()` gates every write action. As established during COR-20's review, both login paths (`lib/verifyCredentials.ts`, `auth.ts`'s OAuth `signIn` callback) already refuse a session to anyone whose `status !== 'active'`, so no separate status check is needed at the page level here either.
* Visibility is intentionally flat: **any active studio member can view and comment on any tape.** There is no "mentors & alumni only" tier — the app has no such role today, and introducing one was explicitly decided against during brainstorming in favor of reusing the same audience as the rest of the Actor Board.

---

## 3. Uploading and Recording a Tape

A member creates a tape via a `TapeFormDialog` (same native-`<dialog>` modal pattern as `PostFormDialog`), reached from a "+ New Tape" button on the Tape Room tab. The dialog offers **both** of the following, side by side — recording does not replace uploading:

1. **Pick a file** — a standard file input (`accept="video/*"`), for a clip the actor already has.
2. **Record now** — a "Start Recording" button that calls `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`, previews the live camera feed, and uses the browser's `MediaRecorder` API to capture it to a file when the actor clicks "Stop." The recorded clip then sits in the same "attached file" slot a picked file would — there's one clip attached to the post either way, sourced either by file picker or by recording.

Alongside the video, the composer collects:
* **Title** (required) — e.g. "Hedda Gabler monologue, take 3."
* **Description** (required) — what the scene/moment is and what kind of feedback the actor wants, matching the spirit of the existing channels' context fields.

**Upload mechanism:** because self-tapes can run several minutes and easily exceed the size of the images/PDFs the Actor Board already handles, the video is uploaded **directly from the browser to Vercel Blob** via `@vercel/blob/client`'s `upload()`, not through a Server Action. This requires a small token-issuing Route Handler (e.g. `app/community/tape-room/upload/route.ts`) that `@vercel/blob/client` calls automatically as part of `upload()`'s `handleUploadUrl` flow; that route must call `requireActiveUser()` before issuing a token, so uploads are gated exactly like every other write in this app. This sidesteps Server Actions' and Vercel Functions' request-body-size limits entirely — the file goes straight from the actor's browser to Blob storage.

**Storage privacy:** tapes are uploaded with `access: 'private'` (unlike the Actor Board's `access: 'public'` image/PDF attachments). This is a deliberate difference, not an inconsistency: the whole reason self-hosting was chosen over unlisted YouTube/Vimeo links (see brainstorming) was that tapes should be genuinely restricted to studio members, not merely "public but hard to guess." A private blob has no directly browsable URL — playback is served through an authenticated route (§5).

---

## 4. Data Model (Drizzle ORM)

Two new tables, following the naming convention `community_posts`/`community_comments` already established for sub-project 1, but with their own `tape_` prefix since the shape is unrelated:

```typescript
export const tapePosts = pgTable('tape_posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  videoPathname: text('video_pathname').notNull(), // Blob pathname, not a public URL -- resolved server-side via get()
  durationSeconds: integer('duration_seconds'), // populated client-side from the recorded/picked file's metadata; nullable since it isn't always readable before upload completes
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const tapeNotes = pgTable('tape_notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tapeId: text('tape_id')
    .notNull()
    .references(() => tapePosts.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  timestampSeconds: integer('timestamp_seconds').notNull(), // the moment in the video this note is pinned to
  tag: text('tag', {
    enum: ['objective_action', 'truthfulness_listening', 'vocal_physicality', 'framing_eyeline'],
  }), // nullable -- tagging a note by craft dimension is optional, per brainstorming
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})
```

No `tape_attachments` table — a tape post has exactly one video, referenced directly by `videoPathname`, unlike the Actor Board's posts which can carry zero or more attachments.

---

## 5. Serving Private Video

Because tapes are private Blob objects, they cannot be linked to directly from a `<video src>` the way public attachments are. A Route Handler (e.g. `app/community/tape-room/[tapeId]/video/route.ts`) serves playback. Note this sits alongside the existing `app/community/[id]/page.tsx` dynamic route: Next.js App Router resolves the literal `tape-room` segment before falling back to the `[id]` dynamic segment at the same level, so the two coexist without conflict (standard, long-standing App Router route-matching behavior, unaffected by this project's pinned-version breaking changes, which are unrelated to file-based route precedence).

1. Calls `auth()`; returns 401 if there's no session (this also covers the "must be active" requirement, per §2's reasoning).
2. Looks up the `tapePosts` row for `tapeId`; returns 404 if missing.
3. Calls `@vercel/blob`'s `get()` with the stored `videoPathname` and streams the result back as the response body, forwarding the request's `Range` header so the browser's `<video>` element can seek without downloading the whole file.
4. `TapeCard` and `TapeDetailModal` point their `<video>` elements at this route (`/community/tape-room/${tape.id}/video`), never at a raw Blob URL.

---

## 6. Watching a Tape and Leaving Timecoded Notes

`TapeDetailModal` (opened the same way `PostDetailModal` is — clicking a `TapeCard` navigates to `/community/tape-room/${tape.id}`, rendered as a modal over the board) shows:

* The video player (native `<video controls>`, pointed at the streaming route above) alongside the tape's title/description/author.
* A list of existing notes below or beside the player, each showing: author, optional craft tag, timestamp (formatted as `m:ss`), and the note text. Clicking a note's timestamp seeks the video player to that second (`videoRef.current.currentTime = note.timestampSeconds`).
* An "Add a note here" control near the player that captures the video's *current playback position* (`videoRef.current.currentTime`, rounded to the nearest second) at the moment the actor clicks it, opens a small composer (text + optional tag dropdown), and on submit calls `addTapeNote(tapeId, timestampSeconds, content, tag)`.

Any active member — not just the tape's author — can add notes, matching the Actor Board's comment model. The tape's author (or an admin) can delete the tape entirely (`deleteTape`), same author-or-admin pattern as `deleteCommunityPost`.

---

## 7. Server Actions & Security (`app/community/tape-actions.ts`)

* `requireActiveUser()` — currently defined inline in `app/community/actions.ts`. Since `app/community/tape-actions.ts` needs the identical check, it is extracted to `lib/community/auth.ts` and imported by both action files, rather than duplicated.
* `createTape(formData)` — validates `title`/`description` are present and the video was actually uploaded (a `videoPathname` was supplied by the client after its direct-to-Blob upload succeeded), inserts the `tapePosts` row, revalidates `/community?channel=tape_room`.
* `addTapeNote(tapeId, timestampSeconds, content, tag?)` — validates `content` is non-empty, `timestampSeconds` is a non-negative integer, and `tag` (if present) is one of the four valid values; inserts the row; revalidates the tape's detail route.
* `deleteTape(tapeId)` — author-or-admin only, same permission check as `deleteCommunityPost`; deletes the `tapePosts` row (cascades to `tapeNotes`); does **not** delete the underlying Blob object as part of this spec (cleanup of orphaned Blob objects on delete is explicitly deferred, see §8).

---

## 8. Explicitly Out of Scope

Carried over from brainstorming, stated explicitly so the plan doesn't quietly grow past what was agreed:

* **No editing/trimming** of a video after it's recorded or uploaded.
* **No notifications** when a member receives a new note on their tape.
* **No status system** on tapes or notes (no "resolved," no "addressed" — notes are just feedback, not a request being fulfilled, unlike `#reader-sos`).
* **No Blob cleanup on delete** — deleting a tape removes the database rows but not the underlying video file from storage. Acceptable for an initial version; worth a follow-up if storage costs become a concern.
* **No mentor/alumni visibility tier** — every tape is visible to every active member; there is no narrower audience option.

---

## 9. Verification & Testing

No test suite is configured in this repo (per `CLAUDE.md`); verification follows the same pattern used for sub-project 1:
* `npx tsc --noEmit` and manual browser verification after each implementation step.
* Manual checks to cover: uploading a picked file, recording via camera, playing back a tape as a different logged-in member, adding a timestamped note and confirming it jumps playback correctly on click, adding a tagged vs. untagged note, deleting a tape as its author and as an admin, and confirming a non-member (logged out) cannot reach the video streaming route directly.
