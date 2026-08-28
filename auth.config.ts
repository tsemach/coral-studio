import type { NextAuthConfig } from 'next-auth'

export default {
  session: {
    strategy: 'jwt',
  },
  providers: [],
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
  },
} satisfies NextAuthConfig
