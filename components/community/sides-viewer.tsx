import type { CommunityAttachmentItem } from '@/lib/community/types'

export function SidesViewer({ attachment }: { attachment: CommunityAttachmentItem }) {
  const isImage = attachment.fileType.startsWith('image/')
  const isPdf = attachment.fileType === 'application/pdf'

  return (
    <div className="flex flex-col rounded-xl border border-ink-foreground/16 bg-ink p-3 min-h-64">
      <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-foreground/55">
        Sides — {attachment.filename}
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
          📄 Download {attachment.filename}
        </a>
      )}
    </div>
  )
}
