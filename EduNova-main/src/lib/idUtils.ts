/**
 * Safe random ID generator compatible with both browser (secure and non-secure HTTP contexts) and Node.js
 */
export function generateId(prefix = "", length = 10): string {
  let uniquePart = "";

  // 1. Try native crypto.randomUUID if available in secure contexts
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      uniquePart = crypto.randomUUID().replace(/-/g, "").substring(0, length).toUpperCase();
    } catch {}
  }

  // 2. Try crypto.getRandomValues if available
  if (!uniquePart && typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    try {
      const bytes = new Uint8Array(Math.ceil(length / 2));
      crypto.getRandomValues(bytes);
      uniquePart = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").substring(0, length).toUpperCase();
    } catch {}
  }

  // 3. Robust Math.random fallback (works everywhere, HTTP, IP access, older browsers)
  if (!uniquePart) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 2 + length).toUpperCase();
    uniquePart = `${timestamp}${rand}`.substring(0, length);
  }

  return prefix ? `${prefix}-${uniquePart}` : uniquePart;
}
