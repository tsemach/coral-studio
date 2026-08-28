export function ApproachSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-primary">
            Our approach
          </p>
          <h2 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Technique is a tool — not a formula
          </h2>
          <p className="mt-6 text-pretty leading-relaxed text-muted">
            Studying technique should give an actor more freedom, not more
            rules. We expose students to practical tools and the principles
            behind them, so they can build a process that is their own.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <article className="rounded-sm border border-border bg-card p-8">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">
              Uta Hagen
            </h3>
            <p className="mt-4 text-pretty leading-relaxed text-muted">
              Hagen&apos;s approach places significant emphasis on truthful
              behavior, circumstances, relationships and the actor&apos;s
              ability to fully engage with the world of the character —
              practical ways to investigate a scene and make choices specific
              and grounded.
            </p>
          </article>

          <article className="rounded-sm border border-border bg-card p-8">
            <h3 className="font-serif text-2xl font-semibold tracking-tight">
              Sanford Meisner
            </h3>
            <p className="mt-4 text-pretty leading-relaxed text-muted">
              Meisner&apos;s work emphasizes living truthfully under imaginary
              circumstances, listening and responding authentically to your
              scene partner. Repetition and related practices build presence
              and responsiveness rather than pre-planned choices.
            </p>
          </article>
        </div>

        <p className="mt-10 max-w-3xl text-pretty text-lg leading-relaxed text-foreground/90">
          The purpose is not to make actors perform &ldquo;a Meisner
          scene&rdquo; or &ldquo;a Hagen scene.&rdquo; It is to give actors a
          broader understanding of the craft and a greater range of tools with
          which to approach their work.
        </p>
      </div>
    </section>
  )
}
