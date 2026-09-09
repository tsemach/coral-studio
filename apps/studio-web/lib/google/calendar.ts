import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { accounts } from '@/lib/database/schema'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

// Ports the token-refresh + events REST calls from ../doron-desktop's
// apps/desktop/src-tauri/src/calendar/{oauth,google_events}.rs -- same shape,
// but reading/writing the tokens already stored in this app's own `accounts`
// table (populated by @auth/drizzle-adapter on every Google sign-in) instead
// of a separate local account table.

// Backs the "Connect Google Calendar" menu item (user-menu.tsx) -- shown
// only when this is false, so a user who has already connected never sees a
// stale prompt to do it again.
export async function hasCalendarAccess(userId: string): Promise<boolean> {
  const [account] = await db
    .select({ scope: accounts.scope })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google')))
    .limit(1)
  return !!account?.scope?.includes(CALENDAR_SCOPE)
}

// Returns null (never throws) whenever the caller has no Google account
// linked, or it was never granted calendar access -- COR-15 treats calendar
// sync as best-effort on top of the rehearsal date, not a hard requirement.
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google')))
    .limit(1)

  if (!account || !account.access_token) {
    console.log(`[calendar] skipping sync: user ${userId} has no linked Google account`)
    return null
  }
  if (!account.scope?.includes(CALENDAR_SCOPE)) {
    console.log(`[calendar] skipping sync: user ${userId}'s Google account lacks calendar.events scope (has: ${account.scope})`)
    return null
  }

  const expiresAt = account.expires_at ?? 0
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (expiresAt > nowSeconds + 60) return account.access_token

  if (!account.refresh_token) return null

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? '',
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!response.ok) return null

  const body = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!body.access_token) return null

  await db
    .update(accounts)
    .set({
      access_token: body.access_token,
      expires_at: nowSeconds + (body.expires_in ?? 3600),
    })
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google')))

  return body.access_token
}

export type RehearsalEventInput = {
  title: string
  location: 'studio' | 'online'
  meetingUrl: string | null
  start: Date
  end: Date
  attendeeEmails: string[]
}

function eventBody(input: RehearsalEventInput) {
  return {
    summary: input.title,
    description: input.meetingUrl ?? undefined,
    location: input.location === 'studio' ? 'Glumački Studio' : (input.meetingUrl ?? undefined),
    start: { dateTime: input.start.toISOString() },
    end: { dateTime: input.end.toISOString() },
    attendees: input.attendeeEmails.map((email) => ({ email })),
  }
}

async function googleErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    return body.error?.message ?? `Google Calendar request failed (${response.status})`
  } catch {
    return `Google Calendar request failed (${response.status})`
  }
}

export type UpsertRehearsalEventResult = { googleEventId: string } | { error: string }

// Inserts a new event, or PATCHes the existing one when googleEventId is
// already set (re-scheduling shouldn't create duplicates). sendUpdates=all
// is what actually emails the invite to each attendee.
export async function upsertRehearsalEvent(
  accessToken: string,
  googleEventId: string | null,
  input: RehearsalEventInput
): Promise<UpsertRehearsalEventResult> {
  const url = googleEventId ? `${EVENTS_URL}/${googleEventId}` : EVENTS_URL
  const response = await fetch(`${url}?sendUpdates=all`, {
    method: googleEventId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody(input)),
  })
  if (!response.ok) return { error: await googleErrorMessage(response) }

  const body = (await response.json()) as { id: string }
  return { googleEventId: body.id }
}

// A 410 Gone means the event was already removed server-side -- same end
// state as a successful delete, so it isn't treated as a failure.
export async function deleteRehearsalEvent(accessToken: string, googleEventId: string): Promise<{ error: string } | null> {
  const response = await fetch(`${EVENTS_URL}/${googleEventId}?sendUpdates=all`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.ok || response.status === 410) return null
  return { error: await googleErrorMessage(response) }
}
