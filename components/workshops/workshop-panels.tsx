'use client'

import { useState } from 'react'
import { ScriptPanel } from '@/components/workshops/script-panel'
import { WorkshopDetailsPanel } from '@/components/workshops/workshop-details-panel'
import type { WorkshopDetail } from '@/lib/workshops/queries'
import type { Script, ScriptSummary } from '@/lib/workshops/scripts'

// The expand toggle has to live above both panels -- expanding hides
// WorkshopDetailsPanel entirely, not just resizes ScriptPanel, so neither
// panel alone can own this state.
export function WorkshopPanels({
  workshop,
  script,
  availableScripts,
}: {
  workshop: WorkshopDetail
  script: Script | null
  availableScripts: ScriptSummary[]
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-5 flex min-h-0 flex-1 gap-5">
      {!expanded && <WorkshopDetailsPanel workshop={workshop} />}
      <ScriptPanel
        workshopId={workshop.id}
        script={script}
        availableScripts={availableScripts}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((v) => !v)}
      />
    </div>
  )
}
