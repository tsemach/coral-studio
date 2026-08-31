export function WorkshopSection() {
  return (
    <section id="workshops" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">
              Special workshops
            </p>
            <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Weekly classes build the foundation. Workshops expand the toolbox.
            </h2>
            <p className="mt-6 text-pretty leading-relaxed text-muted">
              Alongside our ongoing weekly classes, Glumački Studio hosts
              special workshops with guest teachers, coaches and professionals.
              They offer a concentrated period to explore a particular
              technique, discipline or aspect of the profession with a
              specialist.
            </p>
            <p className="mt-5 text-pretty leading-relaxed text-muted">
              This keeps the studio connected to a broader acting community and
              gives students opportunities to encounter teachers with different
              experiences and areas of expertise.
            </p>
          </div>

          <div className="md:col-span-5">
            <div className="rounded-sm border border-border bg-card p-8">
              <p className="font-serif text-xl italic leading-relaxed text-foreground">
                Upcoming workshops are announced through the studio&apos;s
                website and social media.
              </p>
              <a
                href="https://www.instagram.com/glumacki.studio.bg/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-foreground"
              >
                Follow on Instagram
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
