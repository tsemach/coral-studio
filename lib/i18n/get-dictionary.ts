import 'server-only'
import { cookies } from 'next/headers'
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config'
import { en, type Dictionary } from './dictionaries/en'
import { sr } from './dictionaries/sr'

const dictionaries: Record<Locale, Dictionary> = { en, sr }

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return value && isLocale(value) ? value : defaultLocale
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]
}
