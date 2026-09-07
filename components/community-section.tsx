import Image from 'next/image'
import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function CommunitySection() {
  const { community: t } = await getDictionary()

  return (
    <section id="community" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
          <div className="order-2 md:order-1 md:col-span-6">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">{t.eyebrow}</p>
            <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {t.title}
            </h2>
            <p className="mt-6 text-pretty leading-relaxed text-muted">{t.body1}</p>
            <p className="mt-5 text-pretty leading-relaxed text-muted">{t.body2}</p>
            <p className="mt-6 font-serif text-xl italic text-foreground">{t.tagline}</p>
          </div>

          <div className="order-1 md:order-2 md:col-span-6">
            <div className="relative aspect-[5/4] overflow-hidden rounded-sm border border-border">
              <Image
                src="/images/community.png"
                alt="A group of acting students during a studio workshop"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
