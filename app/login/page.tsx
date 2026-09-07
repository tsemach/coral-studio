import Link from 'next/link'
import type { Metadata } from 'next'
import { LoginForm } from './login-form'
import { LanguageToggle } from '@/components/i18n/language-toggle'
import { getDictionary } from '@/lib/i18n/get-dictionary'

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
  const { login: t } = await getDictionary()

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
        <div className="flex items-center gap-4">
          <LanguageToggle variant="dark" />
          <Link
            href="/"
            className="text-sm text-ink-foreground/70 transition-colors hover:text-ink-foreground"
          >
            {t.backToSite}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-ink-foreground/60">{t.subtitle}</p>

          <LoginForm oauthPending={oauthPending} />

          <p className="mt-6 text-center text-sm text-ink-foreground/55">
            {t.newToStudio}{' '}
            <Link href="/register" className="text-accent hover:underline">
              {t.createAccount}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
