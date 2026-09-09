// Type-only import: lib/workshops/scripts.ts uses @vercel/blob at runtime,
// so it can only be imported from server code, but this file (pure
// functions, no server-only imports) needs to be callable from
// script-panel.tsx ('use client'). A `type` import is erased at compile
// time and doesn't pull in scripts.ts's runtime code.
import type { Script } from '@/lib/workshops/scripts'

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
