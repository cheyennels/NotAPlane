// Single source of truth for password strength, used at signup, change, and
// reset. Also set a matching minimum in Supabase Auth settings (dashboard).
export const PASSWORD_MIN_LENGTH = 8;

/** Returns an error message if the password is too weak, otherwise null. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include a number.";
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return "Password must include a special character.";
  }
  return null;
}
