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
