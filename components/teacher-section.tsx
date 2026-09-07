import Image from 'next/image'
import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function TeacherSection() {
  const { teacher: t } = await getDictionary()

  return (
    <section id="teacher" className="scroll-mt-20 border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-border">
              <Image
                src="/images/teacher.png"
                alt="Coral Mizrachi, actress and acting coach"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          </div>

          <div className="md:col-span-7">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">{t.eyebrow}</p>
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {t.name}
            </h2>
            <p className="mt-1 text-sm uppercase tracking-[0.2em] text-muted">{t.role}</p>

            <p className="mt-6 text-pretty leading-relaxed text-foreground/90">{t.body1}</p>
            <p className="mt-4 text-pretty leading-relaxed text-muted">{t.body2}</p>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">{t.creditsLabel}</p>
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {t.credits.map((c) => (
                  <li
                    key={c.work}
                    className="flex items-baseline justify-between gap-4 py-3"
                  >
                    <span className="font-serif text-lg font-medium">{c.work}</span>
                    <span className="text-sm text-muted">{c.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
