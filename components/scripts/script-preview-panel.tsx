import { ScriptFlow } from '@/components/workshops/script-flow'
import type { Script } from '@/lib/workshops/scripts'

// The middle "Script area" from the COR-17 sketch. Reuses ScriptFlow
// directly -- no split-by-character or mark-a-part controls, since those
// are workshop-member-specific (script-panel.tsx) and don't apply to a
// management page with no rehearsal group attached.
export function ScriptPreviewPanel({ script }: { script: Script | null }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink">
      <div className="shrink-0 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">Script</p>
        <p className="mt-0.5 truncate text-[15px] font-semibold text-ink-foreground">
          {script ? script.title : 'No script selected'}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ink-foreground/14 px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {script ? (
          <ScriptFlow
            script={script}
            splitByCharacter={false}
            characters={[]}
            colors={{}}
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
