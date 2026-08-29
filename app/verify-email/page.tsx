import Link from 'next/link'
import type { Metadata } from 'next'
import { consumeEmailVerification } from '@/lib/emailVerification'

export const metadata: Metadata = {
  title: 'Verify email — Glumački Studio',
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>
}) {
  const { email, token } = await searchParams
  const result =
    email && token
      ? await consumeEmailVerification(email, token)
      : { ok: false as const, error: 'This verification link is missing required parameters.' }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-5 text-center text-ink-foreground">
      <div className="w-full max-w-sm">
        {result.ok ? (
          <>
            <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight">
              Email confirmed
            </h1>
            <p className="mt-3 text-sm text-ink-foreground/70">
              Your registration has been sent to the studio admins for approval. You&apos;ll be
              able to log in once an admin approves your account.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight">
              Verification failed
            </h1>
            <p className="mt-3 text-sm text-ink-foreground/70">{result.error}</p>
          </>
        )}

        <Link
          href="/"
          className="mt-8 inline-block text-sm text-accent hover:underline"
        >
          ← Back to site
        </Link>
      </div>
    </main>
  )
}
