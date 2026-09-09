# Mobile App Foundation + Workshops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first working slice of `apps/mobile-app` — sign-in, and a full read-only Workshops tab (list, detail, members, schedule, read-only script viewer, live-now badge) — backed by new, additive API routes on `studio-web` and two new shared packages.

**Architecture:** `studio-web` gains only new files (a mobile-only JWT auth layer and new `/api/mobile/*` read routes) plus import-path-only edits where pure types/logic move into a new `packages/types` package. A new `packages/api-client` wraps those routes in a typed fetch client. `apps/mobile-app` (currently a blank Expo scaffold) becomes an Expo Router app with a token-based auth flow and a Workshops tab consuming that client.

**Tech Stack:** Next.js 16 route handlers + Drizzle (existing, in `studio-web`), `jose` for mobile JWT signing/verification (new), Expo Router + `@tanstack/react-query` + `expo-secure-store` (new, in `mobile-app`), pnpm workspaces / Turborepo (existing).

**Spec:** `docs/superpowers/specs/2026-09-09-mobile-app-mvp-design.md`

## Global Constraints

- No existing `studio-web` file's *behavior* changes. The only edits to existing files are import-path swaps when a type/pure-function is relocated into `packages/types` — the moved code's body stays byte-for-byte identical.
- All new mobile-facing capability is new, additive files under `apps/studio-web/app/api/mobile/*` (there is no separate mobile backend — the DB/Drizzle access only exists inside `studio-web`).
- The mobile auth token is completely separate from next-auth's session — own secret (`MOBILE_AUTH_SECRET`), own claims, own verify function. `auth.ts` / `auth.config.ts` are never touched.
- New mobile routes return the same `{ error: string }` + HTTP status convention the existing routes already use.
- Neither `packages/types` nor `packages/api-client` may depend on `react`, `react-dom`, `react-native`, `expo`, or `next` (per `packages/README.md`'s existing isolation rule).
- Package manager is pnpm; `pnpm-workspace.yaml` already globs `packages/*`, so new packages need no workspace-config change — just a `package.json` in the new folder.
- Use `npx expo install <pkg>` (from `apps/mobile-app/`) for any Expo/native-touching dependency, plain `pnpm add --filter mobile-app <pkg>` for pure-JS ones — per `apps/mobile-app/CLAUDE.md`.
- `studio-web` has no test suite today — no new test framework is introduced there; new routes are verified manually via `curl`. `packages/api-client` gets automated tests via Node's built-in `node:test` (run through `tsx`, already a `studio-web` devDependency elsewhere in the repo) — no new test framework added. Mobile screens are verified manually via `pnpm --filter mobile-app web` (fastest loop; `expo-secure-store` has a web shim) plus a simulator/device pass before calling the phase done.

---

### Task 1: Shared types package — relocate Workshop & Script types

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`
- Create: `packages/types/src/workshops.ts`
- Create: `packages/types/src/scripts.ts`
- Modify: `apps/studio-web/lib/workshops/queries.ts` (remove the 4 local type declarations, re-export from the package)
- Modify: `apps/studio-web/lib/workshops/scripts.ts` (remove the type/validator declarations, import + re-export from the package)
- Modify: `apps/studio-web/lib/workshops/script-colors.ts` (becomes a one-line re-export; all 3 existing importers need zero changes)
- Modify: `apps/studio-web/package.json` (add `@coral-studio/types` workspace dependency)
- Modify: `apps/studio-web/next.config.mjs` (add `transpilePackages`)

**Interfaces:**
- Produces: `@coral-studio/types` exporting — `Script`, `ScriptSummary`, `ScriptFlowEntry`, `isScriptFlowEntry(value): value is ScriptFlowEntry`, `isScriptShape(value): value is Omit<Script, 'slug'>`, `assignCharacterColors(characters: string[]): Record<string, string>`, `getSpeakingCharacters(script: Script): string[]`, `canSplitByCharacter(script: Script): boolean`, `MAX_SPLIT_CHARACTERS: number`, `WorkshopListItem`, `WorkshopMember`, `WorkshopDetail`, `AddableUser`. Every later task in this plan imports these types from `@coral-studio/types`.

- [ ] **Step 1: Scaffold the package**

Create `packages/types/package.json`:

```json
{
  "name": "@coral-studio/types",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

Create `packages/types/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 2: Move the script types/validators/color logic verbatim**

Create `packages/types/src/scripts.ts` — this is the exact content of today's `apps/studio-web/lib/workshops/scripts.ts` (lines 1-14, 36-53) plus today's `apps/studio-web/lib/workshops/script-colors.ts` (lines 8-49) merged into one file, with the cross-file `import type { Script }` removed since `Script` is now local:

```ts
export type ScriptFlowEntry =
  | { type: 'action'; text: string }
  | { type: 'dialogue'; character: string; line: string }

export type Script = {
  slug: string
  title: string
  scene: string
  script_flow: ScriptFlowEntry[]
}

export type ScriptSummary = { slug: string; title: string; scene: string }

export function isScriptFlowEntry(value: unknown): value is ScriptFlowEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  if (entry.type === 'action') return typeof entry.text === 'string'
  if (entry.type === 'dialogue') return typeof entry.character === 'string' && typeof entry.line === 'string'
  return false
}

export function isScriptShape(value: unknown): value is Omit<Script, 'slug'> {
  if (typeof value !== 'object' || value === null) return false
  const script = value as Record<string, unknown>
  return (
    typeof script.title === 'string' &&
    typeof script.scene === 'string' &&
    Array.isArray(script.script_flow) &&
    script.script_flow.every(isScriptFlowEntry)
  )
}

// Fixed hue rotation at the mock's oklch(78% 0.11 <hue>) lightness/chroma, so
// each new character keeps getting a distinct, harmonious color against the
// dark script panel.
const HUES = [75, 15, 200, 130, 280, 340]

export function assignCharacterColors(characters: string[]): Record<string, string> {
  const colors: Record<string, string> = {}
  let index = 0

  for (const character of characters) {
    if (character in colors) continue
    colors[character] = `oklch(78% 0.11 ${HUES[index % HUES.length]})`
    index += 1
  }

  return colors
}

// COR-14: split-by-character view only supports 2 or 3 speaking characters --
// a monologue has nothing to split, and beyond 3 columns there's no defined
// layout (not asked for).
export const MAX_SPLIT_CHARACTERS = 3

// Order of first appearance, not alphabetical -- matches
// assignCharacterColors()'s own convention, and reads more naturally
// (whoever speaks first is "column one").
export function getSpeakingCharacters(script: Script): string[] {
  const seen = new Set<string>()
  const characters: string[] = []
  for (const entry of script.script_flow) {
    if (entry.type === 'dialogue' && !seen.has(entry.character)) {
      seen.add(entry.character)
      characters.push(entry.character)
    }
  }
  return characters
}

export function canSplitByCharacter(script: Script): boolean {
  const count = getSpeakingCharacters(script).length
  return count >= 2 && count <= MAX_SPLIT_CHARACTERS
}
```

- [ ] **Step 3: Move the workshop types verbatim**

Create `packages/types/src/workshops.ts` — the exact content of today's `apps/studio-web/lib/workshops/queries.ts` lines 5-35:

```ts
export type WorkshopListItem = {
  id: string
  title: string
  scriptSlug: string | null
  rehearsalAt: Date | null
  location: 'studio' | 'online' | null
  memberCount: number
  memberUserIds: string[]
}

export type WorkshopMember = {
  id: string
  userId: string
  name: string | null
  email: string
  type: 'viewer' | 'actor'
  part: string | null
}

export type WorkshopDetail = {
  id: string
  title: string
  scriptSlug: string | null
  rehearsalAt: Date | null
  location: 'studio' | 'online' | null
  meetingUrl: string | null
  createdById: string
  members: WorkshopMember[]
}

export type AddableUser = { id: string; name: string | null; email: string }
```

- [ ] **Step 4: Create the index barrel**

Create `packages/types/src/index.ts`:

```ts
export * from './scripts'
export * from './workshops'
```

- [ ] **Step 5: Register the package with studio-web and Next.js**

Run:
```bash
pnpm --filter studio-web add @coral-studio/types@workspace:*
```

Edit `apps/studio-web/next.config.mjs` — add `transpilePackages` so Next.js's compiler transpiles this workspace package (it does not transpile `node_modules`-resolved packages, including symlinked workspace ones, by default):

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@coral-studio/types'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
```

- [ ] **Step 6: Point `lib/workshops/scripts.ts` at the package**

Replace the entire contents of `apps/studio-web/lib/workshops/scripts.ts` with (this removes only the `ScriptFlowEntry`/`Script`/`ScriptSummary`/`isScriptFlowEntry`/`isScriptShape` declarations that moved to the package — `BLOB_TOKEN`, `SCRIPTS_PREFIX`, `pathnameFor`, `isValidSlug`, `fetchAllScripts`, `listScriptsWithContent`, `listAvailableScripts`, `getScript`, `addScript`, and `deleteScript`, including all of their existing comments, are carried over verbatim and unchanged):

```ts
import { del, get, list, put } from '@vercel/blob'
import { isScriptShape } from '@coral-studio/types'
import type { Script } from '@coral-studio/types'

export type { Script, ScriptSummary } from '@coral-studio/types'

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

// COR-17: one shared Blob store, separated by a path prefix rather than
// separate stores per environment -- "prod" only in an actual Vercel
// Production deployment, "dev" everywhere else (local dev, preview
// deployments), matching VERCEL_ENV's three possible values
// (undefined locally, "preview", or "production").
const SCRIPTS_PREFIX = `coral-studio-blob/${process.env.VERCEL_ENV === 'production' ? 'prod' : 'dev'}/scripts/`

function pathnameFor(slug: string): string {
  return `${SCRIPTS_PREFIX}${slug}.json`
}

// slug comes from either an uploaded file's name (addScript) or a Blob
// pathname (listAvailableScripts) -- guarded the same way regardless of
// origin, same regex the filesystem version used to keep the path safe.
function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(slug)
}

// Shared by listAvailableScripts() and listScriptsWithContent() -- one
// list() + N getScript() pass, so callers that need both the sidebar
// summaries and one script's full content (the Scripts manager's
// /scripts/[slug] page) can get both from a single batch instead of
// re-fetching the selected script a second time via a separate getScript()
// call.
async function fetchAllScripts(): Promise<Script[]> {
  const { blobs } = await list({ prefix: SCRIPTS_PREFIX, token: BLOB_TOKEN })
  const jsonBlobs = blobs.filter((blob) => blob.pathname.endsWith('.json'))

  const scripts = await Promise.all(
    jsonBlobs.map((blob) => {
      const slug = blob.pathname.slice(SCRIPTS_PREFIX.length, -'.json'.length)
      return getScript(slug)
    })
  )

  return scripts.filter((script): script is Script => script !== null)
}

// Full-content batch fetch for pages that need more than just the sidebar
// summary -- see fetchAllScripts()'s comment.
export async function listScriptsWithContent(): Promise<Script[]> {
  // Same try/catch reasoning as listAvailableScripts() below: degrade to
  // "no scripts" rather than crash on a Blob misconfiguration/outage.
  try {
    return await fetchAllScripts()
  } catch {
    return []
  }
}

export async function listAvailableScripts(): Promise<ScriptSummary[]> {
  // Mirrors the old filesystem version's try/catch: this is called
  // unconditionally from every /workshops page view, so a Blob
  // misconfiguration or outage (bad/missing token, auth failure, rate
  // limit) must degrade to "no scripts available" rather than taking down
  // the entire pre-existing workshops feature.
  const scripts = await listScriptsWithContent()
  return scripts.map((script) => ({ slug: script.slug, title: script.title, scene: script.scene }))
}

export async function getScript(slug: string): Promise<Script | null> {
  if (!isValidSlug(slug)) return null

  try {
    // get() accepts a pathname directly (resolving the store's base URL from
    // the read-write token) and returns null on a 404, per
    // node_modules/@vercel/blob/dist/index.d.ts -- no list()/head() lookup
    // needed first. `access` is a required option there (unlike the filter
    // options for list/del), and the resolved value is `{ stream, blob, ... }`
    // (a raw ReadableStream body plus metadata), not a Response with `.text()`,
    // so it's wrapped in a `Response` to read it as text.
    // useCache: false bypasses the CDN cache (default true, per the same
    // .d.ts) -- addScript() re-uploads with allowOverwrite: true to fix a
    // bad conversion, and put()'s cacheControlMaxAge defaults to one month,
    // so without this a re-upload could keep serving the stale cached copy.
    const result = await get(pathnameFor(slug), { access: 'private', token: BLOB_TOKEN, useCache: false })
    if (!result || !result.stream) return null

    const raw = await new Response(result.stream).text()
    const parsed: unknown = JSON.parse(raw)
    if (!isScriptShape(parsed)) return null
    return { slug, ...parsed }
  } catch {
    return null
  }
}

// Backs the "+ Add script" upload in the Scripts manager (app/scripts/actions.ts).
// JSON-only (COR-17 decision): the uploaded file must already match the
// schema below so it's immediately renderable via ScriptFlow -- there is no
// raw PDF/DOCX storage path in this app; conversion happens externally via
// the AI prompt (components/scripts/prompt-panel.tsx).
export async function addScript(file: File): Promise<{ slug: string } | { error: string }> {
  const slug = file.name.replace(/\.json$/i, '')
  if (!isValidSlug(slug)) {
    return { error: 'File name must contain only letters, numbers, dots, dashes and underscores.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    return { error: 'That file is not valid JSON.' }
  }
  if (!isScriptShape(parsed)) {
    return { error: 'JSON must have a title (string), scene (string), and script_flow array matching the schema.' }
  }

  // addRandomSuffix: false keeps the pathname == slug-derived key (so
  // getScript/deleteScript can address it without a lookup table);
  // allowOverwrite: true lets re-uploading the same file name replace it,
  // which is the expected way to fix a bad conversion.
  await put(pathnameFor(slug), JSON.stringify(parsed), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: BLOB_TOKEN,
  })

  return { slug }
}

export async function deleteScript(slug: string): Promise<void> {
  if (!isValidSlug(slug)) return
  await del(pathnameFor(slug), { token: BLOB_TOKEN })
}
```

- [ ] **Step 7: Point `lib/workshops/queries.ts` at the package**

Edit `apps/studio-web/lib/workshops/queries.ts` — replace the top of the file (lines 1-35 of the current file, the imports plus the 4 type declarations) with:

```ts
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users, workshopMembers, workshops } from '@/lib/database/schema'

export type { WorkshopListItem, WorkshopMember, WorkshopDetail, AddableUser } from '@coral-studio/types'
```

Leave everything below that (starting with the comment `// One query feeding both memberCount and the AddMemberDialog/WorkshopFormDialog...` immediately above `memberUserIdsByWorkshop`, through the end of the file) completely unchanged — those functions already only reference the 4 relocated type names, which TypeScript's `export type { ... } from '...'` brings into this file's scope for type positions.

- [ ] **Step 8: Turn `script-colors.ts` into a re-export**

Replace the entire contents of `apps/studio-web/lib/workshops/script-colors.ts` with:

```ts
export { assignCharacterColors, getSpeakingCharacters, canSplitByCharacter, MAX_SPLIT_CHARACTERS } from '@coral-studio/types'
```

Its three existing importers (`components/workshops/script-panel.tsx`, `components/scripts/script-preview-panel.tsx`, `components/workshops/script-flow.tsx`) need no changes — they still import from `@/lib/workshops/script-colors`, which now just forwards to the package.

- [ ] **Step 9: Verify nothing broke**

Run:
```bash
pnpm --filter studio-web exec tsc --noEmit
```
Expected: no errors (if there are pre-existing unrelated errors in the repo, confirm none are new/related to `workshops`, `scripts`, or `script-colors`).

Then run `pnpm --filter studio-web dev`, open `/workshops` and `/scripts` in a browser signed in as an existing user, and confirm both pages render exactly as before (workshop list/detail, script sides viewer with character colors).

- [ ] **Step 10: Commit**

```bash
git add packages/types apps/studio-web/lib/workshops/queries.ts apps/studio-web/lib/workshops/scripts.ts apps/studio-web/lib/workshops/script-colors.ts apps/studio-web/package.json apps/studio-web/next.config.mjs pnpm-lock.yaml
git commit -m "refactor: move workshop/script types into @coral-studio/types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 2: Mobile-only auth backend

**Files:**
- Create: `apps/studio-web/lib/mobile-auth.ts`
- Create: `apps/studio-web/app/api/mobile/auth/login/route.ts`
- Modify: `apps/studio-web/package.json` (add `jose` dependency)
- Modify: `apps/studio-web/.env.example` (document `MOBILE_AUTH_SECRET`)
- Modify: `turbo.json` (add `MOBILE_AUTH_SECRET` to `build.env` and `start.env`)

**Interfaces:**
- Consumes: `verifyCredentials(email, password): Promise<{ user: typeof users.$inferSelect } | { error: string }>` from `apps/studio-web/lib/verifyCredentials.ts` (existing, unchanged).
- Produces: `signMobileToken(userId: string): Promise<string>`, `verifyMobileToken(token: string): Promise<{ userId: string } | null>`, `getMobileUser(request: Request): Promise<{ userId: string } | null>`, `isAdminUser(userId: string): Promise<boolean>` from `lib/mobile-auth.ts`. Every mobile route in Task 3 imports `getMobileUser` (and some, `isAdminUser`) from here.

- [ ] **Step 1: Add `jose`**

```bash
pnpm --filter studio-web add jose
```

- [ ] **Step 2: Write the mobile auth module**

Create `apps/studio-web/lib/mobile-auth.ts`:

```ts
import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'

// Entirely separate from next-auth's session JWT (auth.ts) -- own secret,
// own claims, own verification path. Never shared with or read by auth.ts.
function encodedSecret(): Uint8Array {
  const secret = process.env.MOBILE_AUTH_SECRET
  if (!secret) throw new Error('MOBILE_AUTH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function signMobileToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encodedSecret())
}

export async function verifyMobileToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret())
    if (typeof payload.sub !== 'string') return null
    return { userId: payload.sub }
  } catch {
    return null
  }
}

