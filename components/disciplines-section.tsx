const disciplines = [
  {
    title: 'Scene Study',
    body: 'Work with scenes from real scripts to explore character, circumstances, relationships, objectives, actions and behavior — putting technique to the test.',
  },
  {
    title: 'Monologue Work',
    body: 'Develop the ability to sustain a character\u2019s circumstances, objective and emotional life independently, staying grounded and truthful.',
  },
  {
    title: 'Meisner Repetition',
    body: 'Build listening, presence, spontaneity and truthful response — moving away from planned performance toward what is happening in the moment.',
  },
  {
    title: 'Script Analysis',
    body: 'Read between the lines to identify circumstances, relationships, objectives, actions and obstacles, so choices are informed rather than generic.',
  },
  {
    title: 'Voice',
    body: 'Explore vocal awareness, clarity, breath and intention — and the relationship between voice and emotional or physical action.',
  },
  {
    title: 'Movement',
    body: 'Develop awareness of physical choices, presence and impulse, and the relationship between the body and the character.',
  },
]

export function DisciplinesSection() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">
            What we work on
          </p>
          <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Practical actor training, from many directions
          </h2>
          <p className="mt-6 text-pretty leading-relaxed text-muted">
            Acting is made up of many interconnected skills. Our classes
            approach the work from multiple angles rather than relying on a
            single exercise or type of training.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {disciplines.map((item) => (
            <div
              key={item.title}
              className="flex flex-col bg-card p-7 transition-colors hover:bg-background"
            >
              <span className="h-px w-8 bg-accent" />
              <h3 className="mt-5 font-serif text-xl font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
