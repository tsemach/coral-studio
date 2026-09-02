import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { getScript, listAvailableScripts } from '@/lib/workshops/scripts'
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

  const [scripts, selected] = await Promise.all([listAvailableScripts(), getScript(slug)])

  if (!selected) redirect('/scripts')

  return <ScriptsShell scripts={scripts} selected={selected} promptMarkdown={AI_PROMPT_MARKDOWN} />
}
