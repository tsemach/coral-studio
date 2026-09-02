import { redirect } from 'next/navigation'
import { promises as fs } from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { listAvailableScripts } from '@/lib/workshops/scripts'
import { ScriptsShell } from '@/components/scripts/scripts-shell'

export const metadata: Metadata = {
  title: 'Scripts — Glumački Studio',
}

async function readPromptMarkdown(): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'workshops', 'scripts', 'ai-prompt.md'), 'utf-8')
}

export default async function ScriptsIndexPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/')

  const [scripts, promptMarkdown] = await Promise.all([listAvailableScripts(), readPromptMarkdown()])

  return <ScriptsShell scripts={scripts} selected={null} promptMarkdown={promptMarkdown} />
}
