import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function FaqSection() {
  const { faq: t } = await getDictionary()

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-4xl px-5 py-20 md:px-8 md:py-28">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">{t.eyebrow}</p>
        <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          {t.title}
        </h2>

        <div className="mt-12 divide-y divide-border border-t border-border">
          {t.items.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-serif text-lg font-medium leading-snug text-foreground">
                  {item.q}
                </span>
                <span
                  className="shrink-0 text-2xl leading-none text-primary transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
