# Mobile App Workshops Writes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the mobile Workshops tab from read-only into read/write — create/edit workshops, manage members, schedule/cancel rehearsals, and leave a workshop — mirroring `apps/studio-web/app/workshops/actions.ts` exactly.

**Architecture:** Same additive-only pattern as every prior mobile plan: new route files under `apps/studio-web/app/api/mobile/workshops/*`, gated by `getMobileUser`/CORS, that **reimplement** each Server Action's DB-write logic (the actions authenticate via `auth()`'s cookie session, which a mobile bearer-token request never carries, so they can't be called directly). New `packages/api-client` methods, new mobile screens using `apps/mobile-app/lib/theme.ts`.

**Tech Stack:** Same as every prior mobile plan (Next.js route handlers + Drizzle on studio-web, Expo Router + React Query on mobile).

**Spec:** `docs/superpowers/specs/2026-09-09-mobile-app-phase-2-design.md`

## Global Constraints

- No existing `studio-web` file's *behavior* changes. Every new route is additive; where a route mirrors an existing Server Action, the action's validation/business rules are reimplemented from reading the actual action (cited below per task), never guessed.
- Every new route uses `getMobileUser`/`isAdminUser` from `lib/mobile-auth.ts` and is wrapped in `withMobileCors`/exports `OPTIONS = mobileCorsPreflight` from `lib/mobile-cors.ts` (both already exist and work — every route in this plan must use them from the start, unlike earlier plans where this was retrofitted).
- Pure, auth-independent utilities are imported directly, not reimplemented: `isValidEmail` from `lib/validation.ts`; `getValidAccessToken`/`upsertRehearsalEvent`/`deleteRehearsalEvent` from `lib/google/calendar.ts` (these take an access token / ids as parameters, not `auth()` — safe to call as-is).
- `lib/mobile-auth.ts` and `lib/mobile-cors.ts` are *our* new infrastructure (not pre-existing web files) — safe to keep extending if needed, though this plan doesn't need to.
- No i18n on any new mobile route — English-only, matching every prior plan.
- Testing: no new test framework on studio-web (new routes verified via curl). `packages/api-client`'s new methods get `node:test` coverage. Mobile screens verified manually via `pnpm --filter mobile-app web` + `agent-browser` screenshots.
- A mobile JSON request body accepts `members` as a real JSON array (`{ userId, type, part }[]`) rather than the web action's stringified-JSON-inside-FormData encoding — a protocol adaptation, not a validation-rule change; the re-validation logic (active-status re-check, excluding the caller's own id, `onConflictDoNothing`) is identical to `insertValidatedMembers()`.

---

### Task 1: Create/update workshop routes + supporting read routes

**Files:**
- Create: `apps/studio-web/lib/workshops/mobile-write-helpers.ts`
- Create: `apps/studio-web/app/api/mobile/workshops/route.ts` (add `POST` alongside the existing `GET` from a prior plan)
- Create: `apps/studio-web/app/api/mobile/workshops/[id]/route.ts` (add `PATCH` alongside the existing `GET`)
- Create: `apps/studio-web/app/api/mobile/scripts/route.ts`
- Create: `apps/studio-web/app/api/mobile/users/active/route.ts`

**Interfaces:**
- Consumes: `getMobileUser`, `isAdminUser` (`lib/mobile-auth.ts`); `mobileCorsPreflight`, `withMobileCors` (`lib/mobile-cors.ts`); `getWorkshopDetail`, `isWorkshopMember`, `listActiveUsers` (`lib/workshops/queries.ts`); `listAvailableScripts` (`lib/workshops/scripts.ts`); `WorkshopDetail`, `ScriptSummary`, `AddableUser` (`@coral-studio/types`).
- Produces: `resolveScriptSlugForMobile(raw: string | null | undefined): Promise<string | null>`, `isDraftMember(value: unknown): value is DraftMember`, `insertValidatedMembersForMobile(workshopId: string, members: DraftMember[], excludeUserId: string): Promise<void>`, `type DraftMember = { userId: string; type: 'actor' | 'viewer'; part: string }` — all from `mobile-write-helpers.ts`, consumed by Task 1's own routes and Task 2's member routes. `POST /api/mobile/workshops` → `WorkshopDetail` (201). `PATCH /api/mobile/workshops/:id` → `WorkshopDetail`. `GET /api/mobile/scripts` → `ScriptSummary[]`. `GET /api/mobile/users/active` → `AddableUser[]`.

- [ ] **Step 1: Write the shared write-helpers file**

Mirrors `resolveScriptSlug()` and `insertValidatedMembers()` from `apps/studio-web/app/workshops/actions.ts:76-118` — those aren't exported (a `'use server'` file's private helpers), so this is a from-scratch port, not an import.

Create `apps/studio-web/lib/workshops/mobile-write-helpers.ts`:

