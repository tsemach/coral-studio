'use client'

import Link from 'next/link'
import { useState } from 'react'

const navLinks = [
  { label: 'About', href: '/#about' },
  { label: 'Workshop', href: '/#workshop' },
  { label: 'Communities', href: '/#community' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 md:h-20 md:px-8">
        <Link href="/" className="group flex flex-col leading-none">
          <span className="font-serif text-lg font-semibold tracking-tight text-foreground md:text-xl">
            Glumački Studio
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.28em] text-muted">
            Acting · Belgrade
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="relative text-sm font-medium text-foreground/80 transition-colors hover:text-foreground after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-sm border border-foreground/25 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/50 hover:bg-foreground hover:text-background md:inline-block"
          >
            Log in
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-foreground/20 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <span className="sr-only">Menu</span>
            <div className="flex flex-col gap-1.5">
              <span className="h-px w-5 bg-foreground" />
              <span className="h-px w-5 bg-foreground" />
              <span className="h-px w-5 bg-foreground" />
            </div>
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-border bg-background px-5 py-4 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-sm px-2 py-3 text-base font-medium text-foreground/85 hover:bg-card"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-sm bg-foreground px-2 py-3 text-center text-base font-medium text-background"
              >
                Log in
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
