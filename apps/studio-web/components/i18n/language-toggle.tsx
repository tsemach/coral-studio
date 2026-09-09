'use client'

import { useTranslation } from './language-provider'

export function LanguageToggle({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { locale, setLocale, t } = useTranslation()
  const next = locale === 'en' ? 'sr' : 'en'
  const isDark = variant === 'dark'

  const border = isDark
    ? 'border-ink-foreground/20 hover:border-ink-foreground/40'
    : 'border-foreground/20 hover:border-foreground/40'
  const dim = isDark ? 'text-ink-foreground/35' : 'text-foreground/35'
  const active = isDark ? 'text-ink-foreground' : 'text-foreground'

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={t.languageToggle.switchTo}
      className={`flex h-10 items-center gap-1 rounded-full border px-3 text-xs font-semibold tracking-wide transition-colors ${border}`}
    >
      <span className={locale === 'en' ? active : dim}>EN</span>
      <span aria-hidden="true" className={dim}>
        /
      </span>
      <span className={locale === 'sr' ? active : dim}>SB</span>
    </button>
  )
}
