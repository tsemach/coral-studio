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
