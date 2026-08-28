const faqs = [
  {
    q: 'Do I need previous acting experience?',
    a: 'No. Glumački Studio welcomes both complete beginners and working actors. The classes are designed to provide serious training regardless of where you are starting from.',
  },
  {
    q: 'Is this a professional acting school?',
    a: 'It is a professional acting training studio focused on practical actor development rather than a formal degree. Classes are technique-based and led by a professionally trained, working actress.',
  },
  {
    q: 'What acting techniques do you teach?',
    a: 'The studio explores a variety of acting techniques, with a particular focus on Uta Hagen and Sanford Meisner.',
  },
  {
    q: 'What do you do during class?',
    a: 'Classes can include scene study, monologues, Meisner repetition exercises, script analysis, and voice and movement work, among other practical acting exercises.',
  },
  {
    q: 'Can working actors join?',
    a: 'Absolutely. Working actors can use the weekly class as ongoing training — to maintain their technique, explore new approaches and keep working between professional projects.',
  },
  {
    q: 'What language are classes taught in, and what age?',
    a: 'Weekly classes are taught entirely in English, and students must be 18 or older.',
  },
  {
    q: 'When and where are classes, and how much do they cost?',
    a: 'Every Sunday from 11:00 AM to 2:00 PM at Auditoria Bookstore in Belgrade, with a 15-minute break. The monthly fee is €40, which includes four classes per month.',
  },
  {
    q: 'Are there workshops as well?',
    a: 'Yes. In addition to the weekly class, the studio organizes special workshops with guest teachers and professionals, announced separately with their own prices, schedules and focus.',
  },
]

export function FaqSection() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-4xl px-5 py-20 md:px-8 md:py-28">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">
          FAQ
        </p>
        <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          Frequently asked questions
        </h2>

        <div className="mt-12 divide-y divide-border border-t border-border">
          {faqs.map((item) => (
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
              <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
