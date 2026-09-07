import Link from 'next/link'
import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function FinalCta() {
  const { finalCta: t } = await getDictionary()

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center md:px-8 md:py-28">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary-foreground/70">
            {t.eyebrow}
          </p>
          <h2 className="mx-auto max-w-3xl text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            {t.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-pretty leading-relaxed text-primary-foreground/85">
            {t.body}
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/#classes"
              className="inline-flex items-center justify-center rounded-sm bg-primary-foreground px-7 py-3.5 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
            >
              {t.ctaClasses}
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-sm border border-primary-foreground/40 px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground hover:text-primary"
            >
              {t.ctaLogin}
            </Link>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-ink text-ink-foreground scroll-mt-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-14 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <p className="font-serif text-xl font-semibold">Glumački Studio</p>
            <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-ink-foreground/60">
              {t.footerTagline}
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <a
              href="https://www.instagram.com/glumacki.studio.bg/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-foreground/80 transition-colors hover:text-accent"
            >
              {t.instagram}
            </a>
            <p className="text-ink-foreground/50">© {new Date().getFullYear()} Glumački Studio</p>
          </div>
        </div>
      </footer>
    </>
  )
}