```ts
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users, workshopMembers } from '@/lib/database/schema'
import { listAvailableScripts } from '@/lib/workshops/scripts'

export type DraftMember = { userId: string; type: 'actor' | 'viewer'; part: string }

export function isDraftMember(value: unknown): value is DraftMember {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.userId === 'string' &&
    (candidate.type === 'actor' || candidate.type === 'viewer') &&
    typeof candidate.part === 'string'
  )
}

// Mirrors resolveScriptSlug() in app/workshops/actions.ts -- '' / null /
// undefined means "no script."
export async function resolveScriptSlugForMobile(raw: string | null | undefined): Promise<string | null> {
  const scriptSlug = (raw ?? '').trim()
  if (!scriptSlug) return null

  const available = await listAvailableScripts()
  if (!available.some((script) => script.slug === scriptSlug)) {
    throw new Error('Unknown script.')
  }
  return scriptSlug
}

// Mirrors insertValidatedMembers() in app/workshops/actions.ts. Re-validates
// against the DB (active status) -- a JSON body is as directly postable as
// a Server Action's FormData, so the same re-check applies.
export async function insertValidatedMembersForMobile(
  workshopId: string,
  draftMembers: DraftMember[],
  excludeUserId: string
): Promise<void> {
  const filtered = draftMembers.filter((member) => member.userId !== excludeUserId)
  if (filtered.length === 0) return

  const requestedIds = filtered.map((member) => member.userId)
  const validIds = new Set(
    (
      await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, requestedIds), eq(users.status, 'active')))
    ).map((row) => row.id)
  )

  const rows = filtered
    .filter((member) => validIds.has(member.userId))
    .map((member) => ({
      workshopId,
      userId: member.userId,
      type: member.type,
      part: member.part.trim() || null,
    }))
  if (rows.length === 0) return

  await db.insert(workshopMembers).values(rows).onConflictDoNothing()
}
```

- [ ] **Step 2: Add the create route**

Read `apps/studio-web/app/api/mobile/workshops/route.ts` first — it currently has only `GET` (from a prior plan). Add the imports and `POST` below the existing `GET`, leaving it untouched:

```ts
import { workshops, workshopMembers } from '@/lib/database/schema'
import { db } from '@/lib/database'
import { getWorkshopDetail } from '@/lib/workshops/queries'
import {
  resolveScriptSlugForMobile,
  insertValidatedMembersForMobile,
  isDraftMember,
  type DraftMember,
} from '@/lib/workshops/mobile-write-helpers'
```

```ts
export const POST = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''

  let scriptSlug: string | null
  try {
    scriptSlug = await resolveScriptSlugForMobile(typeof body?.scriptSlug === 'string' ? body.scriptSlug : null)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown script.' }, { status: 400 })
  }

  const rawMembers = Array.isArray(body?.members) ? body.members : []
  const members: DraftMember[] = rawMembers.filter(isDraftMember)

  const [workshop] = await db
    .insert(workshops)
    .values({
      ...(title ? { title } : {}),
      scriptSlug,
      createdById: user.userId,
    })
    .returning({ id: workshops.id })

  await db.insert(workshopMembers).values({ workshopId: workshop.id, userId: user.userId, type: 'actor' })
  await insertValidatedMembersForMobile(workshop.id, members, user.userId)

  const detail = await getWorkshopDetail(workshop.id)
  return Response.json(detail, { status: 201 })
})
```

Note: this file's existing `GET` already imports `getMobileUser`, `isAdminUser`, `withMobileCors`, `mobileCorsPreflight`, `listWorkshopsForUser` — don't duplicate those imports, just add the new ones above.

- [ ] **Step 3: Add the update route**

Read `apps/studio-web/app/api/mobile/workshops/[id]/route.ts` first — it currently has only `GET`. Add:

```ts
import {
  resolveScriptSlugForMobile,
  insertValidatedMembersForMobile,
  isDraftMember,
  type DraftMember,
} from '@/lib/workshops/mobile-write-helpers'
```

```ts
export const PATCH = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const [isMember, isAdmin] = await Promise.all([isWorkshopMember(workshopId, user.userId), isAdminUser(user.userId)])
  if (!isMember && !isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''

  let scriptSlug: string | null
  try {
    scriptSlug = await resolveScriptSlugForMobile(typeof body?.scriptSlug === 'string' ? body.scriptSlug : null)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown script.' }, { status: 400 })
  }

  await db
    .update(workshops)
    .set({ ...(title ? { title } : {}), scriptSlug })
    .where(eq(workshops.id, workshopId))

  const rawMembers = Array.isArray(body?.members) ? body.members : []
  const members: DraftMember[] = rawMembers.filter(isDraftMember)
  await insertValidatedMembersForMobile(workshopId, members, user.userId)

  const detail = await getWorkshopDetail(workshopId)
  if (!detail) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(detail)
})
```

This file's existing `GET` already imports `db`, `eq`, `workshops`, `getMobileUser`, `isAdminUser`, `getWorkshopDetail`, `isWorkshopMember`, `withMobileCors`, `mobileCorsPreflight` — reuse those, only add the `mobile-write-helpers` import.

- [ ] **Step 4: Add the scripts-list route**

Needed by the "New workshop" screen's script picker (Task 4). Create `apps/studio-web/app/api/mobile/scripts/route.ts`:

```ts
import { getMobileUser } from '@/lib/mobile-auth'
import { listAvailableScripts } from '@/lib/workshops/scripts'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const scripts = await listAvailableScripts()
  return Response.json(scripts)
})
```

- [ ] **Step 5: Add the active-users route**

Needed by the member-picker in both the "New workshop" screen (Task 4) and the "Add member" screen (Task 2). Create `apps/studio-web/app/api/mobile/users/active/route.ts`:

```ts
import { getMobileUser } from '@/lib/mobile-auth'
import { listActiveUsers } from '@/lib/workshops/queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const GET = withMobileCors(async (request: Request) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const activeUsers = await listActiveUsers()
  return Response.json(activeUsers)
})
```

- [ ] **Step 6: Verify**

Run `pnpm --filter studio-web exec tsc --noEmit` — must be clean.

