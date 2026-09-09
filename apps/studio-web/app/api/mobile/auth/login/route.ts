import { verifyCredentials } from '@/lib/verifyCredentials'
import { signMobileToken } from '@/lib/mobile-auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email : null
  const password = typeof body?.password === 'string' ? body.password : null

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const result = await verifyCredentials(email, password)
  if ('error' in result) {
    return Response.json({ error: result.error }, { status: 401 })
  }

  const token = await signMobileToken(result.user.id)
  return Response.json({
    token,
    user: { id: result.user.id, name: result.user.name, email: result.user.email, image: result.user.image },
  })
}
