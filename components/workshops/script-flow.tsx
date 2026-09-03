import { canSplitByCharacter } from '@/lib/workshops/script-colors'
import type { Script } from '@/lib/workshops/scripts'

// COR-16: the mark-a-part highlight, applied to a line whose character
// equals markedCharacter (in either view below); its background color comes
// from highlightColor (user-chosen in MarkPartDialog), not a fixed class.
// justify-self-start overrides the split view's grid-cell stretch (that view
// is left-aligned already, so start-aligning the shrunk box matches it);
// self-center overrides the single-column view's flex-col stretch while
// keeping it centered like the view's other text-center content -- self-start
// there would un-stretch it but also left-align it, jumping it out of line
// with the surrounding centered text. One of the two applies depending on
// which view is active.
const MARK_CLASSNAME = 'self-center justify-self-start rounded px-1 text-ink'

export function ScriptFlow({
  script,
  splitByCharacter,
  characters,
  colors,
  markedCharacter,
  highlightColor,
  fontSize,
  boldMarked,
}: {
  script: Script
  splitByCharacter: boolean
  characters: string[]
  colors: Record<string, string>
  markedCharacter: string | null
  highlightColor: string
  fontSize: number
  boldMarked: boolean
}) {
  // Only the marked character's lines can go bold -- the toggle has no
  // effect on anything else in the script.
  const markClassName = boldMarked ? `${MARK_CLASSNAME} font-bold` : MARK_CLASSNAME
  // Falls back to the single-column view below even if splitByCharacter is
  // true -- the toggle button is disabled whenever this is false, but state
  // can still go stale for a beat (e.g. the attached script changes out from
  // under an already-split view), and this is what keeps that safe rather
  // than rendering a broken partial split.
  if (splitByCharacter && canSplitByCharacter(script)) {
    const columns = `repeat(${characters.length}, 1fr)`

    return (
      <div className="flex flex-col gap-3 leading-relaxed" style={{ fontSize }}>
        {/* Stays visible while the column below it scrolls, so a long scene
            never loses track of which column belongs to whom. text-[0.8em]
            keeps this proportional to the surrounding fontSize (was a fixed
            11px against a fixed 13.5px base) instead of staying a flat size
            while the rest of the script scales via the font-size control. */}
        <div className="sticky top-0 z-10 -mx-5 -mt-4 grid gap-4 bg-ink px-5 pb-3 pt-4" style={{ gridTemplateColumns: columns }}>
          {characters.map((character) => (
            <p
              key={character}
              className="truncate text-center text-[0.8em] font-bold uppercase tracking-[0.08em]"
              style={{ color: colors[character] }}
            >
              {character}
            </p>
          ))}
        </div>

        {script.script_flow.map((entry, index) =>
          entry.type === 'action' ? (
            // COR-14 rule 4: action lines span the whole width, not a column,
            // and are centered within it (also applied to the single-column
            // view below, for consistency between the two modes).
            <p key={index} className="text-center italic text-ink-foreground/55">
              {entry.text}
            </p>
          ) : (
            // Every entry -- action or dialogue -- gets its own row, in
            // document order, so the row sequence alone preserves the
            // original back-and-forth (rule 3). A dialogue row fills only
            // its speaker's column here; the rest stay empty divs, which is
            // what produces the vertical stagger between columns without
            // needing any explicit row/line-count math.
            <div key={index} className="grid gap-4" style={{ gridTemplateColumns: columns }}>
              {characters.map((character) =>
                character === entry.character ? (
                  <p
                    key={character}
                    className={character === markedCharacter ? markClassName : undefined}
                    style={character === markedCharacter ? { backgroundColor: highlightColor } : undefined}
                  >
                    {entry.line}
                  </p>
                ) : (
                  <div key={character} aria-hidden="true" />
                )
              )}
            </div>
          )
        )}
      </div>
    )
  }

  // text-center on the container, not repeated per-line -- text-align
  // inherits, so both the action paragraphs and the character-name/line
  // pairs below pick it up for free. max-w-4xl + mx-auto caps line length so
  // it doesn't run edge-to-edge in a very wide container (a full-width
  // /scripts preview, or workshops' expanded script panel) -- narrower than
  // that, this cap doesn't engage at all (the container's own width already
  // wins), which is why workshops' side-by-side layout (narrower script
  // panel, sharing the row with WorkshopDetailsPanel) never showed this.
  // 4xl rather than the original 2xl: 2xl left a visibly large empty gutter
  // once the container was wide enough for the cap to actually apply.
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 text-center leading-loose" style={{ fontSize }}>
      {script.script_flow.map((entry, index) =>
        entry.type === 'action' ? (
          <p key={index} className="italic text-ink-foreground/55">
            {entry.text}
          </p>
        ) : (
          // Name on its own line, uppercase, colored per character (unchanged
          // coloring -- only the layout moved); the line itself sits directly
          // beneath it in the default text color, also its own line. text-[0.93em]
          // keeps it proportional to fontSize (was a flat 12.5px against a
          // flat 13.5px base) rather than staying fixed while the font-size
          // control scales everything else.
          <div key={index} className="flex flex-col gap-0.5">
            <p className="text-[0.93em] font-bold uppercase tracking-[0.04em]" style={{ color: colors[entry.character] }}>
              {entry.character}
            </p>
            <p
              className={entry.character === markedCharacter ? markClassName : undefined}
              style={entry.character === markedCharacter ? { backgroundColor: highlightColor } : undefined}
            >
              {entry.line}
            </p>
          </div>
        )
      )}
    </div>
  )
}
