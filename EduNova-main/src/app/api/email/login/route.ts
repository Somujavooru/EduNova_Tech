import { NextResponse } from "next/server";
import { sendLoginAlertEmail } from "@/lib/email";
import { adminAuth } from "@/lib/firebaseAdmin";
import { checkEmailRateLimit, isValidEmail } from "@/lib/emailRateLimit";
import { getClientIp } from "@/lib/clientIp";

export async function POST(request: Request) {
  // ── 1. Parse body ───────────────────────────────────────────────────────
  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, name } = body;

  if (!email || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // ── 2. Rate limiting ────────────────────────────────────────────────────
  const ip = getClientIp(request);

  if (!(await checkEmailRateLimit(ip, email))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // ── 3. Verify Firebase ID token ─────────────────────────────────────────
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idToken = authHeader.slice(7);
  let decodedToken: { email?: string; uid: string };
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // ── 4. Confirm the token's email matches the requested recipient ─────────
  if (decodedToken.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 5. Send the email ───────────────────────────────────────────────────
  try {
    const userAgent = request.headers.get("user-agent") || "Unknown Browser/Device";

    const result = await sendLoginAlertEmail(email, name, ip, userAgent);

    if (result.success) {
      return NextResponse.json({ success: true, message: "Login alert email sent" });
    } else {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error("[Email API] Login alert email error:", (error as Error).message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
