/**
 * GET /api/admin/payments/screenshot
 *
 * Secure server-side image delivery route for admin payment verification.
 *
 * Security & Design:
 * 1. Strictly requires authenticated administrator session (via Authorization header or ?token= query param).
 * 2. Authenticated Cloudinary assets are fetched server-side using Cloudinary API credentials.
 * 3. Never exposes Cloudinary API secret to the browser or makes payment screenshots public.
 * 4. Resolves legacy/placeholder paths (e.g. screenshot.jpg) to the actual uploaded Cloudinary asset for the order.
 * 5. Streams the binary image bytes directly with strict security headers (no-sniff, private cache).
 * 6. Handles expired/invalid URLs gracefully and returns a clean SVG badge if unavailable.
 */

import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyServerRequest } from "@/lib/serverAuth";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

function createPlaceholderSvg(message: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
    <rect width="600" height="400" fill="#0f172a" rx="16"/>
    <rect x="2" y="2" width="596" height="396" stroke="#334155" stroke-width="2" stroke-dasharray="6 6" rx="14"/>
    <circle cx="300" cy="170" r="36" fill="#1e293b"/>
    <path d="M288 160l8 10 16-18 12 16h-44z" fill="#94a3b8"/>
    <circle cx="292" cy="150" r="4" fill="#94a3b8"/>
    <text x="300" y="240" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#f1f5f9" text-anchor="middle">Payment Proof Unavailable</text>
    <text x="300" y="265" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">${message}</text>
  </svg>`;
}

export async function GET(request: Request) {
  // ── 1. Enforce strict administrator authorization ─────────────────────────
  const authResult = await verifyServerRequest(request, true);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error || "Forbidden — administrator privileges required" },
      { status: authResult.status }
    );
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const rawUrl = url.searchParams.get("url");
  const format = url.searchParams.get("format");

  if (!orderId && !rawUrl) {
    return NextResponse.json({ error: "Missing required parameter: orderId or url" }, { status: 400 });
  }

  try {
    let screenshotUrl = rawUrl || "";
    let userId = "";
    let orderCreatedAt = "";

    // ── 2. Retrieve order data from Firestore if orderId provided ────────────
    if (orderId) {
      const orderDoc = await adminDb.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        return new NextResponse(createPlaceholderSvg("Order document not found"), {
          status: 404,
          headers: { "Content-Type": "image/svg+xml" },
        });
      }
      const orderData = orderDoc.data();
      screenshotUrl = orderData?.paymentScreenshot || "";
      userId = orderData?.userId || "";
      orderCreatedAt = orderData?.createdAt || "";
    }

    // ── 3. Handle inline base64 data URLs directly ───────────────────────────
    if (screenshotUrl.startsWith("data:image/")) {
      const match = screenshotUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary credentials not configured on server" },
        { status: 500 }
      );
    }

    // ── 4. Resolve public_id from Cloudinary URL or user storage path ───────
    let publicId = "";
    if (screenshotUrl.startsWith("http")) {
      try {
        const parsed = new URL(screenshotUrl);
        const match = parsed.pathname.match(
          /(?:upload|authenticated)(?:\/[^/]+)?(?:\/v\d+)?\/(.+?)(?:\.[a-zA-Z0-9]+)?$/
        );
        if (match) {
          publicId = match[1];
        }
      } catch {
        // Fallback
      }
    } else {
      publicId = screenshotUrl;
    }

    // If public_id is missing, or is a generic placeholder like "screenshot" / "screenshot.jpg",
    // locate the actual uploaded authenticated asset in the user's folder
    const isGenericPlaceholder =
      !publicId ||
      publicId.endsWith("/screenshot") ||
      publicId === "screenshot" ||
      publicId.endsWith(".jpg");

    if (isGenericPlaceholder && userId) {
      try {
        const prefix = `payment-screenshots/${userId}`;
        const searchRes = await cloudinary.api.resources({
          type: "authenticated",
          prefix,
          max_results: 15,
        });

        if (searchRes.resources && searchRes.resources.length > 0) {
          // Find asset created closest to order.createdAt, or use the latest
          let bestAsset = searchRes.resources[0];
          if (orderCreatedAt) {
            const orderTime = new Date(orderCreatedAt).getTime();
            let minDiff = Infinity;
            for (const r of searchRes.resources) {
              const rTime = new Date(r.created_at).getTime();
              const diff = Math.abs(rTime - orderTime);
              if (diff < minDiff) {
                minDiff = diff;
                bestAsset = r;
              }
            }
          }
          publicId = bestAsset.public_id;

          // Repair the order document in Firestore with the verified signed URL
          if (orderId) {
            const healedSignedUrl = cloudinary.utils.url(publicId, {
              type: "authenticated",
              sign_url: true,
              secure: true,
            });
            adminDb.collection("orders").doc(orderId).update({
              paymentScreenshot: healedSignedUrl,
            }).catch(() => {});
          }
        }
      } catch (searchErr) {
        console.warn("[AdminScreenshot] Could not search user assets:", searchErr);
      }
    }

    if (!publicId) {
      return new NextResponse(createPlaceholderSvg("No payment proof uploaded for this order"), {
        status: 404,
        headers: { "Content-Type": "image/svg+xml" },
      });
    }

    // ── 5. Generate authenticated delivery URL with fresh server signature ────
    const signedUrl = cloudinary.utils.url(publicId, {
      type: "authenticated",
      sign_url: true,
      secure: true,
    });

    if (format === "json") {
      return NextResponse.json({ success: true, url: signedUrl });
    }

    // ── 6. Stream image bytes securely to client ─────────────────────────────
    const fetchResponse = await fetch(signedUrl);
    if (!fetchResponse.ok) {
      // If direct fetch fails with 404/401, return clean SVG error
      console.warn(`[AdminScreenshot] Cloudinary fetch returned ${fetchResponse.status} for ${publicId}`);
      return new NextResponse(createPlaceholderSvg("Image asset not found or access expired"), {
        status: 404,
        headers: { "Content-Type": "image/svg+xml" },
      });
    }

    const contentType = fetchResponse.headers.get("content-type") || "image/jpeg";
    const imageArrayBuffer = await fetchResponse.arrayBuffer();

    return new NextResponse(imageArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("[AdminScreenshot] Error delivering payment screenshot:", err);
    return new NextResponse(createPlaceholderSvg("Server error while retrieving payment proof"), {
      status: 500,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
