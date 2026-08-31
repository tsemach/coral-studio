'use client'

import { useState } from 'react'
import { setWorkshopScript } from '@/app/workshops/actions'
import { ScriptFlow } from '@/components/workshops/script-flow'
import type { Script, ScriptSummary } from '@/lib/workshops/scripts'

export function ScriptPanel({
  workshopId,
  script,
  availableScripts,
}: {
  workshopId: string
  script: Script | null
  availableScripts: ScriptSummary[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center justify-between px-5 py-4 text-left">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">Script</p>
          <p className="mt-0.5 text-[15px] font-semibold">{script ? script.title : 'No script attached'}</p>
        </div>
        <svg
          className={open ? 'rotate-180 text-ink-foreground/60 transition-transform' : 'text-ink-foreground/60 transition-transform'}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open && (
        <div className="border-t border-ink-foreground/14 px-5 py-4">
          {script ? (
            <ScriptFlow script={script} />
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
      )}
    </div>
  )
}
