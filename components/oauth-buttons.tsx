'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useTranslation } from '@/components/i18n/language-provider'

export function OAuthButtons() {
  const { t } = useTranslation()
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
          {t.oauth.orContinueWith}
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
          {t.oauth.google}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSocial('facebook')}
          className="rounded-sm border border-ink-foreground/20 px-4 py-2.5 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/[0.04] disabled:opacity-60"
        >
          {t.oauth.facebook}
        </button>
      </div>
    </>
  )
}
