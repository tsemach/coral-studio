// Glumački Studio's brand tokens, carried over from studio-web's
// app/globals.css @theme block (the same ink/parchment/curtain/brass
// palette the web app's own /workshops screen already uses) so the mobile
// app reads as the same studio rather than a second, unrelated brand.
export const colors = {
  ink: '#17110e',
  inkCard: '#241d18',
  parchment: '#efe7db',
  parchmentMuted: 'rgba(239, 231, 219, 0.7)',
  hairline: 'rgba(239, 231, 219, 0.16)',
  primary: '#8f2436',
  primaryForeground: '#fbf3ec',
  accent: '#c08a2d',
  // Community-only accent: the studio-web Community section (channel tabs,
  // channel tags, primary post/comment/tape actions) uses a distinct blue
  // rather than the site-wide maroon `primary` -- Workshops keeps `primary`
  // unchanged. Matches Tailwind's blue-500/400/300 as used in
  // components/community/*.tsx (bg-blue-500/50, border-blue-400/50,
  // text-blue-300, border-blue-500/40 + bg-blue-500/15 for the active tab).
  communityBlue: '#3080ff',
  communityBlueLight: '#90c5ff',
  communityBlueBorder: 'rgba(48, 128, 255, 0.4)',
  communityBlueTint: 'rgba(48, 128, 255, 0.15)',
  // Matches studio-web's WorkshopCardMenu destructive item color
  // (text-[#f0a8b4]) -- reused here for the mobile workshop kebab menu's
  // "Leave workgroup" item so the two apps agree on what "destructive" looks
  // like.
  danger: '#f0a8b4',
  // A muted forest green for the "Open Rehearsal Room" button -- sits
  // better against this app's warm ink/brass palette than studio-web's flat
  // Tailwind emerald-600, which read as too cold/saturated here.
  success: '#3f7d59',
  successForeground: '#fbf3ec',
} as const

// Fraunces is reserved for the wordmark/auth moment only, mirroring
// studio-web exactly: `font-serif` there never appears inside the actual
// app (workshops, community, admin) -- only on the marketing site and the
// login/register pages' heading + site-header wordmark. Everywhere else on
// web uses the plain sans body font at various weights, so mobile's in-app
// screens do the same (system font, no fontFamily override needed).
export const fonts = {
  wordmark: 'Fraunces_600SemiBold',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const radius = 6

// A more pronounced rounding for pill-style controls (workshop kebab menu,
// Script/Group tabs) -- everything else in the app stays on the flatter
// `radius` above.
export const pillRadius = 14
