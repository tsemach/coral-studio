import Link from 'next/link'
import { UserMenu } from '@/components/user-menu'
import { ScriptsPanels } from '@/components/scripts/scripts-panels'
import { ScriptsSidebarList } from '@/components/scripts/scripts-sidebar-list'
import type { Script, ScriptSummary } from '@/lib/workshops/scripts'

// Server Component, structurally copied from workshop-shell.tsx -- same
// h-screen + overflow-hidden reasoning: without a real height ceiling here,
// the flex-1 panels below never become a bounded box for overflow-y-auto to
// scroll against.
export function ScriptsShell({
  scripts,
  selected,
  promptMarkdown,
}: {
  scripts: ScriptSummary[]
  selected: Script | null
  promptMarkdown: string
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink text-ink-foreground">
      <div className="flex items-center justify-between border-b border-ink-foreground/16 px-8 py-[18px]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="Back to site"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-foreground/16 text-ink-foreground/55 transition-colors hover:border-ink-foreground/30 hover:text-ink-foreground"
          >
            ←
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-foreground/55">Admin</p>
            <p className="mt-0.5 text-[21px] font-semibold tracking-tight">Scripts</p>
          </div>
        </div>

        <UserMenu />
      </div>

      <div className="flex min-h-0 flex-1">
        <ScriptsSidebarList scripts={scripts} selectedSlug={selected?.slug ?? null} />
        <div className="flex min-h-0 flex-1 flex-col px-8 py-6">
          <ScriptsPanels script={selected} promptMarkdown={promptMarkdown} />
        </div>
      </div>
    </div>
  )
}