With the dev server running and a mobile token (`TOKEN`):
```bash
curl -i -X POST http://localhost:3500/api/mobile/workshops \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Mobile-created workshop"}'
# Expected: 201, a WorkshopDetail JSON body with the new id and your user as the sole "actor" member

curl -i http://localhost:3500/api/mobile/scripts -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:3500/api/mobile/users/active -H "Authorization: Bearer $TOKEN"
# Expected: 200, JSON arrays for both

WORKSHOP_ID="paste-the-id-from-the-create-response"
curl -i -X PATCH "http://localhost:3500/api/mobile/workshops/$WORKSHOP_ID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Renamed"}'
# Expected: 200, WorkshopDetail with the new title
```

- [ ] **Step 7: Commit**

```bash
git add apps/studio-web/lib/workshops/mobile-write-helpers.ts apps/studio-web/app/api/mobile/workshops apps/studio-web/app/api/mobile/scripts apps/studio-web/app/api/mobile/users
git commit -m "feat: add mobile workshop create/update routes and script/active-user lists

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 2: Member management routes

**Files:**
- Create: `apps/studio-web/app/api/mobile/workshops/[id]/members/route.ts`
- Create: `apps/studio-web/app/api/mobile/workshops/[id]/members/[memberId]/route.ts`

**Interfaces:**
- Consumes: `getMobileUser`, `isAdminUser`; `isWorkshopMember`, `getWorkshopDetail`; `isValidEmail` (`lib/validation.ts`); `mobileCorsPreflight`, `withMobileCors`.
- Produces: `POST /api/mobile/workshops/:id/members` → `WorkshopDetail` (201). `DELETE`/`PATCH /api/mobile/workshops/:id/members/:memberId` → `WorkshopDetail`.

- [ ] **Step 1: Add-member route**

Mirrors `addMember()` in `apps/studio-web/app/workshops/actions.ts:178-200` — gated by member-**or-admin** (matches that action's `requireMemberOrAdmin`, unlike the routes in Step 2 which are member-only).

Create `apps/studio-web/app/api/mobile/workshops/[id]/members/route.ts`:

```ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users, workshopMembers } from '@/lib/database/schema'
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { isWorkshopMember, getWorkshopDetail } from '@/lib/workshops/queries'
import { isValidEmail } from '@/lib/validation'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const [isMember, isAdmin] = await Promise.all([isWorkshopMember(workshopId, user.userId), isAdminUser(user.userId)])
  if (!isMember && !isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const type = body?.type === 'viewer' ? 'viewer' : 'actor'
  const part = typeof body?.part === 'string' ? body.part.trim() || null : null

  if (!isValidEmail(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.status, 'active')))
    .limit(1)

  if (!target) return Response.json({ error: 'No active user found with that email.' }, { status: 404 })

  await db.insert(workshopMembers).values({ workshopId, userId: target.id, type, part }).onConflictDoNothing()

  const detail = await getWorkshopDetail(workshopId)
  return Response.json(detail, { status: 201 })
})
```

- [ ] **Step 2: Remove/update-member route**

Mirrors `removeMember()` and `updateMember()` in `apps/studio-web/app/workshops/actions.ts:202-224` — both member-**only** (no admin bypass, unlike `addMember`).

Create `apps/studio-web/app/api/mobile/workshops/[id]/members/[memberId]/route.ts`:

```ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { workshopMembers } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { isWorkshopMember, getWorkshopDetail } from '@/lib/workshops/queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const DELETE = withMobileCors(
  async (request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) => {
    const user = await getMobileUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: workshopId, memberId } = await params
    const isMember = await isWorkshopMember(workshopId, user.userId)
    if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    await db
      .delete(workshopMembers)
      .where(and(eq(workshopMembers.id, memberId), eq(workshopMembers.workshopId, workshopId)))

    const detail = await getWorkshopDetail(workshopId)
    return Response.json(detail)
  }
)

export const PATCH = withMobileCors(
  async (request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) => {
    const user = await getMobileUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: workshopId, memberId } = await params
    const isMember = await isWorkshopMember(workshopId, user.userId)
    if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const type = body?.type === 'viewer' ? 'viewer' : 'actor'
    const part = typeof body?.part === 'string' ? body.part.trim() || null : null

    await db
      .update(workshopMembers)
      .set({ type, part })
      .where(and(eq(workshopMembers.id, memberId), eq(workshopMembers.workshopId, workshopId)))

    const detail = await getWorkshopDetail(workshopId)
    return Response.json(detail)
  }
)
```

- [ ] **Step 3: Verify**

```bash
curl -i -X POST "http://localhost:3500/api/mobile/workshops/$WORKSHOP_ID/members" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"some-active-user@example.com","type":"actor","part":"Hamlet"}'
# Expected: 201 with the member in the returned WorkshopDetail.members array (or 404 if no such active user exists locally)

MEMBER_ID="paste-a-workshopMembers.id-from-the-detail-response"
curl -i -X PATCH "http://localhost:3500/api/mobile/workshops/$WORKSHOP_ID/members/$MEMBER_ID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"viewer","part":""}'
curl -i -X DELETE "http://localhost:3500/api/mobile/workshops/$WORKSHOP_ID/members/$MEMBER_ID" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 for both, member reflects then disappears in the returned WorkshopDetail
```

- [ ] **Step 4: Commit**

```bash
git add "apps/studio-web/app/api/mobile/workshops/[id]/members"
git commit -m "feat: add mobile workshop member management routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 3: Rehearsal scheduling routes

**Files:**
- Create: `apps/studio-web/app/api/mobile/workshops/[id]/rehearsal/route.ts`

