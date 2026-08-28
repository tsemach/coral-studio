const details = [
  { label: 'Day', value: 'Every Sunday' },
  { label: 'Time', value: '11:00 AM – 2:00 PM' },
  { label: 'Break', value: '15 minutes' },
  { label: 'Frequency', value: '4 classes / month' },
  { label: 'Monthly fee', value: '€40' },
  { label: 'Language', value: 'English' },
  { label: 'Age', value: '18+' },
  { label: 'Location', value: 'Auditoria Bookstore' },
]

export function ClassesSection() {
  return (
    <section id="classes" className="scroll-mt-20 border-b border-border bg-ink text-ink-foreground">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-14 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-6">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-accent">
              The weekly class
            </p>
            <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              The core of the studio
            </h2>
            <p className="mt-6 text-pretty leading-relaxed text-ink-foreground/75">
              Rather than treating training as a one-time experience, the weekly
              class lets actors train consistently and develop over time. Each
              three-hour session combines practical exercises and acting work —
              enough time to work, receive direction, adjust your choices and
              try again.
            </p>
            <p className="mt-5 font-serif text-lg italic text-ink-foreground/90">
              Work, observe, adjust, repeat.
            </p>
            <p className="mt-6 text-pretty leading-relaxed text-ink-foreground/75">
              The class is designed for both beginners and experienced actors,
              with exercises and material adapted to the needs and level of the
              students.
            </p>
          </div>

          <div className="md:col-span-6">
            <div className="rounded-sm border border-ink-foreground/15 bg-ink-foreground/[0.04] p-8">
              <h3 className="font-serif text-xl font-semibold">
                Current class information
              </h3>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
                {details.map((item) => (
                  <div key={item.label} className="border-t border-ink-foreground/15 pt-3">
                    <dt className="text-xs uppercase tracking-[0.18em] text-ink-foreground/55">
                      {item.label}
                    </dt>
                    <dd className="mt-1 font-medium text-ink-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-sm text-ink-foreground/60">
                Auditoria Bookstore, Belgrade · Beginners and working actors
                welcome.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
