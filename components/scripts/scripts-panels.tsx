'use client'

import { useState } from 'react'
import { AddScriptDialog } from '@/components/scripts/add-script-dialog'
import { PromptPanel } from '@/components/scripts/prompt-panel'
import { ScriptPreviewPanel } from '@/components/scripts/script-preview-panel'
import type { Script } from '@/lib/workshops/scripts'

export function ScriptsPanels({ script, promptMarkdown }: { script: Script | null; promptMarkdown: string }) {
  const [promptOpen, setPromptOpen] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setPromptOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-foreground/16 px-4 py-2.5 text-sm font-semibold text-ink-foreground transition-colors hover:border-ink-foreground/30"
        >
          Prompt
        </button>
        <AddScriptDialog />
      </div>

      <div className="flex min-h-0 flex-1 gap-5">
        <ScriptPreviewPanel script={script} />
        {promptOpen && <PromptPanel markdown={promptMarkdown} onClose={() => setPromptOpen(false)} />}
      </div>
    </div>
  )
}