export async function getMobileUser(request: Request): Promise<{ userId: string } | null> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return verifyMobileToken(header.slice('Bearer '.length))
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  return row?.role === 'admin'
}
```

- [ ] **Step 3: Write the login route**

Create `apps/studio-web/app/api/mobile/auth/login/route.ts`:

```ts
import { verifyCredentials } from '@/lib/verifyCredentials'
import { signMobileToken } from '@/lib/mobile-auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email : null
  const password = typeof body?.password === 'string' ? body.password : null

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const result = await verifyCredentials(email, password)
  if ('error' in result) {
    return Response.json({ error: result.error }, { status: 401 })
  }

  const token = await signMobileToken(result.user.id)
  return Response.json({
    token,
    user: { id: result.user.id, name: result.user.name, email: result.user.email, image: result.user.image },
  })
}
```

- [ ] **Step 4: Document and declare the new env var**

Add to `apps/studio-web/.env.example` (after the existing `AUTH_SECRET` block):

```
# Mobile app -- a separate bearer-token auth, unrelated to next-auth's
# session above (see lib/mobile-auth.ts). Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
MOBILE_AUTH_SECRET=""
```

In `turbo.json`, add `"MOBILE_AUTH_SECRET"` to the `env` array of both the `build` task and the `start` task (alongside the existing `AUTH_SECRET` entry).

Add the same generated value to your local `apps/studio-web/.env.local` so the dev server picks it up.

- [ ] **Step 5: Verify manually**

Ensure you have an active user (create one if needed: `pnpm --filter studio-web exec tsx scripts/create-admin.ts`). Start the dev server (`pnpm --filter studio-web dev`), then:

```bash
curl -i -X POST http://localhost:3000/api/mobile/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_TEST_EMAIL","password":"YOUR_TEST_PASSWORD"}'
```
Expected: `200` with a JSON body containing `token` and `user`.

```bash
curl -i -X POST http://localhost:3000/api/mobile/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_TEST_EMAIL","password":"wrong-password"}'
```
Expected: `401` with `{ "error": "..." }`.

- [ ] **Step 6: Commit**

```bash
git add apps/studio-web/lib/mobile-auth.ts apps/studio-web/app/api/mobile/auth/login/route.ts apps/studio-web/package.json apps/studio-web/.env.example turbo.json pnpm-lock.yaml
git commit -m "feat: add mobile-only bearer-token auth (separate from next-auth session)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 3: Workshop read routes for mobile

