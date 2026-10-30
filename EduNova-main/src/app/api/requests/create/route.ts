import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendContactNotificationEmail } from "@/lib/email";
import { isValidEmail } from "@/lib/emailRateLimit";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/clientIp";

const MAX_BODY_SIZE_CHARS = 25000;
const COLLECTION_NAME = "custom_requests";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // Rate limit: maximum 10 submissions per IP per 10 minutes
    const ipAllowed = await checkRateLimit(`requests:ip:${clientIp}`, 10, 600);
    if (!ipAllowed) {
      return NextResponse.json(
        { error: "Too many requests submitted from this IP. Please wait a few minutes." },
        { status: 429 }
      );
    }

    let bodyText: string;
    try {
      bodyText = await request.text();
    } catch {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    if (bodyText.length > MAX_BODY_SIZE_CHARS) {
      return NextResponse.json({ error: "Request payload too large" }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    const {
      name,
      userName,
      email,
      userEmail,
      phone,
      userPhone,
      projectTitle,
      description,
      requiredTech,
      budget,
      deadline,
      additionalNotes,
      service,
      userId,
    } = body as Record<string, unknown>;

    const finalName = String(name || userName || "").trim().slice(0, 100);
    const finalEmail = String(email || userEmail || "").trim().toLowerCase().slice(0, 120);
    const finalPhone = String(phone || userPhone || "").trim().slice(0, 30);
    const finalTitle = String(projectTitle || (service === "ecommerce" ? "Custom E-Commerce Storefront" : service === "automation" ? "Custom Automation Solution" : "Custom Project Request")).trim().slice(0, 150);
    const finalDesc = String(description || "").trim().slice(0, 5000);
    const finalTech = requiredTech ? String(requiredTech).trim().slice(0, 300) : "";
    const finalBudget = typeof budget === "number" ? budget : Number(budget) || 999;
    const finalDeadline = deadline ? String(deadline).trim().slice(0, 50) : "";
    const finalNotes = additionalNotes ? String(additionalNotes).trim().slice(0, 1000) : "";

    // Validation
    if (!finalName) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!finalEmail || !isValidEmail(finalEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!finalPhone) {
      return NextResponse.json({ error: "Please enter your phone / WhatsApp number so we can reach you." }, { status: 400 });
    }
    if (!finalDesc) {
      return NextResponse.json({ error: "Please describe your project requirements." }, { status: 400 });
    }

    const emailAllowed = await checkRateLimit(`requests:email:${finalEmail}`, 6, 600);
    if (!emailAllowed) {
      return NextResponse.json(
        { error: "Too many submissions from this email. Please try again shortly." },
        { status: 429 }
      );
    }

    const requestId = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    const resolvedUserId = userId ? String(userId) : `guest_${Date.now().toString(36)}`;

    const newRequest = {
      id: requestId,
      userId: resolvedUserId,
      userName: finalName,
      userEmail: finalEmail,
      userPhone: finalPhone,
      projectTitle: finalTitle,
      description: finalDesc,
      requiredTech: finalTech,
      budget: finalBudget,
      deadline: finalDeadline,
      additionalNotes: finalNotes,
      status: "pending",
      source: "custom",
      negotiationHistory: [],
      trackingHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    // Store in Firestore via Admin SDK
    await adminDb.collection(COLLECTION_NAME).doc(requestId).set(newRequest);

    // Send admin email notification in background
    try {
      await sendContactNotificationEmail({
        name: finalName,
        email: finalEmail,
        phone: finalPhone,
        subject: `[New Request] ${finalTitle} (₹${finalBudget})`,
        message: `New Custom/Service Request:\n\nTitle: ${finalTitle}\nClient: ${finalName}\nEmail: ${finalEmail}\nPhone/WhatsApp: ${finalPhone}\nBudget: ₹${finalBudget}\nDeadline: ${finalDeadline || "Flexible"}\nTech Stack: ${finalTech || "Open"}\n\nRequirements:\n${finalDesc}`,
        projectRef: requestId,
      });
    } catch (emailErr) {
      console.warn("[API Requests Create] Email notification dispatch error:", emailErr);
    }

    return NextResponse.json({
      success: true,
      request: newRequest,
      message: "Custom request submitted successfully.",
    });
  } catch (err: unknown) {
    console.error("[API Requests Create] Server error:", err);
    return NextResponse.json(
      { error: "Internal server error while submitting request. Please try again." },
      { status: 500 }
    );
  }
}
