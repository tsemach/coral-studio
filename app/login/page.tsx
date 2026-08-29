import Link from 'next/link'
import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Log in — Glumački Studio',
  description: 'Log in to your Glumački Studio account.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const oauthPending = error === 'AccessDenied'

  return (
    <main className="flex min-h-screen flex-col bg-ink text-ink-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-serif text-lg font-semibold tracking-tight">
            Glumački Studio
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.28em] text-ink-foreground/50">
            Acting · Belgrade
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm text-ink-foreground/70 transition-colors hover:text-ink-foreground"
        >
          ← Back to site
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-ink-foreground/60">
            Log in to access your classes and studio updates.
          </p>

          <LoginForm oauthPending={oauthPending} />

          <p className="mt-6 text-center text-sm text-ink-foreground/55">
            New to the studio?{' '}
            <Link href="/register" className="text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
