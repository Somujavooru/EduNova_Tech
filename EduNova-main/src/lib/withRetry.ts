/**
 * Shared retry helper with exponential backoff.
 *
 * Retries ONLY on transient Firestore / network errors:
 *   unavailable, deadline-exceeded, internal, resource-exhausted, or raw network failures.
 *
 * NEVER retries:
 *   permission-denied, failed-precondition, already-exists, not-found,
 *   or an HTTP 409 (duplicate-UTR).
 */

/** Firestore error codes that are transient and worth retrying. */
const RETRYABLE_CODES = new Set([
  "unavailable",
  "deadline-exceeded",
  "internal",
  "resource-exhausted",
]);

/** Firestore error codes that are permanent — retrying will never help. */
const NON_RETRYABLE_CODES = new Set([
  "permission-denied",
  "failed-precondition",
  "already-exists",
  "not-found",
  "unauthenticated",
  "invalid-argument",
]);

interface WithRetryOptions {
  /** Max number of retries (not counting the initial attempt). Default: 2 */
  retries?: number;
  /** Base delay in ms before the first retry. Default: 400 */
  baseDelayMs?: number;
  /** Human-readable label for error messages. Default: "Operation" */
  label?: string;
}

/**
 * Returns true if this error looks like a transient failure worth retrying.
 */
function isRetryable(err: unknown): boolean {
  // Firestore SDK errors carry a `code` property
  const code = (err as { code?: string })?.code;
  if (code) {
    if (NON_RETRYABLE_CODES.has(code)) return false;
    if (RETRYABLE_CODES.has(code)) return true;
  }

  // HTTP response errors from our API routes
  const status = (err as { status?: number })?.status;
  if (status === 409 || status === 403 || status === 401 || status === 400) return false;
  if (status && status >= 500) return true;

  // Raw network failures (TypeError: Failed to fetch, etc.)
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) return true;

  // Default: treat unknown errors as non-retryable to avoid infinite loops
  return false;
}

/**
 * Executes `fn` with exponential backoff retries on transient errors.
 *
 * @throws On permanent errors immediately, or after all retries are exhausted
 *         with a descriptive error message.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: WithRetryOptions = {}
): Promise<T> {
  const { retries = 2, baseDelayMs = 400, label = "Operation" } = opts;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // If the error is not retryable, throw immediately
      if (!isRetryable(err)) {
        throw err;
      }

      // If we've exhausted all retries, break and throw below
      if (attempt === retries) break;

      // Exponential backoff: baseDelayMs * 2^attempt + jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted — throw a descriptive error
  const code = (lastError as { code?: string })?.code || "unknown";
  const msg = (lastError as Error)?.message || String(lastError);
  throw new Error(
    `${label} failed after ${retries + 1} attempts (last error: [${code}] ${msg}). ` +
      `Please check your connection and try again.`
  );
}
