'use client'

import '@livekit/components-styles'
import { useEffect, useState } from 'react'
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useRemoteParticipants,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { addMeToLiveSession, getLiveToken } from '@/app/workshops/actions'
import { useTranslation } from '@/components/i18n/language-provider'

// Floating over the grid/control bar rather than part of either -- only
// rendered while the caller can't publish yet; once promoteParticipant()
// (the addMeToLiveSession action) flips their grant, LiveKit pushes the
// permission change down and useLocalParticipantPermissions() picks it up
// on its own -- the effect below is what actually turns their camera/mic
// on in response, since a permission grant alone doesn't start publishing.
function AddMeButton({ workshopId }: { workshopId: string }) {
  const { t } = useTranslation()
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
      {pending ? t.workshops.videoRoom.joining : t.workshops.videoRoom.addMe}
    </button>
  )
}

// A viewer never publishes anything (canPublish stays false until
// promoted), so listing them by name here -- rather than as an empty
// placeholder tile in the main grid -- is how anyone still knows who's
// watching. useRemoteParticipants() already excludes the local
// participant, so this never lists yourself.
function ViewerList() {
  const { t } = useTranslation()
  const remoteParticipants = useRemoteParticipants()
  const viewers = remoteParticipants.filter((participant) => !participant.permissions?.canPublish)

  if (viewers.length === 0) return null

  return (
    <div className="flex w-40 shrink-0 flex-col gap-2 overflow-y-auto border-r border-ink-foreground/16 bg-ink p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">
        {t.workshops.videoRoom.viewers} ({viewers.length})
      </p>
      {viewers.map((viewer) => (
        <p key={viewer.identity} className="truncate text-sm text-ink-foreground/80">
          {viewer.name || viewer.identity}
        </p>
      ))}
    </div>
  )
}

// Main grid shows only participants who can actually publish (actors, or
// a viewer once promoted) -- a non-promoted viewer would only ever render
// an empty placeholder here, so they're excluded and listed in
// ViewerList instead. withPlaceholder: true still covers an actor whose
// camera happens to be off, matching this component's prior behavior for
// anyone who can actually appear on camera.
function ActorGrid() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]).filter(
    (track) => track.participant.permissions?.canPublish
  )

  return (
    <GridLayout tracks={tracks} className="min-h-0 flex-1">
      <ParticipantTile />
    </GridLayout>
  )
}

// COR-18: renders in place of WorkshopMain (workshop-live-area.tsx) while
// live. Fetches this caller's token fresh on mount rather than accepting one
// as a prop -- it's short-lived and scoped to exactly this join, not
// something the parent server render should be minting speculatively.
export function WorkshopVideoRoom({ workshopId, onLeave }: { workshopId: string; onLeave: () => void }) {
  const { t } = useTranslation()
  const [session, setSession] = useState<{ token: string; serverUrl: string; canPublish: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getLiveToken(workshopId)
      .then((result) => {
        if (!cancelled) setSession(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t.workshops.videoRoom.couldNotJoin)
      })
    return () => {
      cancelled = true
    }
  }, [workshopId, t.workshops.videoRoom.couldNotJoin])

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-ink-foreground">
        <p className="text-sm text-ink-foreground/70">{error}</p>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 hover:text-ink-foreground"
        >
          {t.workshops.videoRoom.backToWorkshop}
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-ink-foreground/55">
        {t.workshops.videoRoom.connecting}
      </div>
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
      <div className="flex min-h-0 flex-1">
        <ViewerList />
        <div className="flex min-h-0 flex-1 flex-col">
          <ActorGrid />
          <ControlBar
            variation="minimal"
            controls={{ microphone: true, camera: true, chat: false, screenShare: false, leave: true }}
          />
        </div>
      </div>
      <RoomAudioRenderer />
      <AddMeButton workshopId={workshopId} />
    </LiveKitRoom>
  )
}
