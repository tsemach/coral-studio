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
  // Mirrors the old filesystem version's try/catch: this is called
  // unconditionally from every /workshops page view, so a Blob
  // misconfiguration or outage (bad/missing token, auth failure, rate
  // limit) must degrade to "no scripts available" rather than taking down
  // the entire pre-existing workshops feature.
  try {
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
  } catch {
    return []
  }
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
