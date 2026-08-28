import Image from 'next/image'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-ink-foreground">
      <div className="absolute inset-0">
        <Image
          src="/images/hero-studio.png"
          alt="Two actors working through a scene in a warm rehearsal studio"
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/40" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-40">
        <p className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-accent">
          <span className="h-px w-8 bg-accent" />
          Professional acting studio · Belgrade
        </p>

        <h1 className="max-w-4xl text-balance font-serif text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
          Serious acting training. A place to grow.
        </h1>

        <p className="mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-ink-foreground/75 md:text-xl">
          A professional, technique-based acting studio offering practical
          training in English for actors at every level — with a particular
          focus on the approaches of Uta Hagen and Sanford Meisner.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/#classes"
            className="inline-flex items-center justify-center rounded-sm bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Explore our classes
          </Link>
          <Link
            href="/#teacher"
            className="inline-flex items-center justify-center rounded-sm border border-ink-foreground/30 px-7 py-3.5 text-sm font-semibold text-ink-foreground transition-colors hover:bg-ink-foreground hover:text-ink"
          >
            Meet the teacher
          </Link>
        </div>

        <p className="mt-12 max-w-xl text-pretty font-serif text-lg italic text-ink-foreground/85 md:text-xl">
          Train your craft. Find your voice. Work with others. Keep growing.
        </p>
      </div>
    </section>
  )
}
