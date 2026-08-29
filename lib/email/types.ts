// Swappable email-sending interface -- no real provider is configured until
// RESEND_API_KEY is set (see index.ts), so this starts against a mock
// implementation that logs to the console instead of sending.
export interface EmailProvider {
  sendVerificationEmail(email: string, verifyUrl: string): Promise<void>
  // Sent to every active admin once a registrant confirms their email
  // (COR-5 item 5: confirming the email routes the request to admins for
  // final approval, it doesn't register the user yet).
  sendPendingApprovalNotification(adminEmail: string, registrantEmail: string): Promise<void>
  // Sent to the registrant once an admin approves them -- this is the
  // moment they can actually log in.
  sendApprovedEmail(email: string, loginUrl: string): Promise<void>
}
