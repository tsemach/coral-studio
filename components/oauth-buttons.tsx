'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export function OAuthButtons() {
  const [loading, setLoading] = useState(false)

  async function handleSocial(provider: 'google' | 'facebook') {
    setLoading(true)
    await signIn(provider, { callbackUrl: '/' })
  }

  return (
    <>
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink-foreground/15" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-ink-foreground/50">
          Or continue with
        </span>
        <div className="h-px flex-1 bg-ink-foreground/15" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSocial('google')}
          className="rounded-sm border border-ink-foreground/20 px-4 py-2.5 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/[0.04] disabled:opacity-60"
        >
          Google
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSocial('facebook')}
          className="rounded-sm border border-ink-foreground/20 px-4 py-2.5 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/[0.04] disabled:opacity-60"
        >
          Facebook
        </button>
      </div>
    </>
  )
}
