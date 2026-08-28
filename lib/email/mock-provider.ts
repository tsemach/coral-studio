import type { EmailProvider } from './types'

// No real email provider is connected yet -- this logs to the server
// console instead of sending, so the full register -> verify -> pending
// approval loop is real and testable without needing a real inbox.
export class MockEmailProvider implements EmailProvider {
  async sendVerificationEmail(email: string, verifyUrl: string): Promise<void> {
    console.log(`[MockEmailProvider] Verification link for ${email}:\n${verifyUrl}`)
  }

  async sendPendingApprovalNotification(adminEmail: string, registrantEmail: string): Promise<void> {
    console.log(`[MockEmailProvider] ${registrantEmail} is awaiting approval -- notifying admin ${adminEmail}`)
  }
}
