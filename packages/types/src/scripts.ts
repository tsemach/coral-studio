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

// React Native's color parser (@react-native/normalize-colors) has no oklch()
// support -- only hex, named colors, rgb()/rgba(), hsl()/hsla(), hwb(). Same
// hue rotation as assignCharacterColors(), but in a classic comma-separated
// hsl() string the RN parser actually accepts, for use on the mobile app's
// native runtime (not web, where react-native-web hands the string straight
// to CSS and oklch() would have worked).
export function assignCharacterColorsRN(characters: string[]): Record<string, string> {
  const colors: Record<string, string> = {}
  let index = 0

  for (const character of characters) {
    if (character in colors) continue
    colors[character] = `hsl(${HUES[index % HUES.length]}, 60%, 72%)`
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
