import Image from 'next/image'

export function CommunitySection() {
  return (
    <section id="community" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
          <div className="order-2 md:order-1 md:col-span-6">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">
              Community
            </p>
            <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Serious training. Supportive community.
            </h2>
            <p className="mt-6 text-pretty leading-relaxed text-muted">
              Acting is collaborative by nature. You cannot learn to listen
              without another person to listen to, or develop the ability to
              respond truthfully without taking risks in front of others. For
              that reason, community is an important part of the studio — but it
              exists alongside the training, not instead of it.
            </p>
            <p className="mt-5 text-pretty leading-relaxed text-muted">
              A beginner might learn from a working actor&apos;s experience. A
              working actor might discover something unexpected from someone who
              approaches a scene without years of habitual technique. Students
              share knowledge, exchange tips and build relationships within the
              acting community in Belgrade.
            </p>
            <p className="mt-6 font-serif text-xl italic text-foreground">
              We train seriously. We work together. We grow together.
            </p>
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
