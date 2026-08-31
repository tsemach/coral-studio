import { promises as fs } from 'fs'
import path from 'path'

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

const SCRIPTS_DIR = path.join(process.cwd(), 'workshops', 'scripts')

function isScriptFlowEntry(value: unknown): value is ScriptFlowEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  if (entry.type === 'action') return typeof entry.text === 'string'
  if (entry.type === 'dialogue') return typeof entry.character === 'string' && typeof entry.line === 'string'
  return false
}

function isScriptShape(value: unknown): value is Omit<Script, 'slug'> {
  if (typeof value !== 'object' || value === null) return false
  const script = value as Record<string, unknown>
  return (
    typeof script.title === 'string' &&
    typeof script.scene === 'string' &&
    Array.isArray(script.script_flow) &&
    script.script_flow.every(isScriptFlowEntry)
  )
}

// Only .json files under workshops/scripts/ are usable -- most of that
// directory today is PDFs/a .docx with no .json counterpart yet (a content
// gap, not a code problem; see docs/workshops/design.md).
export async function listAvailableScripts(): Promise<ScriptSummary[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(SCRIPTS_DIR)
  } catch {
    return []
  }

  const jsonFiles = entries.filter((name) => name.endsWith('.json'))
  const scripts = await Promise.all(
    jsonFiles.map(async (fileName) => {
      const slug = fileName.replace(/\.json$/, '')
      const script = await getScript(slug)
      return script ? { slug: script.slug, title: script.title, scene: script.scene } : null
    })
  )

  return scripts.filter((script): script is ScriptSummary => script !== null)
}

export async function getScript(slug: string): Promise<Script | null> {
  // slug is meant to only ever come from listAvailableScripts()'s own output
  // (via workshops.scriptSlug, set by setWorkshopScript()), but guard the
  // filesystem path the same way regardless of where a slug came from.
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) return null

  try {
    const raw = await fs.readFile(path.join(SCRIPTS_DIR, `${slug}.json`), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (!isScriptShape(parsed)) return null
    return { slug, ...parsed }
  } catch {
    return null
  }
}
