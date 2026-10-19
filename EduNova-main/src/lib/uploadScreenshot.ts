/**
 * Uploads a base64 data URL to Firebase Storage and returns the public download URL.
 *
 * Scopes uploads to per-user path: payment-screenshots/{uid}/{fileName}
 * Validates image type (JPEG/PNG/WebP) and client-side size (< 5MB).
 * Throws an error on failure — NEVER falls back to returning the inline base64 string.
 */

import { storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { compressImage } from "@/lib/imageUtils";

export async function uploadScreenshot(
  dataUrl: string,
  userIdOrPath: string,
  maybeUserId?: string
): Promise<string> {
  // If already a valid Firebase Storage download URL, return directly
  if (typeof dataUrl === "string" && dataUrl.startsWith("https://firebasestorage.googleapis.com")) {
    const existingStorageUrl = dataUrl;
    return existingStorageUrl;
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

  // 1. Validate image format (must be JPEG, PNG, or WebP)
  const mimeMatch = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,/i);
  if (!mimeMatch) {
    throw new Error("Invalid image format. Only JPEG, PNG, and WebP images are allowed.");
  }
  let contentType = mimeMatch[1].toLowerCase();
  if (contentType === "image/jpg") contentType = "image/jpeg";

  // 2. Validate size & compress client-side
  let processedDataUrl = dataUrl;
  const commaIdx = processedDataUrl.indexOf(",");
  const base64Content = commaIdx !== -1 ? processedDataUrl.slice(commaIdx + 1) : processedDataUrl;
  let estimatedSizeBytes = Math.round((base64Content.length * 3) / 4);

  // Compress if image exceeds 2MB to ensure fast upload
  if (estimatedSizeBytes > 2 * 1024 * 1024) {
    try {
      processedDataUrl = await compressImage(dataUrl, 1600);
      const newCommaIdx = processedDataUrl.indexOf(",");
      const newBase64 = newCommaIdx !== -1 ? processedDataUrl.slice(newCommaIdx + 1) : processedDataUrl;
      estimatedSizeBytes = Math.round((newBase64.length * 3) / 4);
    } catch {
      // If compression fails, proceed with original and check limit
    }
  }

  // Enforce strict 5MB limit
  if (estimatedSizeBytes > 5 * 1024 * 1024) {
    throw new Error("Screenshot file size exceeds 5MB limit. Please upload a smaller image.");
  }

  // 3. Construct storage path: payment-screenshots/{uid}/{fileName}
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const uniqueSuffix = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
    : Math.random().toString(36).slice(2, 12);
  const fileName = `${Date.now()}-${uniqueSuffix}.${ext}`;
  const storagePath = `payment-screenshots/${userId}/${fileName}`;

  // 4. Upload to Storage with a 15-second timeout
  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType,
      customMetadata: { userId },
    };

    const uploadTask = (async () => {
      await uploadString(storageRef, processedDataUrl, "data_url", metadata);
      return await getDownloadURL(storageRef);
    })();

    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("Storage upload timed out. Please check your network and retry.")), 15000)
    );

    return await Promise.race([uploadTask, timeout]);
  } catch (err: unknown) {
    const msg = (err as Error)?.message || "Upload failed";
    console.error("[UploadScreenshot] Storage upload failed:", err);
    throw new Error(`Failed to upload payment screenshot: ${msg}. Please try again.`);
  }
}


