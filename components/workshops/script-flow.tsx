import { assignCharacterColors, canSplitByCharacter, getSpeakingCharacters } from '@/lib/workshops/script-colors'
import type { Script } from '@/lib/workshops/scripts'

export function ScriptFlow({ script, splitByCharacter }: { script: Script; splitByCharacter: boolean }) {
  const characters = getSpeakingCharacters(script)
  const colors = assignCharacterColors(characters)

  // Falls back to the single-column view below even if splitByCharacter is
  // true -- the toggle button is disabled whenever this is false, but state
  // can still go stale for a beat (e.g. the attached script changes out from
  // under an already-split view), and this is what keeps that safe rather
  // than rendering a broken partial split.
  if (splitByCharacter && canSplitByCharacter(script)) {
    const columns = `repeat(${characters.length}, 1fr)`

    return (
      <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed">
        {/* Stays visible while the column below it scrolls, so a long scene
            never loses track of which column belongs to whom. */}
        <div className="sticky top-0 z-10 -mx-5 -mt-4 grid gap-4 bg-ink px-5 pb-3 pt-4" style={{ gridTemplateColumns: columns }}>
          {characters.map((character) => (
            <p
              key={character}
              className="truncate text-center text-[11px] font-bold uppercase tracking-[0.08em]"
              style={{ color: colors[character] }}
            >
              {character}
            </p>
          ))}
        </div>

        {script.script_flow.map((entry, index) =>
          entry.type === 'action' ? (
            // COR-14 rule 4: action lines span the whole width, not a column.
            <p key={index} className="italic text-ink-foreground/55">
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
                  <p key={character}>{entry.line}</p>
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

  return (
    <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed">
      {script.script_flow.map((entry, index) =>
        entry.type === 'action' ? (
          <p key={index} className="italic text-ink-foreground/55">
            {entry.text}
          </p>
        ) : (
          <p key={index}>
            <span className="mr-1.5 text-[12.5px] font-bold tracking-[0.04em]" style={{ color: colors[entry.character] }}>
              {entry.character}
            </span>
            {entry.line}
          </p>
        )
      )}
    </div>
  )
}
