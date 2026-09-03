'use client'

import { useState } from 'react'
import { ScriptFlow } from '@/components/workshops/script-flow'
import { assignCharacterColors, canSplitByCharacter, getSpeakingCharacters } from '@/lib/workshops/script-colors'
import type { Script } from '@/lib/workshops/scripts'

// The middle "Script area" from the COR-17 sketch. Reuses ScriptFlow
// directly, including the split-by-character toggle (script-panel.tsx's
// rule: needs 2-3 speaking characters) since that's purely script-data-
// driven. No mark-a-part control here -- "Mark for me" needs a workshop
// member's own `part`, and there's no member/rehearsal context on this
// admin page. Character coloring is always applied (assignCharacterColors/
// getSpeakingCharacters, both pure functions) so the preview matches what
// /workshops shows, per COR-17's "exactly as in the workshops" requirement.
export function ScriptPreviewPanel({ script }: { script: Script | null }) {
  const [splitByCharacter, setSplitByCharacter] = useState(false)

  const characters = script ? getSpeakingCharacters(script) : []
  const colors = assignCharacterColors(characters)
  const canSplit = script !== null && canSplitByCharacter(script)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink">
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">Script</p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-ink-foreground">
            {script ? script.title : 'No script selected'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSplitByCharacter((v) => !v)}
          disabled={!canSplit}
          aria-label={splitByCharacter ? 'Show script as one column' : 'Split script by character'}
          title={
            canSplit
              ? splitByCharacter
                ? 'Show script as one column'
                : 'Split script by character'
              : 'Needs 2-3 speaking characters to split'
          }
          className={
            splitByCharacter
              ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary disabled:pointer-events-none disabled:opacity-30'
              : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-foreground/55 hover:bg-ink-card hover:text-ink-foreground disabled:pointer-events-none disabled:opacity-30'
          }
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="7.5" height="16" rx="1.5"></rect>
            <rect x="13.5" y="4" width="7.5" height="16" rx="1.5"></rect>
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ink-foreground/14 px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {script ? (
          <ScriptFlow
            script={script}
            splitByCharacter={splitByCharacter && canSplit}
            characters={characters}
            colors={colors}
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