**Interfaces:**
- Consumes: `getMobileUser`; `isWorkshopMember`, `getWorkshopDetail`; `getValidAccessToken`, `upsertRehearsalEvent`, `deleteRehearsalEvent` (`lib/google/calendar.ts`, existing, unchanged — these take an access token / event id as parameters, not `auth()`, so they're safe to call directly); `mobileCorsPreflight`, `withMobileCors`.
- Produces: `PUT /api/mobile/workshops/:id/rehearsal` → `WorkshopDetail`. `DELETE /api/mobile/workshops/:id/rehearsal` → `WorkshopDetail`.

- [ ] **Step 1: Write the route**

Mirrors `setRehearsalDate()` and `cancelRehearsal()` in `apps/studio-web/app/workshops/actions.ts:273-338`, including the best-effort (never-throws) Google Calendar sync — reusing the exact same calendar functions the web action calls, since those don't touch `auth()`.

Create `apps/studio-web/app/api/mobile/workshops/[id]/rehearsal/route.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { workshops } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { isWorkshopMember, getWorkshopDetail } from '@/lib/workshops/queries'
import { deleteRehearsalEvent, getValidAccessToken, upsertRehearsalEvent } from '@/lib/google/calendar'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

const REHEARSAL_DURATION_MS = 2 * 60 * 60 * 1000

export const PUT = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const raw = typeof body?.rehearsalAt === 'string' ? body.rehearsalAt : ''
  const rehearsalAt = raw ? new Date(raw) : null
  const location = body?.location === 'online' ? 'online' : 'studio'
  const meetingUrl = rehearsalAt && location === 'online' ? `https://meet.google.com/mock-${workshopId.slice(0, 8)}` : null

  const [existing] = await db
    .select({ googleEventId: workshops.googleEventId })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1)

  await db
    .update(workshops)
    .set({
      rehearsalAt,
      location: rehearsalAt ? location : null,
      meetingUrl,
      ...(rehearsalAt ? {} : { googleEventId: null }),
    })
    .where(eq(workshops.id, workshopId))

  if (body?.syncCalendar === true) {
    const accessToken = await getValidAccessToken(user.userId)
    if (accessToken) {
      if (!rehearsalAt) {
        if (existing?.googleEventId) await deleteRehearsalEvent(accessToken, existing.googleEventId)
      } else {
        const detail = await getWorkshopDetail(workshopId)
        if (detail) {
          const attendeeEmails = detail.members
            .filter((member) => member.type === 'actor' && member.userId !== user.userId)
            .map((member) => member.email)

          const result = await upsertRehearsalEvent(accessToken, existing?.googleEventId ?? null, {
            title: `${detail.title} rehearsal`,
            location,
            meetingUrl,
            start: rehearsalAt,
            end: new Date(rehearsalAt.getTime() + REHEARSAL_DURATION_MS),
            attendeeEmails,
          })

          if ('googleEventId' in result) {
            await db.update(workshops).set({ googleEventId: result.googleEventId }).where(eq(workshops.id, workshopId))
          } else {
            console.error(`[calendar] failed to sync rehearsal event for workshop ${workshopId}: ${result.error}`)
          }
        }
      }
    }
  }

  const detail = await getWorkshopDetail(workshopId)
  return Response.json(detail)
})

export const DELETE = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [existing] = await db
    .select({ googleEventId: workshops.googleEventId })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1)

  await db
    .update(workshops)
    .set({ rehearsalAt: null, location: null, meetingUrl: null, googleEventId: null })
    .where(eq(workshops.id, workshopId))

  if (existing?.googleEventId) {
    const accessToken = await getValidAccessToken(user.userId)
    if (accessToken) {
      const result = await deleteRehearsalEvent(accessToken, existing.googleEventId)
      if (result) console.error(`[calendar] failed to cancel rehearsal event for workshop ${workshopId}: ${result.error}`)
    }
  }

  const detail = await getWorkshopDetail(workshopId)
  return Response.json(detail)
})
```

- [ ] **Step 2: Verify**

```bash
curl -i -X PUT "http://localhost:3500/api/mobile/workshops/$WORKSHOP_ID/rehearsal" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"rehearsalAt":"2026-10-01T18:00:00.000Z","location":"online","syncCalendar":false}'
# Expected: 200, WorkshopDetail with rehearsalAt/location/meetingUrl set (meetingUrl auto-set since location is "online")

curl -i -X DELETE "http://localhost:3500/api/mobile/workshops/$WORKSHOP_ID/rehearsal" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200, WorkshopDetail with rehearsalAt/location/meetingUrl all null
```
Leave `syncCalendar` as `false`/omitted for this manual check unless you have a Google-linked test account handy — the calendar branch is best-effort and doesn't need to be exercised to verify the core scheduling logic.

- [ ] **Step 3: Commit**

```bash
git add "apps/studio-web/app/api/mobile/workshops/[id]/rehearsal"
git commit -m "feat: add mobile workshop rehearsal scheduling routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 4: Leave-workshop route

**Files:**
- Create: `apps/studio-web/app/api/mobile/workshops/[id]/leave/route.ts`

**Interfaces:**
- Consumes: `getMobileUser`; `isWorkshopMember`; `mobileCorsPreflight`, `withMobileCors`.
- Produces: `POST /api/mobile/workshops/:id/leave` → `{ success: true }`.

- [ ] **Step 1: Write the route**

Mirrors `leaveWorkshop()` in `apps/studio-web/app/workshops/actions.ts:374-387` — deleting the whole workshop if the caller is the last member, matching the "a workshop can't sit at zero members" design decision.

