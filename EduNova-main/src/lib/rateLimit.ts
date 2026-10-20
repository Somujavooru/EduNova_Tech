/**
 * Cloudflare Rate Limiting binding with in-memory fallback for local development.
 *
 * In production Cloudflare Workers (OpenNext):
 * Uses env.RATE_LIMITER.limit({ key }) accessed via getCloudflareContext().
 *
 * When running locally (NODE_ENV !== "production"):
 * Falls back to an in-memory Map limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const localStore = new Map<string, RateLimitEntry>();

function checkLocalRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = localStore.get(key);

  if (!entry || now > entry.resetAt) {
    localStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Checks rate limit for a given key.
 * Returns true if request is allowed, false if rate limited.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 5,
  windowSeconds: number = 600
): Promise<boolean> {
  // In production on Cloudflare Workers, use Cloudflare's Rate Limiter binding
  if (process.env.NODE_ENV === "production") {
    try {
      const cfModule = "@opennextjs/cloudflare";
      // @ts-ignore - Dynamically loaded at runtime in Cloudflare Worker environment
      const mod = await import(/* webpackIgnore: true */ cfModule);
      const ctx = mod?.getCloudflareContext ? mod.getCloudflareContext() : null;
      const limiter = ctx?.env?.RATE_LIMITER || (globalThis as any)?.RATE_LIMITER;

      if (limiter && typeof limiter.limit === "function") {
        const { success } = await limiter.limit({ key });
        return success;
      }
    } catch {
      // If outside Cloudflare execution context, fall back to in-memory
    }
  }

  // Fall back to local in-memory Map limiter (local dev / test environments)
  return checkLocalRateLimit(key, limit, windowSeconds * 1000);
}
