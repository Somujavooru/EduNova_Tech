/**
 * Extracts client IP address exclusively from Cloudflare's verified cf-connecting-ip header.
 *
 * Falls back to "unknown" if not present.
 * Strictly ignores unverified client-provided headers to prevent IP spoofing.
 */

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) {
    return cfIp.trim();
  }
  return "unknown";
}
