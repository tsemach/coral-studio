'use client'

import { useEffect, useRef, useState } from 'react'
import type { DialogHandle } from '@/components/workshops/add-member-dialog'
import { DEFAULT_SCRIPT_FONT_SIZE, FontSizeControl } from '@/components/workshops/font-size-control'
import { MARK_COLORS, MarkPartDialog } from '@/components/workshops/mark-part-dialog'
import { ScriptFlow } from '@/components/workshops/script-flow'
import { assignCharacterColors, canSplitByCharacter, getSpeakingCharacters } from '@/lib/workshops/script-colors'
import type { Script } from '@/lib/workshops/scripts'

// The middle "Script area" from the COR-17 sketch. Reuses ScriptFlow
// directly, including the split-by-character toggle (script-panel.tsx's
// rule: needs 2-3 speaking characters) and mark-a-part -- both are
// script-data-driven, and MarkPartDialog already degrades gracefully with
// myPart={null} (just hides the "Mark for me" shortcut), so neither needs
// the workshop-member context this admin page doesn't have. No "expand"
// icon: unlike workshops' WorkshopDetailsPanel, this panel's only sibling
// (the Prompt panel) already has its own independent open/close toggle, so
// a second one here would just duplicate it. Character coloring is always
// applied (assignCharacterColors/getSpeakingCharacters, both pure
// functions) so the preview matches what /workshops shows, per COR-17's
// "exactly as in the workshops" requirement.
export function ScriptPreviewPanel({ script }: { script: Script | null }) {
  const [splitByCharacter, setSplitByCharacter] = useState(false)
  const [fontSize, setFontSize] = useState(DEFAULT_SCRIPT_FONT_SIZE)
  const [markedCharacter, setMarkedCharacter] = useState<string | null>(null)
  // Survives an erase, matching script-panel.tsx's rule 5 -- reopening the
  // dialog still shows the last choice; only a new mark or a script swap
  // replaces it.
  const [lastSelected, setLastSelected] = useState<string | null>(null)
  const [highlightColor, setHighlightColor] = useState(MARK_COLORS[0])
  const markDialogRef = useRef<DialogHandle>(null)

  const characters = script ? getSpeakingCharacters(script) : []
  const colors = assignCharacterColors(characters)
  const canSplit = script !== null && canSplitByCharacter(script)
  const canMark = script !== null && characters.length > 0

  // A stale mark from a previously-selected script can't apply to this one.
  useEffect(() => {
    setMarkedCharacter(null)
  }, [script?.slug])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink">
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">Script</p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-ink-foreground">
            {script ? script.title : 'No script selected'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <FontSizeControl fontSize={fontSize} onChange={setFontSize} />
          <button
            type="button"
            onClick={() => (markedCharacter ? setMarkedCharacter(null) : markDialogRef.current?.open())}
            disabled={!canMark}
            aria-label={markedCharacter ? 'Erase part mark' : 'Mark a part'}
            title={markedCharacter ? 'Erase part mark' : canMark ? 'Mark a part' : 'Attach a script with speaking characters to mark a part'}
            className={
              markedCharacter
                ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary disabled:pointer-events-none disabled:opacity-30'
                : 'flex h-8 w-8 items-center justify-center rounded-lg text-ink-foreground/55 hover:bg-ink-card hover:text-ink-foreground disabled:pointer-events-none disabled:opacity-30'
            }
          >
            {markedCharacter ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 20H8L3.5 15.5a2 2 0 0 1 0-2.83l9-9a2 2 0 0 1 2.83 0l5 5a2 2 0 0 1 0 2.83L13.5 18.17"></path>
                <path d="M9 13l6 6"></path>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20l3.5-1 10-10-2.5-2.5-10 10L4 20z"></path>
                <path d="M13.5 6.5l2.5 2.5"></path>
                <path d="M4 20l1-3.5"></path>
              </svg>
            )}
          </button>
          <MarkPartDialog
            ref={markDialogRef}
            characters={characters}
            colors={colors}
            myPart={null}
            defaultSelected={lastSelected}
            onSelect={(character) => {
              setMarkedCharacter(character)
              setLastSelected(character)
            }}
            highlightColor={highlightColor}
            onHighlightColorChange={setHighlightColor}
          />
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
                ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary disabled:pointer-events-none disabled:opacity-30'
                : 'flex h-8 w-8 items-center justify-center rounded-lg text-ink-foreground/55 hover:bg-ink-card hover:text-ink-foreground disabled:pointer-events-none disabled:opacity-30'
            }
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="7.5" height="16" rx="1.5"></rect>
              <rect x="13.5" y="4" width="7.5" height="16" rx="1.5"></rect>
            </svg>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ink-foreground/14 px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {script ? (
          <ScriptFlow
            script={script}
            splitByCharacter={splitByCharacter && canSplit}
            characters={characters}
            colors={colors}
            markedCharacter={markedCharacter}
            highlightColor={highlightColor}
            fontSize={fontSize}
          />
        ) : (
          <p className="text-sm text-ink-foreground/55">Select a script from the list on the left.</p>
        )}
      </div>
    </div>
  )
}