**Files:**
- Create: `apps/studio-web/app/api/mobile/workshops/route.ts`
- Create: `apps/studio-web/app/api/mobile/workshops/[id]/route.ts`
- Create: `apps/studio-web/app/api/mobile/workshops/[id]/live-status/route.ts`
- Create: `apps/studio-web/app/api/mobile/scripts/[slug]/route.ts`

**Interfaces:**
- Consumes: `getMobileUser`, `isAdminUser` from `lib/mobile-auth.ts` (Task 2); `listWorkshopsForUser(userId, isAdmin)`, `getWorkshopDetail(workshopId)`, `isWorkshopMember(workshopId, userId)` from `lib/workshops/queries.ts` (existing, unchanged); `isWorkshopLive(workshopId)` from `lib/workshops/live.ts` (existing, unchanged); `getScript(slug)` from `lib/workshops/scripts.ts` (existing, unchanged).
- Produces: `GET /api/mobile/workshops` → `WorkshopListItem[]`; `GET /api/mobile/workshops/:id` → `WorkshopDetail`; `GET /api/mobile/workshops/:id/live-status` → `{ live: boolean }`; `GET /api/mobile/scripts/:slug` → `Script`. All four require `Authorization: Bearer <mobile token>` and return `{ error: string }` + 401/404 on failure. Task 4's `packages/api-client` calls these exact paths and shapes.

