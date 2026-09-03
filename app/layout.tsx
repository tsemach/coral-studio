import type { Metadata, Viewport } from 'next'
import { Geist, Fraunces } from 'next/font/google'
import { AuthSessionProvider } from '@/components/auth-session-provider'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
})

export const metadata: Metadata = {
  title: 'Glumački Studio — Acting Training in Belgrade',
  description:
    'A professional, non-profit acting studio in Belgrade offering practical, technique-based training in English for actors at every level. Weekly classes with Coral Mizrachi.',
  openGraph: {
    title: 'Glumački Studio — Acting Training in Belgrade',
    description:
      'Serious, practical acting training in English. Weekly classes, special workshops, and a supportive community in Belgrade.',
    type: 'website',
  },
  // Named public/glumacki-icon.svg rather than app/icon.svg, so it needs to
  // be declared explicitly here -- Next's file-convention icon detection
  // only picks up the exact reserved filename `icon.svg` under app/.
  icons: {
    icon: '/glumacki-icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#17110e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`bg-background ${geistSans.variable} ${fraunces.variable}`}
    >
      <body className="font-sans antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  )
}
