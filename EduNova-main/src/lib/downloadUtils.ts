/**
 * Triggers a secure, pure client-side file download using URL.createObjectURL and HTML5 <a> download attribute.
 *
 * Avoids proxying large file buffers through server routes, protecting Cloudflare Worker memory
 * and eliminating open reflection/proxy attack surfaces.
 */

export function secureApiDownload(
  blob: Blob | string,
  filename: string,
  _type: "pdf" | "zip" | "excel" = "pdf"
): void {
  if (typeof window === "undefined") return;

  let targetBlob: Blob;

  if (typeof blob === "string") {
    if (blob.startsWith("data:")) {
      const parts = blob.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      const base64Str = parts[1] || "";
      const binary = atob(base64Str);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      targetBlob = new Blob([array], { type: mime });
    } else {
      targetBlob = new Blob([blob], { type: "text/plain" });
    }
  } else {
    targetBlob = blob;
  }

  const url = URL.createObjectURL(targetBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
