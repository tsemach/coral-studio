import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function WorkshopSection() {
  const { workshop: t } = await getDictionary()

  return (
    <section id="workshops" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">{t.eyebrow}</p>
            <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {t.title}
            </h2>
            <p className="mt-6 text-pretty leading-relaxed text-muted">{t.body1}</p>
            <p className="mt-5 text-pretty leading-relaxed text-muted">{t.body2}</p>
          </div>

          <div className="md:col-span-5">
            <div className="rounded-sm border border-border bg-card p-8">
              <p className="font-serif text-xl italic leading-relaxed text-foreground">
                {t.quote}
              </p>
              <a
                href="https://www.instagram.com/glumacki.studio.bg/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-foreground"
              >
                {t.instagram}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
