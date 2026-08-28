import Image from 'next/image'

const credits = [
  { work: 'The Ark', note: 'Syfy series' },
  { work: 'Shutafim', note: 'Comedy Central' },
  { work: 'Block Boys Behind the Light', note: 'Netflix pilot' },
  { work: 'Foreign Form', note: 'Feature film' },
  { work: 'New Love', note: 'Madlenianum Opera & Theatre' },
]

export function TeacherSection() {
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
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">
              The teacher
            </p>
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Coral Mizrachi
            </h2>
            <p className="mt-1 text-sm uppercase tracking-[0.2em] text-muted">
              Actress &amp; Acting Coach
            </p>

            <p className="mt-6 text-pretty leading-relaxed text-foreground/90">
              Coral is an internationally working actress whose career spans
              film, television and theatre, and a graduate of the American
              Academy of Dramatic Arts in New York. She teaches in English and
              works with a variety of techniques, with particular emphasis on
              Uta Hagen and Sanford Meisner.
            </p>
            <p className="mt-4 text-pretty leading-relaxed text-muted">
              Her experience across mediums gives her a practical understanding
              of the demands placed on actors beyond the classroom — from
              working with text and scene partners to approaching auditions and
              performing for camera or stage.
            </p>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Selected credits
              </p>
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {credits.map((c) => (
                  <li
                    key={c.work}
                    className="flex items-baseline justify-between gap-4 py-3"
                  >
                    <span className="font-serif text-lg font-medium">
                      {c.work}
                    </span>
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