Create `apps/studio-web/app/api/mobile/workshops/[id]/leave/route.ts`:

```ts
import { and, count, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { workshops, workshopMembers } from '@/lib/database/schema'
import { getMobileUser } from '@/lib/mobile-auth'
import { isWorkshopMember } from '@/lib/workshops/queries'
import { mobileCorsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = mobileCorsPreflight

export const POST = withMobileCors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: workshopId } = await params
  const isMember = await isWorkshopMember(workshopId, user.userId)
  if (!isMember) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db
    .select({ memberCount: count() })
    .from(workshopMembers)
    .where(eq(workshopMembers.workshopId, workshopId))

  if ((row?.memberCount ?? 0) <= 1) {
    await db.delete(workshops).where(eq(workshops.id, workshopId))
  } else {
    await db
      .delete(workshopMembers)
      .where(and(eq(workshopMembers.workshopId, workshopId), eq(workshopMembers.userId, user.userId)))
  }

  return Response.json({ success: true })
})
```

- [ ] **Step 2: Verify**

```bash
curl -i -X POST "http://localhost:3500/api/mobile/workshops/$WORKSHOP_ID/leave" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 { "success": true }. If you were the last member, GET /api/mobile/workshops/$WORKSHOP_ID afterward should 404.
```

- [ ] **Step 3: Commit**

