'use client'

import '@livekit/components-styles'
import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import { getRehearsalToken } from '@/app/community/rehearsal-actions'

export function RehearsalRoom({ postId, onLeave }: { postId: string; onLeave: () => void }) {
  const [session, setSession] = useState<{ token: string; serverUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getRehearsalToken(postId)
      .then((result) => {
        if (cancelled) return
        if ('token' in result) {
          setSession(result as { token: string; serverUrl: string })
        } else {
          setError((result as { error: string }).error)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not join the rehearsal room')
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-ink-foreground/16 bg-ink p-6 text-center">
        <p className="text-sm text-ink-foreground/70">{error}</p>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl border border-ink-foreground/16 px-4 py-2 text-sm font-semibold text-ink-foreground/70 hover:text-ink-foreground cursor-pointer"
        >
          Back to post
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-ink-foreground/16 bg-ink p-6 text-sm text-ink-foreground/55">
        Connecting…
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.serverUrl}
      audio
      video
      data-lk-theme="default"
      className="relative flex min-h-64 flex-col rounded-xl overflow-hidden"
      onDisconnected={onLeave}
    >
      <VideoConference />
    </LiveKitRoom>
  )
}
