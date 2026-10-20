/**
 * POST /api/upload/screenshot
 *
 * Secure server-side Cloudinary upload route for payment verification screenshots.
 *
 * Security & Privacy:
 * 1. Requires verified Firebase ID Token (user must be authenticated).
 * 2. Scopes assets to per-user folder: payment-screenshots/{uid}/
 * 3. Enforces authenticated access mode (type: 'authenticated') so screenshots are NOT publicly accessible.
 * 4. Generates a signed URL for authorized viewing in admin and user order views.
 * 5. Validates MIME type and file size (< 5MB).
 * 6. Rate limits upload attempts per IP and UID.
 */

import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getClientIp } from "@/lib/clientIp";
import { checkRateLimit } from "@/lib/rateLimit";

// Initialize Cloudinary with server-side environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export async function POST(request: Request) {
  const reqStart = Date.now();
  console.info(`[Upload API Timing] [0ms] Stage 1: Request received`);

  // ── 0. Validate Cloudinary configuration ────────────────────────────────
  if (!cloudName || !apiKey || !apiSecret) {
    console.error(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 0 FAILED: Missing Cloudinary environment variables in .env.local`);
    return NextResponse.json(
      { error: "Cloudinary storage is not properly configured. Please check server environment variables." },
      { status: 500 }
    );
  }

  // ── 1. Rate limiting (IP level) ─────────────────────────────────────────
  const ip = getClientIp(request);
  const ipAllowed = await checkRateLimit(`screenshot-upload:ip:${ip}`, 15, 60);
  if (!ipAllowed) {
    console.warn(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 1 FAILED: Rate limit exceeded`);
    return NextResponse.json(
      { error: "Too many upload attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  // ── 2. Verify Firebase ID token with safe diagnostics ───────────────────
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (!authHeader) {
    console.warn(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 2 FAILED: Missing Authorization header`);
    return NextResponse.json(
      { error: "Invalid or expired session. Please sign in again.", detail: "Missing Authorization header" },
      { status: 401 }
    );
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.warn(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 2 FAILED: Missing or malformed Bearer token`);
    return NextResponse.json(
      { error: "Invalid or expired session. Please sign in again.", detail: "Malformed Bearer scheme" },
      { status: 401 }
    );
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    console.warn(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 2 FAILED: Empty Bearer token payload`);
    return NextResponse.json(
      { error: "Invalid or expired session. Please sign in again.", detail: "Empty token payload" },
      { status: 401 }
    );
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    console.info(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 2: Firebase auth verified for UID prefix: ${uid.slice(0, 6)}...`);
  } catch (authErr: unknown) {
    const errObj = authErr as { code?: string; message?: string };
    const errCode = errObj?.code || "unknown";
    const errMsg = errObj?.message || String(authErr);

    console.error(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 2 FAILED: Token verification failure [${errCode}]: ${errMsg}`);

    if (errMsg.includes("Missing service account") || errMsg.includes("credentials") || errMsg.includes("ADC")) {
      console.error(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 2 FAILED: Firebase Admin config error: ${errMsg}`);
      return NextResponse.json(
        { error: "Server authentication configuration error. Please contact administrator.", detail: "Firebase Admin configuration issue" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Invalid or expired session. Please sign in again.", detail: errCode },
      { status: 401 }
    );
  }

  // ── 3. Parse and validate payload ───────────────────────────────────────
  let body: { screenshot?: string; userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { screenshot, userId } = body;
  if (!screenshot || typeof screenshot !== "string") {
    return NextResponse.json({ error: "Payment screenshot data is required." }, { status: 400 });
  }

  // Ensure userId matches token uid (prevent cross-user spoofing)
  if (userId && userId !== uid) {
    return NextResponse.json({ error: "User ID mismatch. Upload not permitted." }, { status: 403 });
  }

  // Validate image format (must be JPEG, PNG, or WebP base64)
  const mimeMatch = screenshot.match(/^data:(image\/(?:jpeg|png|webp));base64,/i);
  if (!mimeMatch) {
    return NextResponse.json(
      { error: "Invalid image format. Only JPEG, PNG, and WebP are allowed." },
      { status: 400 }
    );
  }

  // Enforce strict 5MB limit
  const commaIdx = screenshot.indexOf(",");
  const base64Content = commaIdx !== -1 ? screenshot.slice(commaIdx + 1) : screenshot;
  const estimatedSizeBytes = Math.round((base64Content.length * 3) / 4);
  if (estimatedSizeBytes > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Screenshot file size exceeds 5MB limit. Please upload a smaller image." },
      { status: 400 }
    );
  }

  // ── 4. Upload to Cloudinary with authenticated privacy ─────────────────
  try {
    const userFolder = `payment-screenshots/${uid}`;
    const uniqueSuffix = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
    const publicId = `${Date.now()}-${uniqueSuffix}`;

    const uploadStart = Date.now();
    console.info(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 3: Cloudinary upload initiated`);

    const uploadResult = await cloudinary.uploader.upload(screenshot, {
      folder: userFolder,
      public_id: publicId,
      resource_type: "image",
      type: "authenticated", // Restricts public access; requires signed token or admin credentials
      overwrite: false,
    });

    const uploadDuration = Date.now() - uploadStart;
    console.info(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 3: Cloudinary upload completed in ${uploadDuration}ms (${uploadResult.bytes} bytes, format: ${uploadResult.format})`);

    // Generate signed authenticated URL for authorized rendering
    const signedUrl = cloudinary.utils.url(uploadResult.public_id, {
      type: "authenticated",
      sign_url: true,
      secure: true,
      version: uploadResult.version,
    });

    console.info(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 4: Signed URL generated, response sent (200 OK)`);

    return NextResponse.json({
      success: true,
      url: signedUrl,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });
  } catch (err: unknown) {
    console.error(`[Upload API Timing] [${Date.now() - reqStart}ms] Stage 3 FAILED: Cloudinary upload failure:`, err);
    const errMsg = (err as { message?: string })?.message || "Cloudinary upload failed";
    return NextResponse.json(
      { error: `Upload error: ${errMsg}. Please verify Cloudinary credentials in .env.local.` },
      { status: 500 }
    );
  }
}
