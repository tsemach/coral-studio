'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { DialogHandle } from '@/components/workshops/add-member-dialog'

// COR-16: a fixed palette, not a free color input -- kept to shades bright
// enough for the dark ink background and for text-ink (near-black) on top of
// them to stay legible, unlike a typical light-background swatch set (which
// leans on white/gray/black that would wash out or vanish here).
export const MARK_COLORS = [
  '#fde047', // yellow
  '#bef264', // lime
  '#5eead4', // teal
  '#67e8f9', // cyan
  '#7dd3fc', // sky
  '#f9a8d4', // pink
  '#fda4af', // rose
  '#fdba74', // orange
]

// COR-16: opened from ScriptPanel's mark icon. A picker, not a form -- every
// option applies itself and closes the dialog immediately, so there's no
// separate submit step. Same native-<dialog> + forwardRef convention as
// add-member-dialog.tsx / schedule-rehearsal-dialog.tsx (no padding directly
// on <dialog> -- see those files for why a click there would otherwise be
// mistaken for a backdrop click and close it; m-auto restores the centering
// Tailwind's preflight margin reset otherwise breaks).
export const MarkPartDialog = forwardRef<
  DialogHandle,
  {
    characters: string[]
    colors: Record<string, string>
    myPart: string | null
    defaultSelected: string | null
    onSelect: (character: string) => void
    highlightColor: string
    onHighlightColorChange: (color: string) => void
  }
>(function MarkPartDialog(
  { characters, colors, myPart, defaultSelected, onSelect, highlightColor, onHighlightColorChange },
  ref
) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useImperativeHandle(ref, () => ({ open: () => dialogRef.current?.showModal() }))

  function select(character: string) {
    onSelect(character)
    dialogRef.current?.close()
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close()
      }}
      className="m-auto max-w-sm border-0 bg-transparent p-0 backdrop:bg-black/50"
    >
      <div className="w-full max-w-sm rounded-xl border border-ink-foreground/16 bg-ink-card p-6 text-ink-foreground">
        <p className="text-lg font-semibold">Mark a part</p>
        <p className="mt-1 text-sm text-ink-foreground/60">Choose which character's lines to highlight.</p>

        <p className="mt-4 text-xs font-medium uppercase tracking-[0.1em] text-ink-foreground/55">Highlight color</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MARK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use ${color} highlight`}
              aria-pressed={color === highlightColor}
              onClick={() => onHighlightColorChange(color)}
              className={
                color === highlightColor
                  ? 'h-7 w-7 shrink-0 rounded-full ring-2 ring-ink-foreground ring-offset-2 ring-offset-ink-card'
                  : 'h-7 w-7 shrink-0 rounded-full'
              }
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-1.5">
          {myPart && (
            <button
              type="button"
              onClick={() => select(myPart)}
              className={
                defaultSelected === myPart
                  ? 'flex items-center gap-2.5 rounded-lg bg-primary/20 px-3 py-2 text-left text-sm font-semibold text-primary'
                  : 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink-foreground hover:bg-ink'
              }
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[myPart] }} />
              Mark for me
              <span className="text-ink-foreground/50">({myPart})</span>
            </button>
          )}

          {characters
            .filter((character) => character !== myPart)
            .map((character) => (
            <button
              key={character}
              type="button"
              onClick={() => select(character)}
              className={
                defaultSelected === character
                  ? 'flex items-center gap-2.5 rounded-lg bg-primary/20 px-3 py-2 text-left text-sm text-primary'
                  : 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-foreground hover:bg-ink'
              }
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[character] }} />
              {character}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 transition-colors hover:text-ink-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  )
})
