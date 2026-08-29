'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'

export function UserMenu() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (status !== 'authenticated' || !session.user) {
    return null
  }

  const { name, email, image } = session.user
  const isAdmin = (session.user as { role?: string }).role === 'admin'
  const label = name || email || 'Account'
  const initial = label.charAt(0).toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-foreground/20 bg-card text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {image && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar, not worth a remotePatterns config for a 40px icon
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-52 rounded-sm border border-border bg-card py-1 shadow-lg"
        >
          <div className="border-b border-border px-4 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{name || 'Account'}</p>
            {email && <p className="truncate text-xs text-muted">{email}</p>}
          </div>
          {isAdmin && (
            <Link
              href="/admin/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-foreground/85 hover:bg-background"
            >
              Settings
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              signOut({ callbackUrl: '/' })
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-foreground/85 hover:bg-background"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
