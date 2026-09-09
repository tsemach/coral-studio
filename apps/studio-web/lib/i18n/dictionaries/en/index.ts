import { marketing, type MarketingDictionary } from './marketing'
import { admin, type AdminDictionary } from './admin'
import { community, type CommunityDictionary } from './community'
import { workshops, type WorkshopsDictionary } from './workshops'
import { scripts, type ScriptsDictionary } from './scripts'

export type Dictionary = MarketingDictionary &
  AdminDictionary &
  CommunityDictionary &
  WorkshopsDictionary &
  ScriptsDictionary

export const en: Dictionary = {
  ...marketing,
  ...admin,
  ...community,
  ...workshops,
  ...scripts,
}
