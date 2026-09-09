'use client'

import { useTranslation } from '@/components/i18n/language-provider'
import type { CommunityAttachmentItemDTO } from '@/lib/community/dto'

export function SidesViewer({ attachment }: { attachment: CommunityAttachmentItemDTO }) {
  const { t } = useTranslation()
  const isImage = attachment.fileType.startsWith('image/')
  const isPdf = attachment.fileType === 'application/pdf'

  return (
    <div className="flex flex-col rounded-xl border border-ink-foreground/16 bg-ink p-3 min-h-64">
      <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-foreground/55">
        {t.community.sidesViewer.label} {attachment.filename}
      </span>

      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded attachment, not a next/image-optimizable local asset
        <img src={attachment.url} alt={attachment.filename} className="flex-1 rounded-lg object-contain" />
      ) : isPdf ? (
        <iframe src={attachment.url} title={attachment.filename} className="flex-1 rounded-lg bg-white" />
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-ink-foreground/20 text-sm text-ink-foreground/70 hover:text-ink-foreground transition-colors"
        >
          📄 {t.community.sidesViewer.download} {attachment.filename}
        </a>
      )}
    </div>
  )
}
