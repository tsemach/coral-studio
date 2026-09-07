import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function AboutSection() {
  const { about: t } = await getDictionary()

  return (
    <section id="about" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">{t.eyebrow}</p>
            <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {t.title}
            </h2>
            <p className="mt-6 text-pretty leading-relaxed text-muted">{t.intro}</p>
          </div>

          <div className="space-y-6 md:col-span-7 md:pt-10">
            <p className="text-pretty text-lg leading-relaxed text-foreground/90">{t.body1}</p>
            <p className="text-pretty leading-relaxed text-muted">{t.body2}</p>
            <p className="text-pretty leading-relaxed text-muted">{t.body3}</p>

            <blockquote className="mt-8 border-l-2 border-primary pl-5 font-serif text-xl italic leading-relaxed text-foreground">
              {t.quote}
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  )
}
