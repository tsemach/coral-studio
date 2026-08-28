'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { OAuthButtons } from '@/components/oauth-buttons'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) {
      setError('Invalid email or password, or your account is not active yet.')
      setLoading(false)
      return
    }

    // Hard navigation (not router.push) so the browser sees a real
    // post-submit document load and offers to save the password.
    window.location.href = '/'
  }

  return (
    <>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {error && (
          <p className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-xs uppercase tracking-[0.18em] text-ink-foreground/60"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-sm border border-ink-foreground/20 bg-ink-foreground/[0.04] px-4 py-3 text-ink-foreground placeholder:text-ink-foreground/35 focus:border-accent focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-xs uppercase tracking-[0.18em] text-ink-foreground/60"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-sm border border-ink-foreground/20 bg-ink-foreground/[0.04] px-4 py-3 text-ink-foreground placeholder:text-ink-foreground/35 focus:border-accent focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <OAuthButtons />
    </>
  )
}
