'use client'

export const DEFAULT_SCRIPT_FONT_SIZE = 13.5
const MIN_SCRIPT_FONT_SIZE = 10
const MAX_SCRIPT_FONT_SIZE = 20
const SCRIPT_FONT_SIZE_STEP = 1

// Up/down font-size stepper for ScriptFlow's `fontSize` prop -- shared by
// script-panel.tsx (/workshops) and script-preview-panel.tsx (/scripts) so
// both host their own local fontSize state but render this one control
// rather than duplicating the buttons.
export function FontSizeControl({ fontSize, onChange }: { fontSize: number; onChange: (size: number) => void }) {
  const canIncrease = fontSize < MAX_SCRIPT_FONT_SIZE
  const canDecrease = fontSize > MIN_SCRIPT_FONT_SIZE

  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_SCRIPT_FONT_SIZE, fontSize + SCRIPT_FONT_SIZE_STEP))}
        disabled={!canIncrease}
        aria-label="Increase script font size"
        title="Increase font size"
        className="flex h-8 w-6 items-center justify-center rounded-l-lg text-ink-foreground/55 hover:bg-ink-card hover:text-ink-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange(Math.max(MIN_SCRIPT_FONT_SIZE, fontSize - SCRIPT_FONT_SIZE_STEP))}
        disabled={!canDecrease}
        aria-label="Decrease script font size"
        title="Decrease font size"
        className="flex h-8 w-6 items-center justify-center rounded-r-lg text-ink-foreground/55 hover:bg-ink-card hover:text-ink-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>
  )
}
