import Link from 'next/link'
import { UserMenu } from '@/components/user-menu'
import { getDictionary } from '@/lib/i18n/get-dictionary'

export async function WorkshopTopbar() {
  const { workshops: t } = await getDictionary()

  return (
    <div className="flex items-center justify-between border-b border-ink-foreground/16 px-8 py-[18px]">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          aria-label={t.topbar.backToSite}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-foreground/16 text-ink-foreground/55 transition-colors hover:border-ink-foreground/30 hover:text-ink-foreground"
        >
          ←
        </Link>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-foreground/55">
            {t.topbar.sectionLabel}
          </p>
          <p className="mt-0.5 text-[21px] font-semibold tracking-tight">{t.topbar.title}</p>
        </div>
      </div>

      <UserMenu />
    </div>
  )
}
