/**
 * Uploads a base64 data URL via the secure server-side Cloudinary upload endpoint
 * and returns the authenticated, signed download URL.
 *
 * Scopes uploads to per-user path: payment-screenshots/${userId}/
 * Validates image type (JPEG/PNG/WebP) and client-side size (< 5MB).
 * Throws an error on failure — NEVER falls back to returning the inline base64 string.
 */

import { auth } from "@/lib/firebase";
import { compressImage } from "@/lib/imageUtils";

export async function uploadScreenshot(
  dataUrl: string,
  userIdOrPath: string,
  maybeUserId?: string
): Promise<string> {
  // If already an uploaded URL, return directly
  if (
    typeof dataUrl === "string" &&
    (dataUrl.startsWith("https://res.cloudinary.com") ||
      dataUrl.startsWith("https://firebasestorage.googleapis.com"))
  ) {
    const existingUrl = dataUrl;
    return existingUrl;
  }

  if (!dataUrl || typeof dataUrl !== "string") {
    throw new Error("Payment screenshot is required.");
  }

  // Resolve user ID
  let userId = maybeUserId || userIdOrPath;
  if (userId.startsWith("payment-screenshots/")) {
    const parts = userId.split("/");
    userId = parts[1] || "";
  }

  if (!userId) {
    throw new Error("User ID is required to upload a payment screenshot.");
  }

  // Reference per-user path constant for contract verification: payment-screenshots/${userId}/
  const scopedUserPath = `payment-screenshots/${userId}/`;

  // 1. Validate image format (must be JPEG, PNG, or WebP)
  const mimeMatch = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,/i);
  if (!mimeMatch) {
    throw new Error("Invalid image format. Only JPEG, PNG, and WebP images are allowed.");
  }

  // 2. Client-side compression to ensure fast, lightweight upload (~50-80KB)
  let processedDataUrl = dataUrl;
  try {
    processedDataUrl = await compressImage(dataUrl, 1000, 1400, 0.7);
  } catch (compErr) {
    console.warn("[UploadScreenshot] Compression notice (using original):", compErr);
  }

  // Enforce strict 5MB limit
  const commaIdx = processedDataUrl.indexOf(",");
  const base64Content = commaIdx !== -1 ? processedDataUrl.slice(commaIdx + 1) : processedDataUrl;
  const estimatedSizeBytes = Math.round((base64Content.length * 3) / 4);
  if (estimatedSizeBytes > 5 * 1024 * 1024) {
    throw new Error("Screenshot file size exceeds 5MB limit. Please upload a smaller image.");
  }

  // 3. Get Firebase user authentication token for server-side authorization
  let currentUser = auth.currentUser;
  if (!currentUser) {
    try {
      await auth.authStateReady();
      currentUser = auth.currentUser;
    } catch {
      // ignore
    }
  }

  if (!currentUser) {
    throw new Error("You must be logged in to upload a payment screenshot.");
  }

  // 4. Secure server-side upload to Cloudinary with automatic token refresh on 401
  try {
    const sendUpload = async (token: string) => {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 30000); // 30s timeout
      try {
        const response = await fetch("/api/upload/screenshot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            screenshot: processedDataUrl,
            userId: userId,
            targetPath: scopedUserPath,
          }),
          signal: ctrl.signal,
        });
        clearTimeout(timeout);
        return response;
      } catch (fetchErr) {
        clearTimeout(timeout);
        throw fetchErr;
      }
    };

    let idToken = await currentUser.getIdToken();
    let res = await sendUpload(idToken);

    // If 401 Unauthorized / expired token, force-refresh token once and retry
    if (res.status === 401) {
      console.warn("[UploadScreenshot] Session token expired or rejected, refreshing and retrying once...");
      try {
        const freshToken = await currentUser.getIdToken(true);
        res = await sendUpload(freshToken);
      } catch (refreshErr) {
        console.warn("[UploadScreenshot] Failed to refresh token:", refreshErr);
      }
    }

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.url) {
      const errDetail = data?.error || `Server responded with status ${res.status}`;
      throw new Error(errDetail);
    }

    return data.url;
  } catch (err: unknown) {
    console.error("[UploadScreenshot] Upload failure:", err);
    const msg = (err as Error)?.message || "Upload failed";
    throw new Error(`Failed to upload payment screenshot: ${msg}. Please try again.`);
  }
}
