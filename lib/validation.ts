// Shared client + server validation for auth forms, so the rules can't
// drift between what the UI checks and what the API enforces.

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPasswordLength(password: string): boolean {
  return password.length >= 6 && password.length <= 48
}
