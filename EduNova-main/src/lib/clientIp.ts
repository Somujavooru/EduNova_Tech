/**
 * Extracts the client IP address from headers that the HOSTING PLATFORM sets itself.
 * - Netlify: x-nf-client-connection-ip (set by Netlify's edge; clients cannot override it)
 * - Cloudflare: cf-connecting-ip
 * Falls back to "unknown" if none is present.
 * Strictly ignores generic client-controllable forwarding headers to prevent IP spoofing.
 * The Netlify header is checked first so a visitor cannot spoof their address
 * by sending a fake cf-connecting-ip header.
 */

export function getClientIp(request: Request): string {
  const nfIp = request.headers.get("x-nf-client-connection-ip");
  if (nfIp && nfIp.trim()) {
    return nfIp.trim();
  }
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) {
    return cfIp.trim();
  }
  return "unknown";
}
