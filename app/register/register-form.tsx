'use client'

import { useState } from 'react'
import { isValidEmail, isValidPasswordLength } from '@/lib/validation'

export function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Client-side checks are only for immediate feedback -- the register
    // API route enforces the same rules server-side and is the actual
    // source of truth.
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!isValidPasswordLength(password)) {
      setError('Password must be between 6 and 48 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed. Please try again.')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <p className="mt-8 rounded-sm border border-ink-foreground/20 bg-ink-foreground/[0.04] px-4 py-4 text-sm text-ink-foreground/80">
        Check <strong>{email}</strong> for a confirmation link. Once you confirm, your registration
        is sent to the studio admins for approval before you can log in.
      </p>
    )
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      {error && (
        <p className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-xs uppercase tracking-[0.18em] text-ink-foreground/60"
        >
          Full name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-sm border border-ink-foreground/20 bg-ink-foreground/[0.04] px-4 py-3 text-ink-foreground placeholder:text-ink-foreground/35 focus:border-accent focus:outline-none"
        />
      </div>

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
          autoComplete="new-password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-sm border border-ink-foreground/20 bg-ink-foreground/[0.04] px-4 py-3 text-ink-foreground placeholder:text-ink-foreground/35 focus:border-accent focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirm-password"
          className="block text-xs uppercase tracking-[0.18em] text-ink-foreground/60"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-sm border border-ink-foreground/20 bg-ink-foreground/[0.04] px-4 py-3 text-ink-foreground placeholder:text-ink-foreground/35 focus:border-accent focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