- [ ] **Step 1: Workshops list route**

Create `apps/studio-web/app/api/mobile/workshops/route.ts`:

```ts
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { listWorkshopsForUser } from '@/lib/workshops/queries'

export async function GET(request: Request) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = await isAdminUser(user.userId)
  const list = await listWorkshopsForUser(user.userId, isAdmin)
  return Response.json(list)
}
```

- [ ] **Step 2: Workshop detail route**

Create `apps/studio-web/app/api/mobile/workshops/[id]/route.ts`:

```ts
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { getWorkshopDetail, isWorkshopMember } from '@/lib/workshops/queries'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [member, isAdmin] = await Promise.all([isWorkshopMember(id, user.userId), isAdminUser(user.userId)])
  if (!member && !isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const detail = await getWorkshopDetail(id)
  if (!detail) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(detail)
}
```

- [ ] **Step 3: Live-status route**

Create `apps/studio-web/app/api/mobile/workshops/[id]/live-status/route.ts`:

```ts
import { getMobileUser, isAdminUser } from '@/lib/mobile-auth'
import { isWorkshopMember } from '@/lib/workshops/queries'
import { isWorkshopLive } from '@/lib/workshops/live'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [member, isAdmin] = await Promise.all([isWorkshopMember(id, user.userId), isAdminUser(user.userId)])
  if (!member && !isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const live = await isWorkshopLive(id)
  return Response.json({ live })
}
```

- [ ] **Step 4: Script route**

Create `apps/studio-web/app/api/mobile/scripts/[slug]/route.ts`:

```ts
import { getMobileUser } from '@/lib/mobile-auth'
import { getScript } from '@/lib/workshops/scripts'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const script = await getScript(slug)
  if (!script) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(script)
}
```

- [ ] **Step 5: Verify manually**

With the dev server running, reuse the token from Task 2's login curl (or run that login curl again and copy the `token` field):

