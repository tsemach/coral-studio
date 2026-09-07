import Link from 'next/link'
import type { Metadata } from 'next'
import { consumeEmailVerification } from '@/lib/emailVerification'
import { getDictionary } from '@/lib/i18n/get-dictionary'

export const metadata: Metadata = {
  title: 'Verify email — Glumački Studio',
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>
}) {
  const { email, token } = await searchParams
  const { verifyEmail: t } = await getDictionary()
  const result =
    email && token
      ? await consumeEmailVerification(email, token)
      : { ok: false as const, error: 'missing' as const }

  const errorText =
    !result.ok &&
    { missing: t.missingParamsError, invalid: t.invalidError, expired: t.expiredError }[
      result.error
    ]

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-5 text-center text-ink-foreground">
      <div className="w-full max-w-sm">
        {result.ok ? (
          <>
            <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight">
              {t.confirmedTitle}
            </h1>
            <p className="mt-3 text-sm text-ink-foreground/70">{t.confirmedBody}</p>
          </>
        ) : (
          <>
            <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight">
              {t.failedTitle}
            </h1>
            <p className="mt-3 text-sm text-ink-foreground/70">{errorText}</p>
          </>
        )}

        <Link href="/" className="mt-8 inline-block text-sm text-accent hover:underline">
          {t.backToSite}
        </Link>
      </div>
    </main>
  )
}
