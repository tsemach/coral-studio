import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function ApproachSection() {
  const { approach: t } = await getDictionary()

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">{t.eyebrow}</p>
          <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {t.title}
          </h2>
          <p className="mt-6 text-pretty leading-relaxed text-muted">{t.body}</p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <article className="rounded-sm border border-border bg-card p-8">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">{t.hagenTitle}</h3>
            <p className="mt-4 text-pretty leading-relaxed text-muted">{t.hagenBody}</p>
          </article>

          <article className="rounded-sm border border-border bg-card p-8">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">
              {t.meisnerTitle}
            </h3>
            <p className="mt-4 text-pretty leading-relaxed text-muted">{t.meisnerBody}</p>
          </article>
        </div>

        <p className="mt-10 max-w-3xl text-pretty text-lg leading-relaxed text-foreground/90">
          {t.closing}
        </p>
      </div>
    </section>
  )
}
