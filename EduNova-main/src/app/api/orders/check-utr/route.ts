/**
 * POST /api/orders/check-utr
 *
 * UX-only fast path: checks if a UTR is already used BEFORE the user
 * uploads a screenshot, so they get instant feedback.
 *
 * This is NOT the enforcement point — the transaction in /api/orders/create is.
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDb, hasAdminCredentials } from "@/lib/firebaseAdmin";
import { getClientIp } from "@/lib/clientIp";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // ── 0. Rate limiting ────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`check-utr:ip:${ip}`, 30, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many UTR check requests. Please wait a moment." },
      { status: 429 }
    );
  }

  // ── 1. Verify Firebase ID token ─────────────────────────────────────────
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────
  let body: { utrNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const utrNumber = body.utrNumber?.trim();
  if (!utrNumber || !/^[a-zA-Z0-9_\-]{4,50}$/.test(utrNumber)) {
    return NextResponse.json(
      { error: "utrNumber is required and must be 4-50 alphanumeric characters" },
      { status: 400 }
    );
  }

  // ── 3. Check utrIndex ─────────────────────────────────────────────────
  if (!hasAdminCredentials()) {
    return NextResponse.json({ exists: false, skipped: true });
  }

  try {
    const doc = await adminDb.collection("utrIndex").doc(utrNumber).get();
    return NextResponse.json({ exists: doc.exists });
  } catch (err) {
    console.error("[API /orders/check-utr] Error:", err);
    return NextResponse.json({ error: "Failed to check UTR" }, { status: 500 });
  }
}
