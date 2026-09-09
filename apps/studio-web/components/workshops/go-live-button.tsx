'use client'

import { useWorkshopLive } from '@/components/workshops/workshop-live-area'
import { useLiveStatus } from '@/hooks/workshops/use-live-status'
import { useTranslation } from '@/components/i18n/language-provider'

// Opt-in per member (COR-18): this only starts the video view locally for
// whoever clicks it. Other members keep seeing WorkshopMain until they press
// this same button themselves -- polling live-status is what turns it into
// "Live now · Join" for them once someone else is already in the room.
export function GoLiveButton({ workshopId }: { workshopId: string }) {
  const { goLive } = useWorkshopLive()
  const { data } = useLiveStatus(workshopId)
  const live = Boolean(data?.live)
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={goLive}
      className={
        live
          ? 'inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground'
          : 'inline-flex items-center gap-2 rounded-xl border border-ink-foreground/16 px-4 py-2.5 text-sm font-semibold text-ink-foreground transition-colors hover:border-ink-foreground/30'
      }
    >
      {live && <span className="h-2 w-2 rounded-full bg-[#f0a8b4]" aria-hidden />}
      {live ? t.workshops.goLiveButton.liveJoin : t.workshops.goLiveButton.goLive}
    </button>
  )
}
