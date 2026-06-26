/** Stable category preset ids — no imports from types or categoryPresets. */

export const NF_PEOPLE_CATEGORY_ID = 'nf-people'

export const PEOPLE_INTERVIEW_STATUS_OPTIONS = [
  'Not contacted',
  'Requested',
  'Scheduled',
  'Completed',
  'Declined'
] as const

export const BUILTIN_CATEGORY_IDS = {
  characters: 'builtin-characters',
  locations: 'builtin-locations',
  lore: 'builtin-lore',
  notes: 'builtin-notes'
} as const

export const OPTIONAL_BESTIARY_CATEGORY_ID = 'optional-bestiary'
