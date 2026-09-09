import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/database'
import { users } from '@/lib/database/schema'
import { createEmailVerification } from '@/lib/emailVerification'
import { isValidEmail, isValidPasswordLength } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields: name, email, and password' }, { status: 400 })
    }

    // Server-side is the enforcement source of truth -- the client-side
    // checks in register-form.tsx are only for immediate UX feedback.
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (!isValidPasswordLength(password)) {
      return NextResponse.json({ error: 'Password must be between 6 and 48 characters long.' }, { status: 400 })
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (existingUser) {
      // Deliberately generic -- a distinct "already exists" message lets an
      // attacker enumerate registered emails by probing this endpoint.
      return NextResponse.json({ error: 'Registration failed. Please try a different email.' }, { status: 400 })
    }

    const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10))

    // role/status stay at their schema defaults (user / pending_email) --
    // this endpoint can never create an admin (COR-5 item 3).
    const [newUser] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })

    // If the verification email fails to send, roll back the user row --
    // otherwise it's stuck unverified (login blocked) and unretriable (a
    // second signup attempt hits the generic "failed" error above).
    try {
      const origin = new URL(request.url).origin
      await createEmailVerification(email, origin)
    } catch (verificationError) {
      await db.delete(users).where(eq(users.id, newUser.id))
      const message = verificationError instanceof Error ? verificationError.message : 'unknown error'
      throw new Error(`Account created but the verification email failed to send: ${message}. Please try registering again.`)
    }

    return NextResponse.json({ success: true, user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create user account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