```bash
git add "apps/studio-web/app/api/mobile/workshops/[id]/leave"
git commit -m "feat: add mobile leave-workshop route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 5: Extend the shared API client

**Files:**
- Modify: `packages/api-client/src/client.ts`
- Modify: `packages/api-client/src/client.test.ts`
- Modify: `packages/api-client/src/index.ts`

**Interfaces:**
- Consumes: `WorkshopDetailDTO`, `ScriptSummary`, `AddableUser` (`@coral-studio/types`).
- Produces: `ApiClient` gains — `createWorkshop(input): Promise<WorkshopDetailDTO>`, `updateWorkshop(id, input): Promise<WorkshopDetailDTO>`, `addWorkshopMember(workshopId, input): Promise<WorkshopDetailDTO>`, `removeWorkshopMember(workshopId, memberId): Promise<WorkshopDetailDTO>`, `updateWorkshopMember(workshopId, memberId, input): Promise<WorkshopDetailDTO>`, `setWorkshopRehearsal(workshopId, input): Promise<WorkshopDetailDTO>`, `cancelWorkshopRehearsal(workshopId): Promise<WorkshopDetailDTO>`, `leaveWorkshop(workshopId): Promise<{ success: boolean }>`, `listScripts(): Promise<ScriptSummary[]>`, `listActiveUsers(): Promise<AddableUser[]>`.

- [ ] **Step 1: Write the failing tests**

Add to `packages/api-client/src/client.test.ts`:

```ts
test('createWorkshop POSTs the input as JSON', async () => {
  let capturedMethod: string | undefined
  let capturedBody: string | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedMethod = init?.method
    capturedBody = init?.body as string
    return { ok: true, status: 201, json: async () => ({ id: 'w1', title: 'New workshop', members: [] }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.createWorkshop({ title: 'New workshop' })

  assert.equal(capturedMethod, 'POST')
  assert.equal(capturedBody, JSON.stringify({ title: 'New workshop' }))
})

test('removeWorkshopMember sends a DELETE with no body', async () => {
  let capturedMethod: string | undefined
  let capturedBody: unknown
  globalThis.fetch = (async (_input, init) => {
    capturedMethod = init?.method
    capturedBody = init?.body
    return { ok: true, status: 200, json: async () => ({ id: 'w1', title: 'x', members: [] }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.removeWorkshopMember('w1', 'm1')

  assert.equal(capturedMethod, 'DELETE')
  assert.equal(capturedBody, undefined)
})

test('setWorkshopRehearsal PUTs the input as JSON', async () => {
  let capturedMethod: string | undefined
  let capturedBody: string | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedMethod = init?.method
    capturedBody = init?.body as string
    return { ok: true, status: 200, json: async () => ({ id: 'w1', title: 'x', members: [] }) } as Response
  }) as typeof fetch

  const client = createApiClient({ baseUrl: 'https://example.test', getToken: async () => 'tok', onUnauthorized: () => {} })

  await client.setWorkshopRehearsal('w1', { rehearsalAt: '2026-10-01T18:00:00.000Z', location: 'online', syncCalendar: false })

  assert.equal(capturedMethod, 'PUT')
  assert.equal(
    capturedBody,
    JSON.stringify({ rehearsalAt: '2026-10-01T18:00:00.000Z', location: 'online', syncCalendar: false })
  )
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: FAIL — `client.createWorkshop is not a function` (and similarly for the other two).

- [ ] **Step 3: Implement the new methods**

In `packages/api-client/src/client.ts`, add to the top import line bringing in the new types (alongside whatever's already imported from `@coral-studio/types`):

```ts
  AddableUser,
  ScriptSummary,
  WorkshopDetailDTO,
```

Add these methods to the object `createApiClient` returns:

```ts
    createWorkshop(input: {
      title?: string
      scriptSlug?: string | null
      members?: { userId: string; type: 'actor' | 'viewer'; part: string }[]
    }): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>('/api/mobile/workshops', { method: 'POST', body: input })
    },
    updateWorkshop(
      id: string,
      input: { title?: string; scriptSlug?: string | null; members?: { userId: string; type: 'actor' | 'viewer'; part: string }[] }
    ): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${id}`, { method: 'PATCH', body: input })
    },
    addWorkshopMember(
      workshopId: string,
      input: { email: string; type?: 'actor' | 'viewer'; part?: string }
    ): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/members`, { method: 'POST', body: input })
    },
    removeWorkshopMember(workshopId: string, memberId: string): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/members/${memberId}`, { method: 'DELETE' })
    },
    updateWorkshopMember(
      workshopId: string,
      memberId: string,
      input: { type: 'actor' | 'viewer'; part?: string }
    ): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/members/${memberId}`, {
        method: 'PATCH',
        body: input,
      })
    },
    setWorkshopRehearsal(
      workshopId: string,
      input: { rehearsalAt: string | null; location?: 'studio' | 'online'; syncCalendar?: boolean }
    ): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/rehearsal`, { method: 'PUT', body: input })
    },
    cancelWorkshopRehearsal(workshopId: string): Promise<WorkshopDetailDTO> {
      return request<WorkshopDetailDTO>(`/api/mobile/workshops/${workshopId}/rehearsal`, { method: 'DELETE' })
    },
    leaveWorkshop(workshopId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/api/mobile/workshops/${workshopId}/leave`, { method: 'POST' })
    },
    listScripts(): Promise<ScriptSummary[]> {
      return request<ScriptSummary[]>('/api/mobile/scripts')
    },
    listActiveUsers(): Promise<AddableUser[]> {
      return request<AddableUser[]>('/api/mobile/users/active')
    },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: PASS — all tests green (existing tests plus the 3 new ones).

- [ ] **Step 5: Update the index barrel if needed**

Check `packages/api-client/src/index.ts` — if it re-exports specific type names from `client.ts` (rather than `export *`), no change is needed here since none of the new methods introduce a new *exported* type (they consume existing `@coral-studio/types` types). Verify by reading the file; only add an export line if you find one of these methods' input/output shapes needs a dedicated exported type that doesn't already exist.

- [ ] **Step 6: Commit**

```bash
git add packages/api-client
git commit -m "feat: add workshop-write methods to @coral-studio/api-client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 6: New workshop screen

**Files:**
- Create: `apps/mobile-app/app/(tabs)/workshops/new.tsx`
- Modify: `apps/mobile-app/app/(tabs)/workshops/index.tsx` (add a "New workshop" button)
- Modify: `apps/mobile-app/app/(tabs)/workshops/_layout.tsx` (register the `new` route)

**Interfaces:**
- Consumes: `apiClient.createWorkshop`, `apiClient.listScripts`, `apiClient.listActiveUsers` (Task 5).

- [ ] **Step 1: Register the route and add the entry point**

Read `apps/mobile-app/app/(tabs)/workshops/_layout.tsx` first (it currently has explicit `Stack.Screen` entries for `index` and `[id]`). Add a third:

```tsx
<Stack.Screen name="new" options={{ title: 'New workshop' }} />
```

Read `apps/mobile-app/app/(tabs)/workshops/index.tsx` first. Add a button that navigates to the new screen — e.g. inside the existing screen's returned JSX, above the `FlatList`:

```tsx
<Pressable style={styles.newButton} onPress={() => router.push('/workshops/new')}>
  <Text style={styles.newButtonText}>New workshop</Text>
</Pressable>
```

(Import `Pressable` from `react-native` if not already imported in that file.) Add matching styles using the theme:

```ts
newButton: {
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
  marginBottom: spacing.sm,
  backgroundColor: colors.primary,
  borderRadius: radius,
  paddingVertical: 12,
  alignItems: 'center',
},
newButtonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 15 },
```
(Add `radius` to that file's existing `import { colors, spacing } from '../../../lib/theme'` line if it isn't already imported.)

- [ ] **Step 2: Write the new-workshop screen**

Create `apps/mobile-app/app/(tabs)/workshops/new.tsx`:

```tsx
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { colors, radius, spacing } from '../../../lib/theme'

export default function NewWorkshopScreen() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [scriptSlug, setScriptSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const scriptsQuery = useQuery({ queryKey: ['scripts'], queryFn: () => apiClient.listScripts() })

  const mutation = useMutation({
    mutationFn: () => apiClient.createWorkshop({ title: title.trim() || undefined, scriptSlug }),
    onSuccess: (workshop) => router.replace(`/workshops/${workshop.id}`),
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Untitled workshop"
        placeholderTextColor={colors.parchmentMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Script (optional)</Text>
      {scriptsQuery.isLoading ? (
        <Text style={styles.meta}>Loading scripts…</Text>
      ) : (
        <View style={styles.scriptList}>
          <Pressable
            style={[styles.scriptOption, scriptSlug === null && styles.scriptOptionActive]}
            onPress={() => setScriptSlug(null)}
          >
            <Text style={styles.scriptOptionText}>No script</Text>
          </Pressable>
          {(scriptsQuery.data ?? []).map((script) => (
            <Pressable
              key={script.slug}
              style={[styles.scriptOption, scriptSlug === script.slug && styles.scriptOptionActive]}
              onPress={() => setScriptSlug(script.slug)}
            >
              <Text style={styles.scriptOptionText}>{script.title}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.buttonText}>Create workshop</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  content: { padding: spacing.md, gap: spacing.sm },
  label: { color: colors.parchmentMuted, fontSize: 13, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.parchment,
    fontSize: 16,
  },
  meta: { color: colors.parchmentMuted, fontSize: 13 },
  scriptList: { gap: spacing.xs },
  scriptOption: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  scriptOptionActive: { borderColor: colors.accent },
  scriptOptionText: { color: colors.parchment, fontSize: 14 },
  error: { color: colors.accent, fontSize: 14 },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 16 },
})
```

- [ ] **Step 3: Verify**

`pnpm --filter mobile-app exec tsc --noEmit` clean. Then via `pnpm --filter mobile-app web` + `agent-browser`: sign in, tap "New workshop" from the Workshops list, optionally pick a script, tap "Create workshop", confirm it navigates to the new workshop's detail screen and the workshop now appears back on the list. Take a screenshot and look at it.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/workshops"
git commit -m "feat: add mobile new-workshop screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 7: Member management on the workshop detail screen

**Files:**
- Create: `apps/mobile-app/components/add-member-sheet.tsx`
- Modify: `apps/mobile-app/app/(tabs)/workshops/[id].tsx` (wire in add/remove/edit-member actions)

**Interfaces:**
- Consumes: `apiClient.addWorkshopMember`, `apiClient.removeWorkshopMember`, `apiClient.updateWorkshopMember`, `apiClient.listActiveUsers` (Task 5).

- [ ] **Step 1: Write the add-member picker component**

Create `apps/mobile-app/components/add-member-sheet.tsx`:

```tsx
import { useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'

export function AddMemberSheet({
  workshopId,
  visible,
  onClose,
  onAdded,
}: {
  workshopId: string
  visible: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [email, setEmail] = useState('')
  const [part, setPart] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activeUsersQuery = useQuery({
    queryKey: ['active-users'],
    queryFn: () => apiClient.listActiveUsers(),
    enabled: visible,
  })

  const mutation = useMutation({
    mutationFn: () => apiClient.addWorkshopMember(workshopId, { email: email.trim(), part: part.trim() || undefined }),
    onSuccess: () => {
      setEmail('')
      setPart('')
      setError(null)
      onAdded()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add member</Text>
          <TextInput
            style={styles.input}
            placeholder="member@example.com"
            placeholderTextColor={colors.parchmentMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Part (optional)"
            placeholderTextColor={colors.parchmentMuted}
            value={part}
            onChangeText={setPart}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.hint}>Active studio members:</Text>
          <FlatList
            data={activeUsersQuery.data ?? []}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable style={styles.userRow} onPress={() => setEmail(item.email)}>
                <Text style={styles.userText}>{item.name ?? item.email}</Text>
              </Pressable>
            )}
          />

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.addButton} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.addButtonText}>Add</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg, gap: spacing.sm, maxHeight: '80%' },
  title: { color: colors.parchment, fontSize: 18, fontWeight: '700' },
  input: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.parchment,
    fontSize: 15,
  },
  error: { color: colors.accent, fontSize: 13 },
  hint: { color: colors.parchmentMuted, fontSize: 12, marginTop: spacing.xs },
  list: { maxHeight: 140 },
  userRow: { paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.hairline },
  userText: { color: colors.parchment, fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: colors.parchmentMuted, fontWeight: '600' },
  addButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  addButtonText: { color: colors.primaryForeground, fontWeight: '600' },
})
```

- [ ] **Step 2: Wire it into the workshop detail screen**

Read `apps/mobile-app/app/(tabs)/workshops/[id].tsx` first. Add imports:

```tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AddMemberSheet } from '../../../components/add-member-sheet'
```

Inside the component, add:

```tsx
const queryClient = useQueryClient()
const [addMemberVisible, setAddMemberVisible] = useState(false)

const removeMemberMutation = useMutation({
  mutationFn: (memberId: string) => apiClient.removeWorkshopMember(id, memberId),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workshop', id] }),
})
```

Add a "Remove" pressable next to each member row (inside the `FlatList`'s `renderItem`, alongside the existing member text), and an "Add member" button below the member list, above the script viewer:

```tsx
<Pressable onPress={() => removeMemberMutation.mutate(item.id)}>
  <Text style={styles.removeLink}>Remove</Text>
</Pressable>
```

```tsx
<Pressable style={styles.addMemberButton} onPress={() => setAddMemberVisible(true)}>
  <Text style={styles.addMemberButtonText}>Add member</Text>
</Pressable>
<AddMemberSheet
  workshopId={id}
  visible={addMemberVisible}
  onClose={() => setAddMemberVisible(false)}
  onAdded={() => queryClient.invalidateQueries({ queryKey: ['workshop', id] })}
/>
```

Add matching styles to that file's existing `StyleSheet.create` call:

```ts
removeLink: { color: colors.accent, fontSize: 12 },
addMemberButton: { marginTop: spacing.sm, alignSelf: 'flex-start' },
addMemberButtonText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
```

You'll need to restructure the member `FlatList`'s `renderItem` to render a row (`flexDirection: 'row'`, `justifyContent: 'space-between'`) containing the existing member text on one side and the new "Remove" pressable on the other — read the existing `renderItem` to match its current text structure exactly before changing the layout.

- [ ] **Step 3: Verify**

`pnpm --filter mobile-app exec tsc --noEmit` clean. Via `pnpm --filter mobile-app web` + `agent-browser`: open a workshop you're a member of, tap "Add member", pick an active user or type an email, confirm they appear in the member list; tap "Remove" on a member, confirm they disappear. Screenshot and look at both states.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-app/components/add-member-sheet.tsx "apps/mobile-app/app/(tabs)/workshops/[id].tsx"
git commit -m "feat: add member management to the mobile workshop detail screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 8: Schedule/cancel rehearsal and leave actions

**Files:**
- Create: `apps/mobile-app/components/schedule-rehearsal-sheet.tsx`
- Modify: `apps/mobile-app/app/(tabs)/workshops/[id].tsx` (wire in schedule/cancel/leave)

**Interfaces:**
- Consumes: `apiClient.setWorkshopRehearsal`, `apiClient.cancelWorkshopRehearsal`, `apiClient.leaveWorkshop` (Task 5).

- [ ] **Step 1: Write the schedule-rehearsal sheet**

Create `apps/mobile-app/components/schedule-rehearsal-sheet.tsx`:

```tsx
import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'

export function ScheduleRehearsalSheet({
  workshopId,
  visible,
  onClose,
  onScheduled,
}: {
  workshopId: string
  visible: boolean
  onClose: () => void
  onScheduled: () => void
}) {
  const [rehearsalAt, setRehearsalAt] = useState('')
  const [location, setLocation] = useState<'studio' | 'online'>('studio')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.setWorkshopRehearsal(workshopId, {
        rehearsalAt: rehearsalAt.trim() ? new Date(rehearsalAt.trim()).toISOString() : null,
        location,
        syncCalendar: false,
      }),
    onSuccess: () => {
      setError(null)
      onScheduled()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Schedule rehearsal</Text>
          <Text style={styles.hint}>Date and time (e.g. 2026-10-01T18:00)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-10-01T18:00"
            placeholderTextColor={colors.parchmentMuted}
            value={rehearsalAt}
            onChangeText={setRehearsalAt}
          />
          <View style={styles.locationRow}>
            <Pressable
              style={[styles.locationOption, location === 'studio' && styles.locationOptionActive]}
              onPress={() => setLocation('studio')}
            >
              <Text style={styles.locationOptionText}>Studio</Text>
            </Pressable>
            <Pressable
              style={[styles.locationOption, location === 'online' && styles.locationOptionActive]}
              onPress={() => setLocation('online')}
            >
              <Text style={styles.locationOptionText}>Online</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.parchment, fontSize: 18, fontWeight: '700' },
  hint: { color: colors.parchmentMuted, fontSize: 12 },
  input: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.parchment,
    fontSize: 15,
  },
  locationRow: { flexDirection: 'row', gap: spacing.sm },
  locationOption: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 10, alignItems: 'center' },
  locationOptionActive: { borderColor: colors.accent },
  locationOptionText: { color: colors.parchment, fontSize: 14 },
  error: { color: colors.accent, fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: colors.parchmentMuted, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { color: colors.primaryForeground, fontWeight: '600' },
})
```

- [ ] **Step 2: Wire schedule/cancel/leave into the detail screen**

Read `apps/mobile-app/app/(tabs)/workshops/[id].tsx` first (should already have `useState`, `useMutation`, `useQueryClient` imported from Task 7). Add:

```tsx
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { ScheduleRehearsalSheet } from '../../../components/schedule-rehearsal-sheet'
```

```tsx
const router = useRouter()
const [scheduleVisible, setScheduleVisible] = useState(false)

const cancelRehearsalMutation = useMutation({
  mutationFn: () => apiClient.cancelWorkshopRehearsal(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workshop', id] }),
})

const leaveMutation = useMutation({
  mutationFn: () => apiClient.leaveWorkshop(id),
  onSuccess: () => router.replace('/workshops'),
})

function confirmLeaveWorkshop() {
  Alert.alert('Leave workshop?', 'You can be added back later by another member.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
  ])
}
```

Add buttons near the rehearsal `meta` text (after it, still inside the outer container):

```tsx
<View style={styles.rehearsalActions}>
  <Pressable onPress={() => setScheduleVisible(true)}>
    <Text style={styles.actionLink}>{workshop.rehearsalAt ? 'Reschedule' : 'Schedule rehearsal'}</Text>
  </Pressable>
  {workshop.rehearsalAt ? (
    <Pressable onPress={() => cancelRehearsalMutation.mutate()}>
      <Text style={styles.actionLink}>Cancel rehearsal</Text>
    </Pressable>
  ) : null}
</View>
<Pressable onPress={() => leaveMutation.mutate()} style={styles.leaveButton}>
  <Text style={styles.leaveButtonText}>Leave workshop</Text>
</Pressable>
<ScheduleRehearsalSheet
  workshopId={id}
  visible={scheduleVisible}
  onClose={() => setScheduleVisible(false)}
  onScheduled={() => queryClient.invalidateQueries({ queryKey: ['workshop', id] })}
/>
```

Add matching styles:

```ts
rehearsalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
actionLink: { color: colors.accent, fontSize: 13, fontWeight: '600' },
leaveButton: { marginTop: spacing.md, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
leaveButtonText: { color: colors.parchmentMuted, fontWeight: '600', fontSize: 14 },
```

- [ ] **Step 3: Verify**

`pnpm --filter mobile-app exec tsc --noEmit` clean. Via `pnpm --filter mobile-app web` + `agent-browser`: open a workshop, tap "Schedule rehearsal", set a date, confirm it appears on the screen and the "Live now" polling area still works; tap "Cancel rehearsal", confirm it clears. Screenshot both states. Leave-workshop is destructive — verify it by reading the code carefully and, if you do test it live, use a disposable test workshop you created in Task 6, not a workshop with real data.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-app/components/schedule-rehearsal-sheet.tsx "apps/mobile-app/app/(tabs)/workshops/[id].tsx"
git commit -m "feat: add rehearsal scheduling and leave-workshop actions to mobile

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```
