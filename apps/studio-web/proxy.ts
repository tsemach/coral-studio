import NextAuth from 'next-auth'
import authConfig from './auth.config'

// Edge-safe: authConfig has no DB access (no Credentials provider, no
// adapter), so this only checks isLoggedIn -- not role. The real role
// check (fresh from the DB) happens in app/admin/users/page.tsx and its
// server actions via the full auth() in auth.ts.
const { auth } = NextAuth(authConfig)

export default auth((req) => {
  if (!req.auth) {
    return Response.redirect(new URL('/login', req.nextUrl))
  }
})

export const config = {
  matcher: ['/admin/:path*'],
}
