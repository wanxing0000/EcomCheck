/**
 * User-friendly Supabase Auth error messages for login/register UI.
 */
export function formatAuthError(error) {
  const message = error?.message || String(error || '')
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Try logging in.'
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 6 characters.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  return message || 'Something went wrong. Please try again.'
}
