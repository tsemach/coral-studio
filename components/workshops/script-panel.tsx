'use client'

import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { setWorkshopScript } from '@/app/workshops/actions'
import { MARK_COLORS, MarkPartDialog } from '@/components/workshops/mark-part-dialog'
import type { DialogHandle } from '@/components/workshops/add-member-dialog'
import { DEFAULT_SCRIPT_FONT_SIZE, FontSizeControl } from '@/components/workshops/font-size-control'
import { ScriptFlow } from '@/components/workshops/script-flow'
import { assignCharacterColors, canSplitByCharacter, getSpeakingCharacters } from '@/lib/workshops/script-colors'
import type { WorkshopMember } from '@/lib/workshops/queries'
import type { Script, ScriptSummary } from '@/lib/workshops/scripts'

const MIN_WIDTH = 280
const MAX_WIDTH = 1100

export function ScriptPanel({
  workshopId,
  script,
  availableScripts,
  members,
  expanded,
  onToggleExpanded,
}: {
  workshopId: string
  script: Script | null
  availableScripts: ScriptSummary[]
  members: WorkshopMember[]
  expanded: boolean
  onToggleExpanded: () => void
}) {
  // TEMP: null means "no drag yet -- render at 2/3 of the row via w-2/3
  // (a CSS percentage, not a guessed pixel default)." Becomes an explicit
  // px number on the first drag and stays that way after.
  const [width, setWidth] = useState<number | null>(null)
  const [splitByCharacter, setSplitByCharacter] = useState(false)
  const [fontSize, setFontSize] = useState(DEFAULT_SCRIPT_FONT_SIZE)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // COR-14 rules 1-2: disabled for a monologue (nothing to split) and for
  // more than 3 speaking characters (no defined layout beyond that).
  const canSplit = script !== null && canSplitByCharacter(script)

  // COR-16: "parts" are just the script's speaking characters -- there's no
  // separate part entity, so the mark dialog reuses the same list/colors
  // COR-14's split view already derives from the script.
  const characters = script ? getSpeakingCharacters(script) : []
  const colors = assignCharacterColors(characters)
  const canMark = script !== null && characters.length > 0

  const { data: session } = useSession()
  const myMember = members.find((m) => m.userId === session?.user?.id)
  // Rule 1: only offer "Mark for me" when the member's defined part actually
  // matches one of this script's speaking characters -- a stale/unrelated
  // part string has nothing to mark.
  const myPart = characters.find((c) => c.toLowerCase() === myMember?.part?.trim().toLowerCase()) ?? null

  const [markedCharacter, setMarkedCharacter] = useState<string | null>(null)
  // Rule 5: survives an erase, so reopening the dialog still shows the last
  // choice -- only a new mark (or a script swap) replaces it.
  const [lastSelected, setLastSelected] = useState<string | null>(null)
  const [highlightColor, setHighlightColor] = useState(MARK_COLORS[0])
  // Only affects the marked character's lines -- nothing to bold without a
  // mark, so this stays a user preference rather than resetting alongside
  // markedCharacter on erase/script swap.
  const [boldMarked, setBoldMarked] = useState(false)
  const markDialogRef = useRef<DialogHandle>(null)

  // A stale mark from a previously-attached script can't apply to this one.
  useEffect(() => {
    setMarkedCharacter(null)
  }, [script?.slug])

  // TEMP: script panel now sits on the LEFT (workshop-panels.tsx swapped the
  // JSX order), so this handle moved to the right edge -- same math as
  // workshop-sidebar-list.tsx's own right-edge handle now (growing means
  // dragging right, positive deltaX). Reads the live rendered width off the
  // DOM instead of `width` state, since state is still null in the w-2/3
  // default case -- this way the drag picks up from wherever it visually is
  // regardless of which mode it started in.
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const startWidth = panelRef.current?.getBoundingClientRect().width ?? MIN_WIDTH
    dragRef.current = { startX: e.clientX, startWidth }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const next = dragRef.current.startWidth + (e.clientX - dragRef.current.startX)
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)))
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  return (
    <div
      ref={panelRef}
      className={
        expanded
          ? 'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink'
          : width === null
            ? 'relative flex min-h-0 w-2/3 shrink-0 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink'
            : 'relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink'
      }
      style={expanded || width === null ? undefined : { width }}
    >
      {/* Same generous 20px hit target + hover-revealed grip as the
          sidebar's handle -- now on the right edge (TEMP swap). Dragging it
          means nothing with no sibling panel to give space to, so it's gone
          while expanded. */}
      {!expanded && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize script panel"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="group absolute top-0 -right-2.5 z-10 flex h-full w-5 cursor-col-resize touch-none items-center justify-center"
        >
          <div className="h-full w-px bg-ink-foreground/16 transition-colors group-hover:bg-ink-foreground/35" />
          <div className="pointer-events-none absolute h-10 w-1.5 rounded-full bg-ink-foreground/70 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">Script</p>
          <p className="mt-0.5 truncate text-[15px] font-semibold">{script ? script.title : 'No script attached'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <FontSizeControl fontSize={fontSize} onChange={setFontSize} disabled={!script} />
          <button
            type="button"
            onClick={() => setBoldMarked((v) => !v)}
            disabled={!markedCharacter}
            aria-pressed={boldMarked}
            aria-label={boldMarked ? 'Unbold marked lines' : 'Bold marked lines'}
            title={markedCharacter ? (boldMarked ? 'Unbold marked lines' : 'Bold marked lines') : 'Mark a part first'}
            className={
              boldMarked
                ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary disabled:pointer-events-none disabled:opacity-30'
                : 'flex h-8 w-8 items-center justify-center rounded-lg text-ink-foreground/55 hover:bg-ink-card hover:text-ink-foreground disabled:pointer-events-none disabled:opacity-30'
            }
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 12a4 4 0 0 0 0-8H6v8"></path>
              <path d="M15 20a4 4 0 0 0 0-8H6v8Z"></path>
            </svg>
          </button>
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
            myPart={myPart}
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
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label={expanded ? 'Show group details' : 'Expand script panel'}
            title={expanded ? 'Show group details' : 'Expand script panel'}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-foreground/55 hover:bg-ink-card hover:text-ink-foreground"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 8 22 12 18 16"></polyline>
              <polyline points="6 8 2 12 6 16"></polyline>
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* min-h-0 is the piece that was actually missing: a flex item's
          default min-height:auto refuses to shrink below its content's
          size, which silently defeats overflow-y-auto -- the panel just
          grew to fit the script instead of scrolling. overscroll-contain
          stops wheel scrolling from chaining to the page once this reaches
          its own top/bottom -- the page never moves. The three scrollbar
          rules hide the scrollbar (per-browser: no shorthand covers
          Firefox, WebKit, and old Edge/IE at once) while the element stays
          scrollable -- wheel/trackpad/keyboard scrolling still works, just
          without a visible track. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ink-foreground/14 px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {script ? (
          <ScriptFlow
            script={script}
            splitByCharacter={splitByCharacter}
            characters={characters}
            colors={colors}
            markedCharacter={markedCharacter}
            highlightColor={highlightColor}
            fontSize={fontSize}
            boldMarked={boldMarked}
          />
        ) : availableScripts.length === 0 ? (
          <p className="text-sm text-ink-foreground/55">No scripts are available to attach yet.</p>
        ) : (
          <form action={setWorkshopScript.bind(null, workshopId)} className="flex flex-col gap-3">
            <p className="text-sm text-ink-foreground/55">Attach a script to render it here.</p>
            <select
              name="scriptSlug"
              defaultValue=""
              required
              className="rounded-lg border border-ink-foreground/16 bg-ink-card px-3 py-2 text-sm text-ink-foreground"
            >
              <option value="" disabled>
                Choose a script
              </option>
              {availableScripts.map((available) => (
                <option key={available.slug} value={available.slug}>
                  {available.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Attach
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
