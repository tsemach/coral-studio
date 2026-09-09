import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Facebook from 'next-auth/providers/facebook'

export default {
  session: {
    strategy: 'jwt',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Google verifies email ownership before issuing a token, and
      // signIn() in auth.ts already trusts a Google-verified email enough to
      // auto-provision a brand new user from it -- so trusting it to attach
      // to an *existing* user with the same email (e.g. one that originally
      // signed up via Credentials) is the same trust boundary, not a new
      // one. Without this, anyone who signed up with a password before ever
      // trying Google hits OAuthAccountNotLinked and can never connect
      // Google (and therefore Calendar) to their existing account.
      allowDangerousEmailAccountLinking: true,
      // calendar.events (not the broader `calendar` scope) is enough
      // to create/update/delete rehearsal events. access_type=offline +
      // prompt=consent guarantee a refresh_token comes back so Calendar
      // access still works after the initial access token expires -- Google
      // otherwise only issues a refresh_token on a user's very first consent.
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          // select_account: forces Google's account picker every time,
          // rather than silently reusing whichever Google account happens
          // to already be signed in in the browser -- without it, connecting
          // Google for one site user while a *different* Google account is
          // active in the browser produces OAuthAccountNotLinked ("already
          // associated with another user") instead of letting the person
          // pick the right one.
          prompt: 'select_account consent',
        },
      },
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
} satisfies NextAuthConfig
