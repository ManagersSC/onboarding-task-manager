// VULN-H5: Shared password validation — enforce consistently across sign-up, reset-password, accept-invite
const FORBIDDEN_SEQUENCES = ["012", "123", "234", "345", "456", "567", "678", "789"]

/**
 * Validates password complexity.
 * Returns { valid: true } or { valid: false, message: string }
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: "Password is required" }
  }

  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" }
  }

  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  if (!hasSpecial) {
    return { valid: false, message: "Password must include at least one special character" }
  }

  for (const seq of FORBIDDEN_SEQUENCES) {
    if (password.includes(seq)) {
      return { valid: false, message: "Password cannot contain consecutive number sequences" }
    }
  }

  return { valid: true }
}
