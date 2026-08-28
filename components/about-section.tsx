export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">
              About the studio
            </p>
            <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Acting is a craft. We treat it like one.
            </h2>
            <p className="mt-6 text-pretty leading-relaxed text-muted">
              Glumački Studio is a non-profit acting studio in Belgrade
              dedicated to the serious study and practice of acting — a
              consistent space to train technique, explore different approaches
              and develop the practical skills of a contemporary actor.
            </p>
          </div>

          <div className="space-y-6 md:col-span-7 md:pt-10">
            <p className="text-pretty text-lg leading-relaxed text-foreground/90">
              Our classes focus on <em className="font-serif">doing</em> rather
              than simply discussing acting. Students work through exercises,
              scene study, monologues, repetition, script analysis, voice and
              movement — concrete tools they can continue to develop and apply
              independently.
            </p>
            <p className="text-pretty leading-relaxed text-muted">
              We draw from several traditions, with particular emphasis on Uta
              Hagen and Sanford Meisner. Rather than asking every actor to fit
              one prescribed method, we explore different tools and encourage
              students to understand how and when to use them effectively.
            </p>
            <p className="text-pretty leading-relaxed text-muted">
              The studio is open to beginners and working actors aged 18 and
              over. Classes are conducted in English, making it a space where
              international and local actors can train together.
            </p>

            <blockquote className="mt-8 border-l-2 border-primary pl-5 font-serif text-xl italic leading-relaxed text-foreground">
              A high standard of professional practice, and an environment in
              which actors feel comfortable enough to take creative risks.
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  )
}
