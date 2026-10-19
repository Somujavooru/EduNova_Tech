/**
 * Dev-only logger utility.
 *
 * Rules:
 * - logger.log / logger.warn are silenced in production — use for debug/info only.
 * - logger.error always logs — unexpected errors should never be silently swallowed.
 * - Never log full user objects, emails, or role values.
 *   Log only UIDs or masked values (e.g. user.id, not the full user object).
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args);
  },
  /** Always logs — errors should be visible in production for monitoring. */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
