import { checkRateLimit } from "@/lib/rateLimit";

/**
 * Returns true if request is allowed, false if rate limited.
 * Evaluates both IP address and destination email independently.
 */
export async function checkEmailRateLimit(ip: string, email: string): Promise<boolean> {
  const ipAllowed = await checkRateLimit(`email:ip:${ip}`, 5, 600);
  const emailAllowed = await checkRateLimit(`email:addr:${email.toLowerCase()}`, 5, 600);
  return ipAllowed && emailAllowed;
}

/** Simple RFC 5322-ish email format check */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
