import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { listScriptsWithContent } from '@/lib/workshops/scripts'
import { AI_PROMPT_MARKDOWN } from '@/lib/scripts/ai-prompt'
import { ScriptsShell } from '@/components/scripts/scripts-shell'

export const metadata: Metadata = {
  title: 'Scripts — Glumački Studio',
}

export default async function ScriptDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/')

  // One batch fetch, not listAvailableScripts() + a separate getScript(slug)
  // -- the list already fetches every script's full content internally, so
  // the selected one is just found in that same result instead of being
  // fetched a second time. This is what made toggling between scripts feel
  // slow: every navigation was paying for the selected script's content
  // twice.
  const allScripts = await listScriptsWithContent()
  const scripts = allScripts.map((script) => ({ slug: script.slug, title: script.title, scene: script.scene }))
  const selected = allScripts.find((script) => script.slug === slug) ?? null

  if (!selected) redirect('/scripts')

  return <ScriptsShell scripts={scripts} selected={selected} promptMarkdown={AI_PROMPT_MARKDOWN} />
}
