'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { WorkshopVideoRoom } from '@/components/workshops/workshop-video-room'

const WorkshopLiveContext = createContext<{ goLive: () => void } | null>(null)

// Consumed by go-live-button.tsx, which renders inside the server-rendered
// `children` this component wraps -- it can't call setLive() in this
// component directly (that's a normal prop, not something you can pass into
// a server-rendered subtree), so it goes through context instead.
export function useWorkshopLive() {
  const ctx = useContext(WorkshopLiveContext)
  if (!ctx) throw new Error('useWorkshopLive must be used within WorkshopLiveArea')
  return ctx
}

// COR-18: the one piece of client state that decides whether WorkshopMain or
// the live video view renders below the (always-mounted) WorkshopTopbar.
// `children` is WorkshopShell's server-rendered WorkshopMain output, passed
// straight through -- this stays the only client boundary in that tree.
export function WorkshopLiveArea({ workshopId, children }: { workshopId: string | null; children: ReactNode }) {
  const [live, setLive] = useState(false)

  if (workshopId && live) {
    return <WorkshopVideoRoom workshopId={workshopId} onLeave={() => setLive(false)} />
  }

  return <WorkshopLiveContext.Provider value={{ goLive: () => setLive(true) }}>{children}</WorkshopLiveContext.Provider>
}
