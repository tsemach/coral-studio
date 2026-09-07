import type { Dictionary } from '../en'
import { marketing } from './marketing'
import { admin } from './admin'
import { community } from './community'
import { workshops } from './workshops'
import { scripts } from './scripts'

export const sr: Dictionary = {
  ...marketing,
  ...admin,
  ...community,
  ...workshops,
  ...scripts,
}