```bash
TOKEN="paste-the-token-here"

curl -i http://localhost:3000/api/mobile/workshops -H "Authorization: Bearer $TOKEN"
# Expected: 200, a JSON array (empty if your test user has no workshops)

curl -i http://localhost:3000/api/mobile/workshops -H "Authorization: Bearer garbage"
# Expected: 401 { "error": "Unauthorized" }
```

If your test user belongs to a workshop with an attached script, also verify:
```bash
curl -i http://localhost:3000/api/mobile/workshops/WORKSHOP_ID -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:3000/api/mobile/workshops/WORKSHOP_ID/live-status -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:3000/api/mobile/scripts/SCRIPT_SLUG -H "Authorization: Bearer $TOKEN"
```
Expected: `200` with the matching JSON shape for each; a workshop id you're not a member of (and aren't an admin) returns `401`; an unknown id/slug returns `404`.

- [ ] **Step 6: Commit**

```bash
git add apps/studio-web/app/api/mobile/workshops apps/studio-web/app/api/mobile/scripts
git commit -m "feat: add mobile read routes for workshops, live-status, and scripts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 4: Shared API client package

**Files:**
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/tsconfig.json`
- Create: `packages/api-client/src/errors.ts`
- Create: `packages/api-client/src/client.ts`
- Create: `packages/api-client/src/index.ts`
- Test: `packages/api-client/src/client.test.ts`

**Interfaces:**
- Consumes: `Script`, `WorkshopDetail`, `WorkshopListItem` types from `@coral-studio/types` (Task 1).
- Produces: `createApiClient(config: ApiClientConfig): ApiClient` where `ApiClientConfig = { baseUrl: string; getToken: () => Promise<string | null>; onUnauthorized: () => void }` and `ApiClient` has `login(email: string, password: string): Promise<LoginResult>`, `getWorkshops(): Promise<WorkshopListItem[]>`, `getWorkshopDetail(id: string): Promise<WorkshopDetail>`, `getWorkshopLiveStatus(id: string): Promise<{ live: boolean }>`, `getScript(slug: string): Promise<Script>`; and `class ApiError extends Error { status: number }`. `LoginResult = { token: string; user: { id: string; name: string | null; email: string; image: string | null } }`. Task 5's mobile app imports `createApiClient` and `ApiError` from `@coral-studio/api-client`.

- [ ] **Step 1: Scaffold the package**

Create `packages/api-client/package.json`:

```json
{
  "name": "@coral-studio/api-client",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "tsx --test src/client.test.ts"
  },
  "dependencies": {
    "@coral-studio/types": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.23.12",
    "typescript": "^5.6.0"
  }
}
```

Create `packages/api-client/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

Run `pnpm install` from the repo root so the new package (and its `tsx`/`typescript` devDependencies) gets linked.

- [ ] **Step 2: Write the error type**

Create `packages/api-client/src/errors.ts`:

```ts
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
```

- [ ] **Step 3: Write the failing tests**

Create `packages/api-client/src/client.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApiClient } from './client'
import { ApiError } from './errors'

test('attaches the bearer token to authenticated requests', async () => {
  let capturedHeaders: Record<string, string> | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedHeaders = init?.headers as Record<string, string>
    return { ok: true, status: 200, json: async () => ({ live: true }) } as Response
  }) as typeof fetch

  const client = createApiClient({
    baseUrl: 'https://example.test',
    getToken: async () => 'the-token',
    onUnauthorized: () => {},
  })

  await client.getWorkshopLiveStatus('w1')

  assert.equal(capturedHeaders?.Authorization, 'Bearer the-token')
})

test('throws ApiError and calls onUnauthorized when there is no stored token', async () => {
  let unauthorizedCalled = false
  const client = createApiClient({
    baseUrl: 'https://example.test',
    getToken: async () => null,
    onUnauthorized: () => {
      unauthorizedCalled = true
    },
  })

  await assert.rejects(() => client.getWorkshops(), ApiError)
  assert.equal(unauthorizedCalled, true)
})

test('throws ApiError and calls onUnauthorized on a 401 response', async () => {
  let unauthorizedCalled = false
  globalThis.fetch = (async () => {
    return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) } as Response
  }) as typeof fetch

  const client = createApiClient({
    baseUrl: 'https://example.test',
    getToken: async () => 'stale-token',
    onUnauthorized: () => {
      unauthorizedCalled = true
    },
  })

  await assert.rejects(() => client.getWorkshops(), ApiError)
  assert.equal(unauthorizedCalled, true)
})

test('login does not require or send a token', async () => {
  let capturedHeaders: Record<string, string> | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedHeaders = init?.headers as Record<string, string>
    return {
      ok: true,
      status: 200,
      json: async () => ({ token: 'x', user: { id: '1', name: null, email: 'a@b.com', image: null } }),
    } as Response
  }) as typeof fetch

  const client = createApiClient({
    baseUrl: 'https://example.test',
    getToken: async () => {
      throw new Error('should not be called for login')
    },
    onUnauthorized: () => {},
  })

  const result = await client.login('a@b.com', 'secret')

  assert.equal(result.token, 'x')
  assert.equal(capturedHeaders?.Authorization, undefined)
})
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: FAIL — `Cannot find module './client'`.

- [ ] **Step 5: Implement the client**

Create `packages/api-client/src/client.ts`:

