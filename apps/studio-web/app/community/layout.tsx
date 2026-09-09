import type { Metadata } from 'next'
import { CommunityTopbar } from '@/components/community/community-topbar'

export const metadata: Metadata = {
  title: 'The Actor Board — Glumački Studio',
  description: 'Community board for scene partners, line reading, Belgrade auditions, and craft discussions.',
}

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-ink-foreground">
      <CommunityTopbar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
