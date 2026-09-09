# Specification: Sub-project 3 — Instant Virtual Rehearsal Room

## 1. Overview

Instant Virtual Rehearsal lets two actors jump into a private, low-latency LiveKit video call directly from a `#reader-sos` post, once one of them has been confirmed as the reader — no third-party links (Zoom, Google Meet), no leaving the Community board.

It reuses the LiveKit infrastructure already built for Workshops (COR-18): this sub-project extracts the domain-agnostic parts of that work into a shared module, then builds a second, simpler domain wrapper on top for 1-on-1 reader-sos rooms (both participants always publish; there is no viewer/promotion model here, unlike a group workshop room).

This sub-project touches `#reader-sos` posts specifically — it does not add anything to `#the-callboard`, `#craft-chat`, `#general`, or the Tape Room.

---

## 2. Matching: From "Seeking" to a Confirmed Reader

`community_posts.readerStatus` already tracks `'seeking' | 'matched' | 'closed'`, but nothing today records *which* member is the matched reader — necessary before a private, two-person room can exist.

1. While a post's `readerStatus === 'seeking'`, any other active member — not the post's own author — sees an **"I can read this"** button on the post. Clicking it records an offer (idempotent — clicking twice does nothing new).
2. The post's author sees the list of members who have offered, each shown with their existing reading-session count (§5) as a lightweight signal — e.g. "Jana — 4 sessions read" — to help pick. A **"Confirm as reader"** button next to each offer sets `matchedUserId` and flips `readerStatus` to `'matched'`. This works regardless of the post's current status, so the author can also switch to a different offer directly (overwriting `matchedUserId`) without first reopening the post to `'seeking'`.
3. Reopening: the author can already move a post back to `'seeking'` or `'closed'` via the existing `updateReaderStatus` action. Doing so now also clears `matchedUserId`, so a stale confirmation never lingers once a match is undone.

Offers are tracked in a new table (§4) rather than reusing `community_comments` — an offer is a distinct, structured action ("I'm available to read this"), not a discussion reply, and conflating the two would make it hard to tell offers apart from ordinary comments later.

---

## 3. Opening the Rehearsal Room

Once `readerStatus === 'matched'`, an **"Open Rehearsal Room"** button appears in the post's detail view (`PostDetailModal`), visible only to the two participants — the author and `matchedUserId`. Anyone else viewing the post (including other members, even ones who made an offer that wasn't confirmed) does not see this button.

Clicking it swaps the modal's content in place for an embedded video room, mirroring the existing pattern in `components/workshops/workshop-live-area.tsx` (which swaps a "Go Live" button for `<WorkshopVideoRoom>` in the same spot) — not a separate route or page.

**Sides viewer:** if the post has an attachment (`community_attachments`, already supported on any post today), it renders alongside the video call:
* An image attachment renders directly (`<img>`).
* A PDF attachment renders via `<iframe>`, using the browser's native PDF viewer.
* Any other file type falls back to a plain download link.

There is no line-by-line structure, highlighting, or scroll-sync — that belongs to Workshops' separate, AI-parsed script format (`lib/workshops/scripts.ts`) and is a deliberately different, heavier system not reused here (see §6).

---

## 4. Data Model (Drizzle ORM)

```typescript
// Extends the existing community_posts table (see lib/database/schema.ts)
matchedUserId: text('matched_user_id')
  .references(() => users.id, { onDelete: 'set null' }), // the confirmed reader; null until matched

export const readerOffers = pgTable(
  'reader_offers',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
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
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id')
    .references(() => communityPosts.id, { onDelete: 'set null' }), // nullable -- a reader's karma should survive the original post being deleted later
  readerId: text('reader_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})
```

`rehearsal_sessions` has no `durationSeconds` or completion flag — a row is written the moment the matched reader successfully joins the room (§5), not when the call ends. This is intentionally generous (it counts joins, not verified full completions) rather than adding LiveKit webhook infrastructure this codebase doesn't have yet (see §7).

---

## 5. LiveKit Integration

`lib/workshops/live.ts` today bundles two concerns: generic LiveKit plumbing (env access, `AccessToken`/`RoomServiceClient` construction) and workshop-specific policy (room-per-workshop naming, publish/promotion rules for group calls). This sub-project splits those:

* **New `lib/livekit.ts`** — the domain-agnostic parts: `requiredEnv()`, `getLiveKitServerUrl()`, and a `roomServiceClient()` factory. `lib/workshops/live.ts` is updated to import from here instead of duplicating this logic; its own promote/publish-gating behavior is unchanged.
* **New `lib/community/rehearsal-live.ts`** — the reader-sos-specific wrapper:
  * `mintRehearsalToken(postId, userId, name)` — room name is the post's id; grants `canPublish: true, canSubscribe: true` unconditionally (both participants are always visible/audible; there is no silent-viewer concept in a 1-on-1 room).
  * No equivalent of `isWorkshopLive()`/`promoteParticipant()` — a two-person room has no "who's live" indicator to poll and no one to promote.

**Server action** `getRehearsalToken(postId)` (new file `app/community/rehearsal-actions.ts`):
1. `requireActiveUser()`.
2. Loads the post; requires `channel === 'reader_sos'`, `readerStatus === 'matched'`, and `matchedUserId` is set — otherwise `{ error }`.
3. Requires the caller to be `authorId` or `matchedUserId` — otherwise `{ error: 'Unauthorized' }`, same pattern as `deleteTape`/`updateReaderStatus`.
4. Mints the token via `mintRehearsalToken`.
5. If the caller is specifically `matchedUserId` (the reader, not the author), inserts a `rehearsal_sessions` row crediting them. The author joining does not log a session — the counter tracks *reading for others*, not participating in a call.

---

## 6. Explicitly Out of Scope

Carried over from brainstorming, stated explicitly so the plan doesn't quietly grow past what was agreed:

* **No full session-history page** — `rehearsal_sessions` backs a simple count only (e.g. "Jana — 4 sessions read" wherever her name appears in the offer-confirmation list); there is no dedicated page listing past sessions.
* **No LiveKit webhooks** — session logging happens synchronously in the token-minting action, not via a `/api/livekit/webhook` route. This means a session is credited on join even if the call is abandoned seconds later; acceptable for a lightweight karma signal, not attempted to be made precise.
* **No structured/synced script viewer** — the sides viewer is a plain attachment renderer (§3), not an integration with Workshops' AI-parsed script format.
* **No re-offering/renegotiation UI** beyond the existing reopen-to-`'seeking'` path (§2.3) — there's no "withdraw my offer," no notification when an offer is confirmed or passed over.
* **No notifications** of any kind (an offer being made, a match being confirmed, a room opening) — matches the same decision already made for the Tape Room.

---

## 7. Verification & Testing

No test suite is configured in this repo (per `CLAUDE.md`); verification follows the same pattern used for sub-projects 1 and 2:
* `npx tsc --noEmit` and manual browser verification after each implementation step.
* Manual checks to cover: offering to read as a non-author member, confirming an offer as the author (status flips to matched, `matchedUserId` set), the room button appearing only to the two participants, joining the room from both accounts and seeing both video feeds publish, the sides attachment rendering next to the call, a reader's session count incrementing after joining (and not incrementing for the author), reopening a matched post back to seeking and confirming `matchedUserId` clears and old offers no longer show a stale confirmed state.