```ts
import type { Script, WorkshopDetail, WorkshopListItem } from '@coral-studio/types'
import { ApiError } from './errors'

export type ApiClientConfig = {
  baseUrl: string
  getToken: () => Promise<string | null>
  onUnauthorized: () => void
}

export type LoginResult = {
  token: string
  user: { id: string; name: string | null; email: string; image: string | null }
}

export type WorkshopLiveStatus = { live: boolean }

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean } = {}
  ): Promise<T> {
    const requiresAuth = options.auth ?? true
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (requiresAuth) {
      const token = await config.getToken()
      if (!token) {
        config.onUnauthorized()
        throw new ApiError(401, 'Not signed in.')
      }
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      if (response.status === 401) config.onUnauthorized()
      const message =
        payload && typeof payload === 'object' && 'error' in payload ? String((payload as { error: unknown }).error) : 'Request failed.'
      throw new ApiError(response.status, message)
    }

    return payload as T
  }

  return {
    login(email: string, password: string): Promise<LoginResult> {
      return request<LoginResult>('/api/mobile/auth/login', { method: 'POST', body: { email, password }, auth: false })
    },
    getWorkshops(): Promise<WorkshopListItem[]> {
      return request<WorkshopListItem[]>('/api/mobile/workshops')
    },
    getWorkshopDetail(id: string): Promise<WorkshopDetail> {
      return request<WorkshopDetail>(`/api/mobile/workshops/${id}`)
    },
    getWorkshopLiveStatus(id: string): Promise<WorkshopLiveStatus> {
      return request<WorkshopLiveStatus>(`/api/mobile/workshops/${id}/live-status`)
    },
    getScript(slug: string): Promise<Script> {
      return request<Script>(`/api/mobile/scripts/${slug}`)
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @coral-studio/api-client test`
Expected: PASS — all 4 tests green.

- [ ] **Step 7: Write the index barrel**

Create `packages/api-client/src/index.ts`:

```ts
export { createApiClient } from './client'
export type { ApiClient, ApiClientConfig, LoginResult, WorkshopLiveStatus } from './client'
export { ApiError } from './errors'
```

- [ ] **Step 8: Commit**

```bash
git add packages/api-client pnpm-lock.yaml
git commit -m "feat: add @coral-studio/api-client with tested request/auth handling

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 5: Mobile app scaffold — Expo Router, auth, login

**Files:**
- Delete: `apps/mobile-app/App.tsx`
- Modify: `apps/mobile-app/index.ts` → delete (Expo Router replaces the manual entry point)
- Modify: `apps/mobile-app/package.json` (new deps, `main` entry)
- Modify: `apps/mobile-app/app.json` (Expo Router plugin + scheme)
- Create: `apps/mobile-app/.env.example`
- Create: `apps/mobile-app/lib/query-client.ts`
- Create: `apps/mobile-app/lib/auth/token-storage.ts`
- Create: `apps/mobile-app/lib/api.ts`
- Create: `apps/mobile-app/lib/auth/auth-context.tsx`
- Create: `apps/mobile-app/app/_layout.tsx`
- Create: `apps/mobile-app/app/login.tsx`

**Interfaces:**
- Consumes: `createApiClient`, `ApiError`, `LoginResult` from `@coral-studio/api-client` (Task 4).
- Produces: `apiClient` (an `ApiClient` instance) and `setUnauthorizedHandler(handler: () => void)` from `lib/api.ts`; `AuthProvider`, `useAuth(): { status: 'loading' | 'signedIn' | 'signedOut'; user: LoginResult['user'] | null; signIn(email, password): Promise<void>; signOut(): Promise<void> }` from `lib/auth/auth-context.tsx`. Tasks 6-9's screens all consume `useAuth`, and `apiClient` from `lib/api.ts`.

- [ ] **Step 1: Install dependencies**

From `apps/mobile-app/`:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-secure-store
pnpm add @tanstack/react-query
pnpm add @coral-studio/types@workspace:* @coral-studio/api-client@workspace:*
```

- [ ] **Step 2: Switch the entry point to Expo Router**

In `apps/mobile-app/package.json`, change `"main": "index.ts"` to `"main": "expo-router/entry"`.

Delete `apps/mobile-app/index.ts` and `apps/mobile-app/App.tsx` — Expo Router discovers screens from the `app/` directory instead.

- [ ] **Step 3: Configure Expo Router in app.json**

Edit `apps/mobile-app/app.json`, adding `"scheme"` and `"plugins"` inside the `"expo"` object (alongside the existing `"name"`, `"slug"`, etc.):

```json
    "scheme": "coralstudio",
    "plugins": ["expo-router"],
```

- [ ] **Step 4: Add the API base URL config**

Create `apps/mobile-app/.env.example`:

```
# studio-web's dev server. Android emulator: use http://10.0.2.2:3000 instead
# of localhost. Physical device: use your machine's LAN IP.
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Copy it to `apps/mobile-app/.env` (gitignored) with a real value for your setup.

- [ ] **Step 5: Query client**

Create `apps/mobile-app/lib/query-client.ts`:

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient()
```

- [ ] **Step 6: Token storage**

Create `apps/mobile-app/lib/auth/token-storage.ts`:

```ts
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'coral-studio-mobile-token'

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}
```

- [ ] **Step 7: API client instance**

Create `apps/mobile-app/lib/api.ts`:

```ts
import { createApiClient } from '@coral-studio/api-client'
import { clearStoredToken, getStoredToken } from './auth/token-storage'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not set')
}

let onUnauthorizedHandler: () => void = () => {}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorizedHandler = handler
}

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: getStoredToken,
  onUnauthorized: () => {
    clearStoredToken()
    onUnauthorizedHandler()
  },
})
```

- [ ] **Step 8: Auth context**

Create `apps/mobile-app/lib/auth/auth-context.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LoginResult } from '@coral-studio/api-client'
import { apiClient, setUnauthorizedHandler } from '../api'
import { clearStoredToken, getStoredToken, setStoredToken } from './token-storage'

type AuthStatus = 'loading' | 'signedIn' | 'signedOut'

type AuthContextValue = {
  status: AuthStatus
  user: LoginResult['user'] | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<LoginResult['user'] | null>(null)

  useEffect(() => {
    getStoredToken().then((token) => setStatus(token ? 'signedIn' : 'signedOut'))
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setStatus('signedOut')
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async signIn(email: string, password: string) {
        const result = await apiClient.login(email, password)
        await setStoredToken(result.token)
        setUser(result.user)
        setStatus('signedIn')
      },
      async signOut() {
        await clearStoredToken()
        setUser(null)
        setStatus('signedOut')
      },
    }),
    [status, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

- [ ] **Step 9: Root layout with the auth gate**

Create `apps/mobile-app/app/_layout.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../lib/auth/auth-context'
import { queryClient } from '../lib/query-client'

