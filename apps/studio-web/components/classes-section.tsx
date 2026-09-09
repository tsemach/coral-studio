import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function ClassesSection() {
  const { classes: t } = await getDictionary()

  const details = [
    { label: t.detailLabels.day, value: t.detailValues.day },
    { label: t.detailLabels.time, value: t.detailValues.time },
    { label: t.detailLabels.break, value: t.detailValues.break },
    { label: t.detailLabels.frequency, value: t.detailValues.frequency },
    { label: t.detailLabels.monthlyFee, value: t.detailValues.monthlyFee },
    { label: t.detailLabels.language, value: t.detailValues.language },
    { label: t.detailLabels.age, value: t.detailValues.age },
    { label: t.detailLabels.location, value: t.detailValues.location },
  ]

  return (
    <section id="classes" className="scroll-mt-20 border-b border-border bg-ink text-ink-foreground">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-14 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-6">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-accent">{t.eyebrow}</p>
            <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {t.title}
            </h2>
            <p className="mt-6 text-pretty leading-relaxed text-ink-foreground/75">{t.body1}</p>
            <p className="mt-5 font-serif text-lg italic text-ink-foreground/90">{t.tagline}</p>
            <p className="mt-6 text-pretty leading-relaxed text-ink-foreground/75">{t.body2}</p>
          </div>

          <div className="md:col-span-6">
            <div className="rounded-sm border border-ink-foreground/15 bg-ink-foreground/[0.04] p-8">
              <h3 className="font-serif text-xl font-semibold">{t.infoTitle}</h3>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
                {details.map((item) => (
                  <div key={item.label} className="border-t border-ink-foreground/15 pt-3">
                    <dt className="text-xs uppercase tracking-[0.18em] text-ink-foreground/55">
                      {item.label}
                    </dt>
                    <dd className="mt-1 font-medium text-ink-foreground">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-sm text-ink-foreground/60">{t.footnote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
