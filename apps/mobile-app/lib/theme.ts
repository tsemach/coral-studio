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

export const fonts = {
  serif: 'Fraunces_600SemiBold',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const radius = 6
