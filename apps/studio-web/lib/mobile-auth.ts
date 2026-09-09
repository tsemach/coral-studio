import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'

// Entirely separate from next-auth's session JWT (auth.ts) -- own secret,
// own claims, own verification path. Never shared with or read by auth.ts.
function encodedSecret(): Uint8Array {
  const secret = process.env.MOBILE_AUTH_SECRET
  if (!secret) throw new Error('MOBILE_AUTH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function signMobileToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encodedSecret())
}

export async function verifyMobileToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret())
    if (typeof payload.sub !== 'string') return null
    return { userId: payload.sub }
  } catch {
    return null
  }
}

export async function getMobileUser(request: Request): Promise<{ userId: string } | null> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return verifyMobileToken(header.slice('Bearer '.length))
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  return row?.role === 'admin'
}
