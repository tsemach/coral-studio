import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in — Glumački Studio',
  description: 'Log in to your Glumački Studio account.',
}

export default function LoginPage() {
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

          <form className="mt-8 space-y-5">
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
                className="w-full rounded-sm border border-ink-foreground/20 bg-ink-foreground/[0.04] px-4 py-3 text-ink-foreground placeholder:text-ink-foreground/35 focus:border-accent focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Log in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-foreground/55">
            New to the studio?{' '}
            <Link href="/#classes" className="text-accent hover:underline">
              Explore our classes
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