function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    const onLoginScreen = segments[0] === 'login'

    if (status === 'signedOut' && !onLoginScreen) {
      router.replace('/login')
    } else if (status === 'signedIn' && onLoginScreen) {
      router.replace('/(tabs)/workshops')
    }
  }, [status, segments, router])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <Slot />
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 10: Login screen**

Create `apps/mobile-app/app/login.tsx`:

```tsx
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { ApiError } from '@coral-studio/api-client'
import { useAuth } from '../lib/auth/auth-context'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Glumački Studio</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  error: { color: '#b00020' },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
})
```

- [ ] **Step 11: Verify manually**

With `studio-web`'s dev server running (Task 2/3's routes live), run:
```bash
pnpm --filter mobile-app web
```
Expected: the app opens in a browser tab and redirects straight to `/login` (no `(tabs)` screens exist yet, so this will 404 after a successful sign-in until Task 6 — that's expected at this point). Confirm: entering a wrong password shows the inline error message; the screen doesn't crash.

- [ ] **Step 12: Commit**

```bash
git add apps/mobile-app
git commit -m "feat: scaffold Expo Router app with mobile auth (login + token storage)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 6: Tab shell + Profile screen

**Files:**
- Create: `apps/mobile-app/app/(tabs)/_layout.tsx`
- Create: `apps/mobile-app/app/(tabs)/community.tsx`
- Create: `apps/mobile-app/app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `lib/auth/auth-context.tsx` (Task 5).
- Produces: the `(tabs)` route group with `workshops`, `community`, `profile` screens registered — Task 7's `app/(tabs)/workshops/index.tsx` slots into this group.

- [ ] **Step 1: Tab layout**

Create `apps/mobile-app/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="workshops" options={{ title: 'Workshops' }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
```

- [ ] **Step 2: Community placeholder**

Create `apps/mobile-app/app/(tabs)/community.tsx` (replaced by the Community plan later):

```tsx
import { StyleSheet, Text, View } from 'react-native'

export default function CommunityPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Community is coming soon.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { color: '#666', fontSize: 16, textAlign: 'center' },
})
```

- [ ] **Step 3: Profile screen**

Create `apps/mobile-app/app/(tabs)/profile.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../lib/auth/auth-context'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.name ?? user?.email}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  name: { fontSize: 20, fontWeight: '600' },
  email: { color: '#666' },
  button: { marginTop: 24, backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
})
```

- [ ] **Step 4: Verify manually**

Run `pnpm --filter mobile-app web`, sign in with valid credentials (from Task 2's test user). Expected: you land on a bottom-tab layout with Workshops (will 404/blank until Task 7), Community (placeholder text), and Profile (your name/email + a working Sign out button that returns you to `/login`).

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile-app/app/(tabs)"
git commit -m "feat: add mobile tab shell and profile screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 7: Workshops list screen

**Files:**
- Create: `apps/mobile-app/app/(tabs)/workshops/_layout.tsx`
- Create: `apps/mobile-app/app/(tabs)/workshops/index.tsx`
- Create: `apps/mobile-app/components/workshop-card.tsx`

**Interfaces:**
- Consumes: `apiClient.getWorkshops(): Promise<WorkshopListItem[]>` from `lib/api.ts` (Task 5/4); `WorkshopListItem` from `@coral-studio/types` (Task 1).
- Produces: the `workshops` stack root — Task 8's `[id].tsx` is a sibling route in this same stack, navigated to via `router.push`.

- [ ] **Step 1: Stack layout for the Workshops tab**

Create `apps/mobile-app/app/(tabs)/workshops/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'

export default function WorkshopsStackLayout() {
  return <Stack />
}
```

- [ ] **Step 2: Workshop card component**

Create `apps/mobile-app/components/workshop-card.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native'
import type { WorkshopListItem } from '@coral-studio/types'

export function WorkshopCard({ workshop, onPress }: { workshop: WorkshopListItem; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.title}>{workshop.title}</Text>
      <Text style={styles.meta}>
        {workshop.rehearsalAt ? new Date(workshop.rehearsalAt).toLocaleString() : 'No rehearsal scheduled'}
      </Text>
      <Text style={styles.meta}>
        {workshop.memberCount} member{workshop.memberCount === 1 ? '' : 's'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666', marginTop: 4 },
})
```

- [ ] **Step 3: List screen**

Create `apps/mobile-app/app/(tabs)/workshops/index.tsx`:

```tsx
import { FlatList, StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'
import { WorkshopCard } from '../../../components/workshop-card'

export default function WorkshopsListScreen() {
  const router = useRouter()
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => apiClient.getWorkshops(),
  })

  if (isLoading) return <Text style={styles.message}>Loading…</Text>
  if (error) return <Text style={styles.message}>Could not load workshops.</Text>

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(item) => item.id}
      onRefresh={refetch}
      refreshing={isRefetching}
      renderItem={({ item }) => (
        <WorkshopCard workshop={item} onPress={() => router.push(`/workshops/${item.id}`)} />
      )}
      ListEmptyComponent={<Text style={styles.message}>No workshops yet.</Text>}
    />
  )
}

const styles = StyleSheet.create({
  message: { padding: 24, textAlign: 'center', color: '#666' },
})
```

- [ ] **Step 4: Verify manually**

Run `pnpm --filter mobile-app web`, sign in as a user who belongs to at least one workshop. Expected: the Workshops tab shows a scrollable list of cards with title, next rehearsal date, and member count; pull-to-refresh works; a user with no workshops sees "No workshops yet."

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/workshops" apps/mobile-app/components/workshop-card.tsx
git commit -m "feat: add mobile workshops list screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 8: Workshop detail screen

**Files:**
- Create: `apps/mobile-app/app/(tabs)/workshops/[id].tsx`

**Interfaces:**
- Consumes: `apiClient.getWorkshopDetail(id)`, `apiClient.getWorkshopLiveStatus(id)` from `lib/api.ts` (Task 5/4).
- Produces: renders a `<ScriptViewer slug={workshop.scriptSlug} />` when `workshop.scriptSlug` is set — Task 9 creates that component; until Task 9 lands, this task renders the rest of the screen without it (see Step 1's placeholder).

- [ ] **Step 1: Detail screen (without the script viewer for now)**

Create `apps/mobile-app/app/(tabs)/workshops/[id].tsx`:

```tsx
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api'

const LIVE_POLL_INTERVAL_MS = 8000

export default function WorkshopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const detailQuery = useQuery({
    queryKey: ['workshop', id],
    queryFn: () => apiClient.getWorkshopDetail(id),
    enabled: !!id,
  })

  const liveQuery = useQuery({
    queryKey: ['workshop-live', id],
    queryFn: () => apiClient.getWorkshopLiveStatus(id),
    enabled: !!id,
    refetchInterval: LIVE_POLL_INTERVAL_MS,
  })

  if (detailQuery.isLoading) return <Text style={styles.message}>Loading…</Text>
  if (detailQuery.error || !detailQuery.data) return <Text style={styles.message}>Could not load this workshop.</Text>

  const workshop = detailQuery.data

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{workshop.title}</Text>
      {liveQuery.data?.live ? <Text style={styles.liveBadge}>Live now</Text> : null}
      <Text style={styles.meta}>
        {workshop.rehearsalAt ? new Date(workshop.rehearsalAt).toLocaleString() : 'No rehearsal scheduled'}
        {workshop.location ? ` · ${workshop.location}` : ''}
      </Text>

      <Text style={styles.sectionTitle}>Members</Text>
      <FlatList
        data={workshop.members}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => (
          <Text style={styles.member}>
            {item.name ?? item.email} · {item.type}
            {item.part ? ` · ${item.part}` : ''}
          </Text>
        )}
        style={styles.memberList}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  message: { padding: 24, textAlign: 'center', color: '#666' },
  title: { fontSize: 20, fontWeight: '600' },
  liveBadge: { color: '#0a7d32', fontWeight: '600' },
  meta: { color: '#666' },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  member: { paddingVertical: 4 },
  memberList: { maxHeight: 160 },
})
```

- [ ] **Step 2: Verify manually**

Run `pnpm --filter mobile-app web`, tap into a workshop from the list. Expected: title, rehearsal date/location, and member list (name/email, type, part) render; if that workshop is currently "live" (start one via the web app's Go Live button in another tab), the "Live now" badge appears within ~8s without a manual refresh.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile-app/app/(tabs)/workshops/[id].tsx"
git commit -m "feat: add mobile workshop detail screen with live-status polling

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

### Task 9: Read-only script viewer

**Files:**
- Create: `apps/mobile-app/components/script-viewer.tsx`
- Modify: `apps/mobile-app/app/(tabs)/workshops/[id].tsx` (render it when a script is attached)

**Interfaces:**
- Consumes: `apiClient.getScript(slug)` from `lib/api.ts` (Task 5/4); `assignCharacterColors(characters): Record<string, string>` from `@coral-studio/types` (Task 1).

- [ ] **Step 1: Script viewer component**

Create `apps/mobile-app/components/script-viewer.tsx`:

```tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { assignCharacterColors } from '@coral-studio/types'
import { apiClient } from '../lib/api'

export function ScriptViewer({ slug }: { slug: string }) {
  const { data: script, isLoading, error } = useQuery({
    queryKey: ['script', slug],
    queryFn: () => apiClient.getScript(slug),
  })

  if (isLoading) return <Text style={styles.message}>Loading script…</Text>
  if (error || !script) return <Text style={styles.message}>Could not load the script.</Text>

  const characters = Array.from(
    new Set(script.script_flow.filter((entry) => entry.type === 'dialogue').map((entry) => entry.character))
  )
  const colors = assignCharacterColors(characters)

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{script.title}</Text>
      <Text style={styles.scene}>{script.scene}</Text>
      <ScrollView style={styles.scroll}>
        {script.script_flow.map((entry, index) =>
          entry.type === 'action' ? (
            <Text key={index} style={styles.action}>
              {entry.text}
            </Text>
          ) : (
            <Text key={index} style={styles.dialogue}>
              <Text style={{ color: colors[entry.character], fontWeight: '700' }}>{entry.character}: </Text>
              {entry.line}
            </Text>
          )
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  message: { padding: 24, textAlign: 'center', color: '#666' },
  container: { flex: 1, marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  scene: { color: '#666', marginBottom: 8 },
  scroll: { flex: 1 },
  action: { fontStyle: 'italic', color: '#444', marginVertical: 4 },
  dialogue: { marginVertical: 4 },
})
```

- [ ] **Step 2: Wire it into the detail screen**

In `apps/mobile-app/app/(tabs)/workshops/[id].tsx`:

Add the import at the top:
```tsx
import { ScriptViewer } from '../../../components/script-viewer'
```

Add this line right after the `<FlatList ... style={styles.memberList} />` closing tag, still inside the outer `<View style={styles.container}>`:
```tsx
      {workshop.scriptSlug ? <ScriptViewer slug={workshop.scriptSlug} /> : null}
```

- [ ] **Step 3: Verify manually**

Run `pnpm --filter mobile-app web`, open a workshop that has a script attached (via the web app's workshop editor if none exist yet). Expected: below the member list, the script's title/scene and its full action/dialogue flow render, with each character's name colored consistently; a workshop with no `scriptSlug` shows no script section at all (no error).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-app/components/script-viewer.tsx "apps/mobile-app/app/(tabs)/workshops/[id].tsx"
git commit -m "feat: add read-only script viewer to the mobile workshop detail screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01StfC7DMXnAGM7ZDg2VBqb6"
```

---

## After this plan

Studio-web's Community subsystem gets its own plan (feed, post detail, comments write, tape room), building on this plan's `@coral-studio/types`, `@coral-studio/api-client`, mobile auth, and tab shell — it replaces `app/(tabs)/community.tsx`'s placeholder with a real stack of screens, the same way Task 7 built out the Workshops tab.
