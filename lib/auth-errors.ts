export function getAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password. Double-check your credentials and try again.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before logging in. Check your inbox for the confirmation link.";
  }

  if (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit")
  ) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  return message;
}
