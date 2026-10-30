/**
 * Universal safe copy-to-clipboard utility.
 * 
 * Works seamlessly in:
 * - Secure contexts (HTTPS and localhost via navigator.clipboard)
 * - Insecure contexts (HTTP over LAN IP, e.g. http://192.168.0.107:3000 where navigator.clipboard is undefined)
 * - Mobile browsers, older webviews, and embedded iframes
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. Primary: Modern Clipboard API (available in HTTPS or localhost)
  if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Modern API rejected or blocked permissions — fall through to legacy fallback
    }
  }

  // 2. Fallback: document.execCommand('copy') with invisible textarea
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn("[Clipboard] Copy fallback failed:", err);
    return false;
  }
}
