'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

// Renders workshops/scripts/ai-prompt.md as-is (COR-17: "read from a static
// markdown file and present as markdown"). Copy button copies the raw
// markdown string, not the rendered HTML/text -- pasting the source into an
// external AI chat is what step 3 of the issue asks for.
//
// Styling note: this repo has no tailwind.config.* and doesn't register
// @tailwindcss/typography (checked package.json, node_modules/@tailwindcss/,
// and app/globals.css -- no `prose`/`@plugin` anywhere), so the rendered
// markdown's children are styled directly via arbitrary-variant selectors
// instead of the `prose` plugin classes.
export function PromptPanel({ markdown, onClose }: { markdown: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex min-h-0 w-[420px] shrink-0 flex-col overflow-hidden rounded-2xl border border-ink-foreground/12 bg-ink">
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/55">
          AI conversion prompt
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-ink-foreground/16 px-3 py-1.5 text-xs font-semibold text-ink-foreground transition-colors hover:border-ink-foreground/30"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prompt"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-foreground/55 hover:bg-ink-card hover:text-ink-foreground"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-ink-foreground/14 bg-black/40 px-5 py-4 text-[13px] leading-relaxed text-ink-foreground/85">
        <article
          className="[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-ink-foreground [&_h1]:first:mt-0 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-ink-foreground [&_h2]:first:mt-0 [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-ink-foreground [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-ink-foreground [&_em]:italic [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_a]:text-ink-foreground [&_a]:underline [&_code]:rounded [&_code]:bg-ink-card [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-ink-foreground [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-ink-card [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0"
        >
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
