'use client'

import '@livekit/components-styles'
import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference, useLocalParticipant, useLocalParticipantPermissions } from '@livekit/components-react'
import { addMeToLiveSession, getLiveToken } from '@/app/workshops/actions'

// Floating over VideoConference rather than part of its own control bar --
// VideoConference is LiveKit's stock component (chat, screen share, its own
// Leave button already wired to disconnect), not ours to edit. Only rendered
// while the caller can't publish yet; once promoteParticipant() (the
// addMeToLiveSession action) flips their grant, LiveKit pushes the
// permission change down and useLocalParticipantPermissions() picks it up on
// its own -- the effect below is what actually turns their camera/mic on in
// response, since a permission grant alone doesn't start publishing.
function AddMeButton({ workshopId }: { workshopId: string }) {
  const permissions = useLocalParticipantPermissions()
  const { localParticipant } = useLocalParticipant()
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!permissions?.canPublish) return
    localParticipant.setCameraEnabled(true)
    localParticipant.setMicrophoneEnabled(true)
  }, [permissions?.canPublish, localParticipant])

  if (permissions?.canPublish) return null

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        try {
          await addMeToLiveSession(workshopId)
        } finally {
          setPending(false)
        }
      }}
      className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
    >
      {pending ? 'Joining…' : 'Add me'}
    </button>
  )
}

// COR-18: renders in place of WorkshopMain (workshop-live-area.tsx) while
// live. Fetches this caller's token fresh on mount rather than accepting one
// as a prop -- it's short-lived and scoped to exactly this join, not
// something the parent server render should be minting speculatively.
export function WorkshopVideoRoom({ workshopId, onLeave }: { workshopId: string; onLeave: () => void }) {
  const [session, setSession] = useState<{ token: string; serverUrl: string; canPublish: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getLiveToken(workshopId)
      .then((result) => {
        if (!cancelled) setSession(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not join the live session')
      })
    return () => {
      cancelled = true
    }
  }, [workshopId])

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-ink-foreground">
        <p className="text-sm text-ink-foreground/70">{error}</p>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 hover:text-ink-foreground"
        >
          Back to workshop
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-ink-foreground/55">Connecting…</div>
    )
  }

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.serverUrl}
      audio={session.canPublish}
      video={session.canPublish}
      data-lk-theme="default"
      className="relative flex min-h-0 flex-1 flex-col"
      onDisconnected={onLeave}
    >
      <VideoConference />
      <AddMeButton workshopId={workshopId} />
    </LiveKitRoom>
  )
}
