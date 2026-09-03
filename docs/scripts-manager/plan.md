# Scripts manager — implementation plan

> **For agentic workers:** implement task-by-task using `superpowers:executing-plans`
> (inline, batch execution with checkpoints) or `superpowers:subagent-driven-development`
> (fresh subagent per task). Steps use checkbox (`- [ ]`) syntax for tracking.

Linear: [COR-17](https://linear.app/coral-studio/issue/COR-17/add-scripts-manager-page)

**Goal:** Add an admin-only `/scripts` page — sketch-equivalent to `/workshops` — where an
admin uploads JSON scripts to Vercel Blob, browses/deletes them, previews one with the
existing `ScriptFlow` renderer, and copies the AI conversion prompt to the clipboard. Blob
storage becomes the *only* source of truth for scripts: `lib/workshops/scripts.ts` moves off
the local `workshops/scripts/*.json` filesystem folder entirely, so the workshops "attach a
script" flow keeps working unchanged, now backed by whatever's uploaded here.

**Architecture:** One new route pair (`app/scripts/page.tsx`, `app/scripts/[slug]/page.tsx`),
mirroring the existing `app/workshops/page.tsx` / `app/workshops/[id]/page.tsx` split (index
with no selection vs. a selected item via the URL, not client state). A rewritten
`lib/workshops/scripts.ts` swaps its filesystem calls for `@vercel/blob`'s `list`/`get`/`put`/
`del`, keeping every existing export's name and signature identical. New `components/scripts/*`
components follow the exact dark-`ink`-theme conventions already established in
`components/workshops/*` (kebab dropdown menu, `<dialog>` + `forwardRef` pattern, resizable-free
sidebar list).

**Tech Stack:** Next.js App Router (Server Components + Server Actions), `@vercel/blob`,
`react-markdown` (new — renders the static AI-prompt markdown), Tailwind v4 design tokens
already defined in `app/globals.css`.

**Spec:** The Linear issue's numbered requirements (COR-17) plus its layout sketch — no
separate spec doc; this plan's "What's there today / assumptions" section (below) plus the
task list stand in for one, matching this repo's precedent of skipping a spec doc for
similarly-scoped single-PR features (e.g. COR-14, COR-15, COR-16 shipped without one; only the
much larger COR-12 workshop feature got its own `workshops-spec.md`).

## Global constraints

- No test suite is configured in this repo (per `CLAUDE.md`) — verification steps below use
  `pnpm lint`, `pnpm build`, and manual dev-server QA instead of automated tests.
- Package manager is pnpm — never introduce an npm/yarn lockfile.
- Reuse `@/*` path alias; no relative `../../..` imports.
- This repo pins a Next.js version with breaking changes vs. training data (`AGENTS.md`) —
  read `node_modules/next/dist/docs/` before writing new App Router code if anything here looks
  off against what you remember of Next.js.
- `@vercel/blob`'s exact API surface (option names like `addRandomSuffix`, `allowOverwrite`,
  and `get()`'s return shape) should be double-checked against the installed package's type
  definitions (`node_modules/@vercel/blob/dist/index.d.ts`) or https://vercel.com/docs/vercel-blob
  before treating the code below as final — same "verify, don't assume" spirit `AGENTS.md`
  already asks for with Next.js, applied to this newly-added dependency.
- Access control: every new page/action is admin-only, gated the same way as
  `app/admin/settings/page.tsx` (page-level `redirect`) and `app/admin/users/actions.ts`
  (`requireAdmin()` re-checked inside every Server Action, since Server Actions are directly
  POSTable regardless of what the page renders).
- Scripts are stored with `access: 'private'` in Blob (rehearsal scripts include copyrighted
  monologue excerpts — same reasoning as `doron-desktop`'s `access: "private"` templates), not
  `'public'`.

## Before starting

**This is an infrastructure prerequisite, not a code task — do it (or confirm it's already
done) before Task 2, since nothing that touches `@vercel/blob` will work without it:**

1. Provision a Vercel Blob store for this project (Vercel dashboard → Storage → Create → Blob,
   or `vercel blob store add` if using the CLI) and connect it to this project.
2. Run `vercel env pull .env.local --yes` (or manually copy the value) so
   `BLOB_READ_WRITE_TOKEN` lands in your local env file. Add a blank
   `BLOB_READ_WRITE_TOKEN=` line to `.env.example` for documentation, matching the existing
   convention there (`GLUMACKI_DATABASE_URL=`, `AUTH_SECRET=`, etc.).

---

### Task 1: Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `@vercel/blob`'s `put`/`del`/`list`/`get` (consumed by Task 2), `react-markdown`'s
  default export (consumed by Task 5).

- [ ] **Step 1: Install the two new dependencies**

```bash
pnpm add @vercel/blob react-markdown
```

- [ ] **Step 2: Add the env var placeholder**

Add this line to `.env.example` (alongside the existing ones, no new section needed):

```
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 3: Verify install**

Run: `pnpm install --frozen-lockfile=false && pnpm lint`
Expected: no errors; `pnpm-lock.yaml` now includes `@vercel/blob` and `react-markdown`.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore(scripts): add @vercel/blob and react-markdown"
```

---

### Task 2: Blob-backed `lib/workshops/scripts.ts`

**Files:**
- Modify: `lib/workshops/scripts.ts`

**Interfaces:**
- Consumes: `@vercel/blob`'s `put`, `del`, `list`, `get` (Task 1).
- Produces (unchanged from today, every existing caller keeps working with zero edits):
  `type ScriptFlowEntry`, `type Script`, `type ScriptSummary`,
  `listAvailableScripts(): Promise<ScriptSummary[]>`, `getScript(slug: string): Promise<Script | null>`.
- Produces (new, consumed by Task 3): `isScriptShape(value: unknown): value is Omit<Script, 'slug'>`
  (now exported instead of private), `addScript(file: File): Promise<{ slug: string } | { error: string }>`,
  `deleteScript(slug: string): Promise<void>`.

- [ ] **Step 1: Replace the file's contents**

```ts
import { del, get, list, put } from '@vercel/blob'

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

export async function listAvailableScripts(): Promise<ScriptSummary[]> {
  const { blobs } = await list({ prefix: SCRIPTS_PREFIX, token: BLOB_TOKEN })
  const jsonBlobs = blobs.filter((blob) => blob.pathname.endsWith('.json'))

  const scripts = await Promise.all(
    jsonBlobs.map(async (blob) => {
      const slug = blob.pathname.slice(SCRIPTS_PREFIX.length, -'.json'.length)
      const script = await getScript(slug)
      return script ? { slug: script.slug, title: script.title, scene: script.scene } : null
    })
  )

  return scripts.filter((script): script is ScriptSummary => script !== null)
}

export async function getScript(slug: string): Promise<Script | null> {
  if (!isValidSlug(slug)) return null

  try {
    // list() with an exact-pathname prefix, rather than head()/get() by a
    // guessed URL, because put() below uses addRandomSuffix: false -- the
    // blob's pathname IS the slug-derived key, but its `url` (needed by
    // get()) still has to come from a live lookup, not be reconstructed.
    const { blobs } = await list({ prefix: pathnameFor(slug), token: BLOB_TOKEN, limit: 1 })
    const blob = blobs.find((b) => b.pathname === pathnameFor(slug))
    if (!blob) return null

    // get()'s return shape: verify against node_modules/@vercel/blob's type
    // defs (Global constraints, above). If it returns a bare ReadableStream
    // instead of a Response-like object, replace the next line with
    // `const raw = await new Response(await get(blob.url, { token: BLOB_TOKEN })).text()`.
    const file = await get(blob.url, { token: BLOB_TOKEN })
    const raw = await file.text()

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

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. If `get()`'s return type doesn't have `.text()`, fix per the comment in
`getScript` above and re-run.

- [ ] **Step 3: Manual smoke check (no UI yet, so via a scratch script)**

Create a throwaway file `scripts/scratch-blob-check.ts` (delete it before committing — it's
only to prove Blob connectivity before building UI on top of it):

```ts
import { addScript, deleteScript, getScript, listAvailableScripts } from '../lib/workshops/scripts'

async function main() {
  const file = new File(
    [JSON.stringify({ title: 'Scratch', scene: 'TEST', script_flow: [{ type: 'action', text: 'ok' }] })],
    'scratch-check.json',
    { type: 'application/json' }
  )
  console.log('add:', await addScript(file))
  console.log('list:', await listAvailableScripts())
  console.log('get:', await getScript('scratch-check'))
  await deleteScript('scratch-check')
  console.log('list after delete:', await listAvailableScripts())
}

main()
```

Run: `node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/scratch-blob-check.ts`
Expected: `add` returns `{ slug: 'scratch-check' }`, `list`/`get` show it, final `list` is empty
(or excludes it). Then delete the scratch file — it's not part of the feature.

```bash
rm scripts/scratch-blob-check.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/workshops/scripts.ts
git commit -m "feat(scripts): move script storage from the filesystem to Vercel Blob"
```

---

### Task 3: `app/scripts/actions.ts`

**Files:**
- Create: `app/scripts/actions.ts`

**Interfaces:**
- Consumes: `addScript`, `deleteScript` from `lib/workshops/scripts.ts` (Task 2); `auth` from `@/auth`.
- Produces: `uploadScript(formData: FormData): Promise<{ error: string } | void>`,
  `removeScript(slug: string): Promise<void>` — both consumed by Task 6 (`AddScriptDialog`) and
  Task 7 (`ScriptCardMenu`).

- [ ] **Step 1: Write the file**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { addScript, deleteScript } from '@/lib/workshops/scripts'

// Render-time gating on the page is not a security boundary -- a Server
// Action is directly POSTable, so every action here re-checks admin the
// same way app/admin/users/actions.ts's requireAdmin() does.
async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || (session.user as { role?: string }).role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function uploadScript(formData: FormData): Promise<{ error: string } | void> {
  await requireAdmin()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a JSON file to upload.' }
  }

  const result = await addScript(file)
  if ('error' in result) return result

  revalidatePath('/scripts')
}

export async function removeScript(slug: string): Promise<void> {
  await requireAdmin()
  await deleteScript(slug)
  revalidatePath('/scripts')
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/scripts/actions.ts
git commit -m "feat(scripts): add upload/delete server actions, admin-gated"
```

---

### Task 4: `app/scripts/page.tsx` and `app/scripts/[slug]/page.tsx`

**Files:**
- Create: `app/scripts/page.tsx`
- Create: `app/scripts/[slug]/page.tsx`

**Interfaces:**
- Consumes: `listAvailableScripts`, `getScript` (Task 2); `ScriptsShell` (Task 8, not built
  yet — stub it minimally in this task and finish it in Task 8, or build Task 8 first and come
  back; either order works since this task only needs `ScriptsShell`'s prop names, defined below).
- Produces: nothing new consumed elsewhere — these are leaf route files.

- [ ] **Step 1: Write the index page**

```tsx
import { redirect } from 'next/navigation'
import { promises as fs } from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { listAvailableScripts } from '@/lib/workshops/scripts'
import { ScriptsShell } from '@/components/scripts/scripts-shell'

export const metadata: Metadata = {
  title: 'Scripts — Glumački Studio',
}

async function readPromptMarkdown(): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'workshops', 'scripts', 'ai-prompt.md'), 'utf-8')
}

export default async function ScriptsIndexPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/')

  const [scripts, promptMarkdown] = await Promise.all([listAvailableScripts(), readPromptMarkdown()])

  return <ScriptsShell scripts={scripts} selected={null} promptMarkdown={promptMarkdown} />
}
```

- [ ] **Step 2: Write the selected-script page**

```tsx
import { redirect } from 'next/navigation'
import { promises as fs } from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { getScript, listAvailableScripts } from '@/lib/workshops/scripts'
import { ScriptsShell } from '@/components/scripts/scripts-shell'

export const metadata: Metadata = {
  title: 'Scripts — Glumački Studio',
}

async function readPromptMarkdown(): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'workshops', 'scripts', 'ai-prompt.md'), 'utf-8')
}

export default async function ScriptDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/')

  const [scripts, selected, promptMarkdown] = await Promise.all([
    listAvailableScripts(),
    getScript(slug),
    readPromptMarkdown(),
  ])

  if (!selected) redirect('/scripts')

  return <ScriptsShell scripts={scripts} selected={selected} promptMarkdown={promptMarkdown} />
}
```

- [ ] **Step 3: Verify types compile** (will still fail until Task 8 creates `ScriptsShell` —
  that's expected; re-run after Task 8)

Run: `pnpm exec tsc --noEmit`
Expected (after Task 8 is done): no errors.

- [ ] **Step 4: Commit** (combine with Task 8's commit if built together, or commit standalone
  once `ScriptsShell` exists)

```bash
git add app/scripts/page.tsx "app/scripts/[slug]/page.tsx"
git commit -m "feat(scripts): add /scripts and /scripts/[slug] pages"
```

---

### Task 5: `components/scripts/prompt-panel.tsx`

**Files:**
- Create: `components/scripts/prompt-panel.tsx`

**Interfaces:**
- Consumes: `react-markdown` (Task 1).
- Produces: `PromptPanel({ markdown, onClose }: { markdown: string; onClose: () => void })`,
  consumed by Task 9 (`ScriptsPanels`).

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

// Renders workshops/scripts/ai-prompt.md as-is (COR-17: "read from a static
// markdown file and present as markdown"). Copy button copies the raw
// markdown string, not the rendered HTML/text -- pasting the source into an
// external AI chat is what step 3 of the issue asks for.
export function PromptPanel({ markdown, onClose }: { markdown: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex min-h-0 w-[420px] shrink-0 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink">
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">
          AI conversion prompt
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-ink-foreground/16 px-3 py-1.5 text-xs font-semibold text-ink-foreground transition-colors hover:border-ink-foreground/30"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prompt"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-foreground/55 hover:bg-ink-card hover:text-ink-foreground"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-ink-foreground/14 bg-black/40 px-5 py-4 text-[13px] leading-relaxed text-ink-foreground/85">
        <article className="prose prose-invert prose-sm max-w-none prose-headings:text-ink-foreground prose-strong:text-ink-foreground prose-code:text-ink-foreground">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
```

Note: if `@tailwindcss/typography`'s `prose` classes aren't available (this repo has no
`tailwind.config.*` and defines its theme via `@theme inline` in `app/globals.css` — check
whether the `prose` plugin is registered there before relying on it). If not registered, drop
the `prose*` classes and style `article`'s children directly instead (e.g.
`[&_strong]:text-ink-foreground [&_h2]:mt-4 [&_h2]:font-semibold [&_code]:rounded [&_code]:bg-ink-card [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-ink-card [&_pre]:p-3`)
rather than installing a new Tailwind plugin for one panel.

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/scripts/prompt-panel.tsx
git commit -m "feat(scripts): add AI-prompt panel with copy-to-clipboard"
```

---

### Task 6: `components/scripts/add-script-dialog.tsx`

**Files:**
- Create: `components/scripts/add-script-dialog.tsx`

**Interfaces:**
- Consumes: `uploadScript` from `app/scripts/actions.ts` (Task 3).
- Produces: `AddScriptDialog({ compact }: { compact?: boolean })`, consumed by Task 9
  (`ScriptsPanels`, `compact={false}`) and Task 10 (`ScriptsSidebarList`, `compact={true}`).

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useRef, useState } from 'react'
import { uploadScript } from '@/app/scripts/actions'

// Two independent instances render this (sidebar "+" and the top toolbar's
// "+ Add script"), each with its own <dialog> -- simpler than lifting a
// shared ref up to a common parent (see workshop-card-menu.tsx for that
// pattern) since, unlike per-workshop dialogs, there's exactly one upload
// action and only one instance is ever open at a time.
export function AddScriptDialog({ compact = false }: { compact?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function open() {
    setError(null)
    dialogRef.current?.showModal()
  }

  async function handleSubmit(formData: FormData) {
    setError(null)
    setPending(true)
    try {
      const result = await uploadScript(formData)
      if (result && 'error' in result) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
      dialogRef.current?.close()
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Add script"
        className={
          compact
            ? 'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-ink-foreground/16 text-ink-foreground/70 transition-colors hover:border-ink-foreground/30 hover:text-ink-foreground'
            : 'inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5'
        }
      >
        {compact ? '+' : '+ Add script'}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto max-w-sm border-0 bg-transparent p-0 backdrop:bg-black/50"
      >
        <div className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
          <p className="text-lg font-semibold">Add a script</p>
          <p className="mt-1 text-sm text-ink-foreground/60">
            Upload a JSON file matching the script schema (title, scene, script_flow).
          </p>

          <form ref={formRef} action={handleSubmit} className="mt-5 flex flex-col gap-3">
            <input
              type="file"
              name="file"
              accept="application/json,.json"
              required
              className="rounded-lg border border-ink-foreground/16 bg-ink px-3 py-2 text-sm text-ink-foreground file:mr-3 file:rounded-md file:border-0 file:bg-ink-foreground/10 file:px-3 file:py-1.5 file:text-ink-foreground"
            />

            {error && <p className="text-sm text-[#f0a8b4]">{error}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                {pending ? 'Uploading…' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/scripts/add-script-dialog.tsx
git commit -m "feat(scripts): add script upload dialog"
```

---

### Task 7: `components/scripts/script-card-menu.tsx`

**Files:**
- Create: `components/scripts/script-card-menu.tsx`

**Interfaces:**
- Consumes: `removeScript` from `app/scripts/actions.ts` (Task 3).
- Produces: `ScriptCardMenu({ slug, title }: { slug: string; title: string })`, consumed by
  Task 10 (`ScriptsSidebarList`).

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeScript } from '@/app/scripts/actions'

export function ScriptCardMenu({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const deleteDialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleDelete() {
    await removeScript(slug)
    deleteDialogRef.current?.close()
    router.push('/scripts')
    router.refresh()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Script options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-ink-foreground/55 hover:bg-ink hover:text-ink-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8"></circle>
          <circle cx="12" cy="12" r="1.8"></circle>
          <circle cx="12" cy="19" r="1.8"></circle>
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-[calc(100%+6px)] z-10 w-[160px] rounded-lg border border-ink-foreground/16 bg-ink-card py-1 shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              deleteDialogRef.current?.showModal()
            }}
            className="block w-full px-4 py-2 text-left text-[13.5px] font-medium text-[#f0a8b4] hover:bg-ink"
          >
            Delete
          </button>
        </div>
      )}

      <dialog
        ref={deleteDialogRef}
        onClick={(e) => {
          if (e.target === deleteDialogRef.current) deleteDialogRef.current?.close()
        }}
        className="m-auto max-w-sm border-0 bg-transparent p-0 backdrop:bg-black/50"
      >
        <div className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
          <p className="text-lg font-semibold">Delete script?</p>
          <p className="mt-2 text-sm text-ink-foreground/60">
            Delete <span className="font-medium text-ink-foreground">{title}</span>? Any workshop
            with it attached will show &ldquo;no script attached&rdquo; afterward. This cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => deleteDialogRef.current?.close()}
              className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Delete
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/scripts/script-card-menu.tsx
git commit -m "feat(scripts): add delete-script kebab menu"
```

---

### Task 8: `components/scripts/scripts-sidebar-list.tsx`

**Files:**
- Create: `components/scripts/scripts-sidebar-list.tsx`

**Interfaces:**
- Consumes: `AddScriptDialog` (Task 6), `ScriptCardMenu` (Task 7), `ScriptSummary` type from
  `lib/workshops/scripts.ts` (Task 2).
- Produces: `ScriptsSidebarList({ scripts, selectedSlug }: { scripts: ScriptSummary[]; selectedSlug: string | null })`,
  consumed by Task 9 (`ScriptsShell`).

- [ ] **Step 1: Write the component**

```tsx
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AddScriptDialog } from '@/components/scripts/add-script-dialog'
import { ScriptCardMenu } from '@/components/scripts/script-card-menu'
import type { ScriptSummary } from '@/lib/workshops/scripts'

// No resize handle, unlike workshop-sidebar-list.tsx -- not in the COR-17
// sketch and not asked for; a fixed width keeps this smaller and avoids
// scope creep beyond the issue.
const WIDTH = 320

export function ScriptsSidebarList({ scripts, selectedSlug }: { scripts: ScriptSummary[]; selectedSlug: string | null }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return scripts
    return scripts.filter((script) => script.title.toLowerCase().includes(q))
  }, [scripts, query])

  return (
    <div className="flex h-full min-h-0 shrink-0 flex-col gap-4 p-6" style={{ width: WIDTH }}>
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-foreground/45"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scripts"
            className="h-[38px] w-full rounded-[10px] border border-ink-foreground/16 bg-ink pl-[34px] pr-3 text-[13.5px] text-ink-foreground placeholder:text-ink-foreground/45 focus:outline-none"
          />
        </div>
        <AddScriptDialog compact />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-1 text-sm text-ink-foreground/55">
            {scripts.length === 0 ? 'No scripts uploaded yet.' : `No scripts match "${query}".`}
          </p>
        ) : (
          filtered.map((script) => (
            <div
              key={script.slug}
              className={
                script.slug === selectedSlug
                  ? 'relative rounded-xl border-2 border-primary bg-ink-card px-4 py-3.5'
                  : 'relative rounded-xl border border-ink-foreground/16 bg-ink-card px-4 py-3.5 transition-colors hover:border-ink-foreground/30'
              }
            >
              {/* Same reasoning as workshop-card.tsx: the kebab menu can't be
                  a descendant of this Link (nested interactive elements are
                  invalid HTML), so it's a positioned sibling. */}
              <Link href={`/scripts/${script.slug}`} className="block pr-7">
                <p className="truncate text-[15px] font-semibold text-ink-foreground">{script.title}</p>
                <p className="mt-1 truncate text-xs text-ink-foreground/55">{script.scene}</p>
              </Link>
              <div className="absolute right-3 top-3.5">
                <ScriptCardMenu slug={script.slug} title={script.title} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/scripts/scripts-sidebar-list.tsx
git commit -m "feat(scripts): add scripts sidebar list with search and delete"
```

---

### Task 9: `components/scripts/script-preview-panel.tsx` and `components/scripts/scripts-panels.tsx`

**Files:**
- Create: `components/scripts/script-preview-panel.tsx`
- Create: `components/scripts/scripts-panels.tsx`

**Interfaces:**
- Consumes: `ScriptFlow` from `components/workshops/script-flow.tsx` (existing, unchanged),
  `AddScriptDialog` (Task 6), `PromptPanel` (Task 5), `Script` type from
  `lib/workshops/scripts.ts` (Task 2).
- Produces: `ScriptPreviewPanel({ script }: { script: Script | null })`,
  `ScriptsPanels({ script, promptMarkdown }: { script: Script | null; promptMarkdown: string })`
  — the latter consumed by Task 10 (`ScriptsShell`).

- [ ] **Step 1: Write `script-preview-panel.tsx`**

```tsx
import { ScriptFlow } from '@/components/workshops/script-flow'
import type { Script } from '@/lib/workshops/scripts'

// The middle "Script area" from the COR-17 sketch. Reuses ScriptFlow
// directly -- no split-by-character or mark-a-part controls, since those
// are workshop-member-specific (script-panel.tsx) and don't apply to a
// management page with no rehearsal group attached.
export function ScriptPreviewPanel({ script }: { script: Script | null }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink">
      <div className="shrink-0 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">Script</p>
        <p className="mt-0.5 truncate text-[15px] font-semibold text-ink-foreground">
          {script ? script.title : 'No script selected'}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ink-foreground/14 px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {script ? (
          <ScriptFlow
            script={script}
            splitByCharacter={false}
            characters={[]}
            colors={{}}
            markedCharacter={null}
            highlightColor=""
          />
        ) : (
          <p className="text-sm text-ink-foreground/55">Select a script from the list on the left.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `scripts-panels.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { AddScriptDialog } from '@/components/scripts/add-script-dialog'
import { PromptPanel } from '@/components/scripts/prompt-panel'
import { ScriptPreviewPanel } from '@/components/scripts/script-preview-panel'
import type { Script } from '@/lib/workshops/scripts'

export function ScriptsPanels({ script, promptMarkdown }: { script: Script | null; promptMarkdown: string }) {
  const [promptOpen, setPromptOpen] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setPromptOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-foreground/16 px-4 py-2.5 text-sm font-semibold text-ink-foreground transition-colors hover:border-ink-foreground/30"
        >
          Prompt
        </button>
        <AddScriptDialog />
      </div>

      <div className="flex min-h-0 flex-1 gap-5">
        <ScriptPreviewPanel script={script} />
        {promptOpen && <PromptPanel markdown={promptMarkdown} onClose={() => setPromptOpen(false)} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/scripts/script-preview-panel.tsx components/scripts/scripts-panels.tsx
git commit -m "feat(scripts): add script preview panel and prompt toggle"
```

---

### Task 10: `components/scripts/scripts-shell.tsx`

**Files:**
- Create: `components/scripts/scripts-shell.tsx`

**Interfaces:**
- Consumes: `ScriptsSidebarList` (Task 8), `ScriptsPanels` (Task 9), `UserMenu` (existing,
  unchanged), `ScriptSummary`/`Script` types from `lib/workshops/scripts.ts` (Task 2).
- Produces: `ScriptsShell({ scripts, selected, promptMarkdown }: { scripts: ScriptSummary[]; selected: Script | null; promptMarkdown: string })`
  — consumed by Task 4's two pages.

- [ ] **Step 1: Write the component**

```tsx
import Link from 'next/link'
import { UserMenu } from '@/components/user-menu'
import { ScriptsPanels } from '@/components/scripts/scripts-panels'
import { ScriptsSidebarList } from '@/components/scripts/scripts-sidebar-list'
import type { Script, ScriptSummary } from '@/lib/workshops/scripts'

// Server Component, structurally copied from workshop-shell.tsx -- same
// h-screen + overflow-hidden reasoning: without a real height ceiling here,
// the flex-1 panels below never become a bounded box for overflow-y-auto to
// scroll against.
export function ScriptsShell({
  scripts,
  selected,
  promptMarkdown,
}: {
  scripts: ScriptSummary[]
  selected: Script | null
  promptMarkdown: string
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink text-ink-foreground">
      <div className="flex items-center justify-between border-b border-ink-foreground/16 px-8 py-[18px]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="Back to site"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-foreground/16 text-ink-foreground/55 transition-colors hover:border-ink-foreground/30 hover:text-ink-foreground"
          >
            ←
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-foreground/55">Admin</p>
            <p className="mt-0.5 text-[21px] font-semibold tracking-tight">Scripts</p>
          </div>
        </div>

        <UserMenu />
      </div>

      <div className="flex min-h-0 flex-1">
        <ScriptsSidebarList scripts={scripts} selectedSlug={selected?.slug ?? null} />
        <div className="flex min-h-0 flex-1 flex-col px-8 py-6">
          <ScriptsPanels script={selected} promptMarkdown={promptMarkdown} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile (now Task 4's pages should also compile clean)**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/scripts/scripts-shell.tsx
git commit -m "feat(scripts): add scripts page shell"
```

---

### Task 11: Nav entry point in `components/workshops/workshop-shell.tsx`

**Files:**
- Modify: `components/workshops/workshop-shell.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new consumed elsewhere.

**Note:** this is the one genuinely ambiguous part of the issue ("add scripts button in the
main page top bar"). The sketch's chrome (dark background, rounded Back button, circular
avatar) matches `WorkshopShell`'s top bar, not the light marketing `SiteHeader` used on `/` —
this task assumes the former. If that's wrong, this is the only task to redo; nothing else in
the plan depends on where the entry point lives.

- [ ] **Step 1: Add the session import and admin check**

In `components/workshops/workshop-shell.tsx`, this is currently a Server Component with no
`auth()` call. Add one, and a "Scripts" link next to `UserMenu`, visible only for admins
(mirrors `UserMenu`'s own admin-gated "Settings" link):

```tsx
import Link from 'next/link'
import { auth } from '@/auth'
import { UserMenu } from '@/components/user-menu'
// ...existing imports...
```

Inside the component body, before the returned JSX, add:

```tsx
const session = await auth()
const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
```

(This makes `WorkshopShell` `async` if it wasn't already reading `session` — check the current
signature; it's already an `async function` receiving server-fetched props, so this is just one
more `await` alongside the props it already has.)

- [ ] **Step 2: Render the link**

Replace:

```tsx
        <UserMenu />
```

with:

```tsx
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/scripts"
              className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground transition-colors hover:border-ink-foreground/30"
            >
              Scripts
            </Link>
          )}
          <UserMenu />
        </div>
```

- [ ] **Step 3: Verify types compile and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/workshops/workshop-shell.tsx
git commit -m "feat(scripts): link to /scripts from the workshops top bar (admin only)"
```

---

### Task 12: Manual verification pass

**Files:** none (verification only).

- [ ] **Step 1: Confirm `BLOB_READ_WRITE_TOKEN` is set locally** (from "Before starting" above)

Run: `grep BLOB_READ_WRITE_TOKEN .env`
Expected: a non-empty value.

- [ ] **Step 2: Start the dev server and walk the flow as an admin**

Per `CLAUDE.md`, actually exercise this in a browser before calling it done (this repo has no
test suite, so this is the real check):

1. Sign in as an admin user, go to `/workshops`, confirm the "Scripts" link appears in the top
   bar (and confirm it's absent for a non-admin session, or when signed out entirely — hitting
   `/scripts` directly should redirect to `/` or `/login` respectively).
2. Click it → lands on `/scripts` with an empty sidebar (assuming no scripts uploaded yet).
3. Click "+ Add script" (or the sidebar "+"), upload a small test JSON matching the schema
   (e.g. copy `workshops/scripts/AWAKWNING-LEONARD-AND-SAYER.json`'s shape). Confirm it appears
   in the sidebar list immediately after the dialog closes.
4. Click the uploaded script's row → URL becomes `/scripts/<slug>`, the middle panel renders
   its `script_flow` via `ScriptFlow`.
5. Click "Prompt" → the right panel opens showing the rendered markdown from
   `workshops/scripts/ai-prompt.md`; click "Copy" and paste somewhere to confirm the clipboard
   holds the raw markdown (headings/bold/code-fence markers included, not stripped).
6. Open the row's kebab menu → Delete → confirm dialog → confirm the row disappears and the
   URL returns to `/scripts`.
7. Go to `/workshops`, open (or create) a workshop, attach a script via its existing "Attach a
   script" dropdown (`script-panel.tsx`) — confirm a script uploaded through `/scripts` shows
   up there too, proving Task 2's swap didn't break the existing attach flow.

- [ ] **Step 3: Run the full lint/build gate**

Run: `pnpm lint && pnpm build`
Expected: both pass clean.

- [ ] **Step 4: Final commit if anything was fixed during manual QA**

```bash
git add -A
git commit -m "fix(scripts): address manual QA findings"
```

(Skip this step entirely if QA found nothing to fix.)

---

## Self-review notes

- **Spec coverage:** issue steps 1–7 map to tasks — 1/2 → Task 11 (nav entry point); 3 → Task 5
  (prompt panel); 4 → Task 2 + Task 6 (upload, blob storage, env-prefixed path); 5 → Task 2 +
  Task 8 (list from Blob); 6 → Task 7 (kebab delete); 7 → Task 9 (`ScriptPreviewPanel` reusing
  `ScriptFlow`). The three clarified decisions (Blob replaces the filesystem, JSON-only
  uploads, admin-only access) are threaded through Tasks 2, 3, 4, 6, 11.
- **Type consistency:** `ScriptSummary`/`Script` (Task 2) are the same shapes
  `WorkshopFormDialog`/`ScriptPanel` already import — verified by keeping Task 2's exports
  byte-for-byte name-compatible with today's `lib/workshops/scripts.ts`. `AddScriptDialog`'s
  `compact` prop, `ScriptsPanels`' `{ script, promptMarkdown }`, and `ScriptsShell`'s
  `{ scripts, selected, promptMarkdown }` are used identically at every call site across Tasks
  4, 8, 9, 10.
- **Known open risk:** the exact `@vercel/blob` `get()` return shape and the `addRandomSuffix`/
  `allowOverwrite` option names on `put()` are flagged inline in Task 2 for the implementer to
  verify against the installed package version — this is the one place in the plan where I'm
  not fully certain of the current SDK surface.
