import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function DisciplinesSection() {
  const { disciplines: t } = await getDictionary()

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">{t.eyebrow}</p>
          <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {t.title}
          </h2>
          <p className="mt-6 text-pretty leading-relaxed text-muted">{t.body}</p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((item) => (
            <div
              key={item.title}
              className="flex flex-col bg-card p-7 transition-colors hover:bg-background"
            >
              <span className="h-px w-8 bg-accent" />
              <h3 className="mt-5 font-serif text-xl font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
