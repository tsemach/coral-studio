export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-muted">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          Coral Studio
        </span>

        <h1 className="text-balance text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Coming <span className="text-primary">Soon</span>
        </h1>

        <p className="mt-6 max-w-md text-pretty leading-relaxed text-muted">
          We&apos;re crafting something worth the wait. Coral Studio is almost
          ready to share. Check back shortly.
        </p>

        <footer className="mt-16 font-mono text-xs uppercase tracking-widest text-muted">
          &copy; {new Date().getFullYear()} Coral Studio
        </footer>
      </div>
    </main>
  )
}
