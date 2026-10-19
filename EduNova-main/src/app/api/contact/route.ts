import { NextResponse } from "next/server";
import { sendContactNotificationEmail } from "@/lib/email";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyServerRequest } from "@/lib/serverAuth";
import { isValidEmail } from "@/lib/emailRateLimit";
import { getClientIp } from "@/lib/clientIp";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_BODY_SIZE_CHARS = 20000; // ~20KB safety limit
const COLLECTION_NAME = "contact_messages";

interface ContactMessageRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  projectRef?: string;
  status: "new" | "in_progress" | "resolved";
  createdAt: string;
  reply?: string;
  repliedAt?: string;
  repliedBy?: string;
  replies?: Array<{
    id: string;
    text: string;
    repliedAt: string;
    repliedBy: string;
  }>;
}

// GET /api/contact — Protected: Verified Admin only
export async function GET(request: Request) {
  try {
    const authResult = await verifyServerRequest(request, true);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const filterEmail = searchParams.get("email");

    const queryRef = adminDb.collection(COLLECTION_NAME).orderBy("createdAt", "desc").limit(100);

    const snapshot = await queryRef.get();
    let messages: ContactMessageRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ContactMessageRecord, "id">),
    }));

    if (filterEmail) {
      const cleanEmail = filterEmail.trim().toLowerCase();
      messages = messages.filter((m) => m.email?.trim().toLowerCase() === cleanEmail);
    }

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (err: unknown) {
    const msg = (err as Error)?.message || String(err);
    console.error("[API Contact GET] Error fetching messages:", msg);
    return NextResponse.json({ error: "Failed to fetch contact messages" }, { status: 500 });
  }
}

// POST /api/contact — Public contact submission with validation & rate limiting
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipAllowed = await checkRateLimit(`contact:ip:${ip}`, 5, 60);

    if (!ipAllowed) {
      return NextResponse.json(
        { error: "Too many contact submissions. Please wait a minute before trying again." },
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
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, email, subject, message, phone, projectRef } = body as {
      name?: unknown;
      email?: unknown;
      subject?: unknown;
      message?: unknown;
      phone?: unknown;
      projectRef?: unknown;
    };

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields (name, email, subject, message)" },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const emailAllowed = await checkRateLimit(`contact:email:${cleanEmail}`, 5, 600);
    if (!emailAllowed) {
      return NextResponse.json(
        { error: "Too many submissions from this email. Please try again later." },
        { status: 429 }
      );
    }

    const cleanName = String(name).trim().slice(0, 100);
    const cleanSubject = String(subject).trim().slice(0, 200);
    const cleanMessage = String(message).trim().slice(0, 5000);
    const cleanPhone = phone ? String(phone).trim().slice(0, 30) : "";
    const cleanProjectRef = projectRef ? String(projectRef).trim().slice(0, 100) : "";

    const messageId = `MSG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const createdAt = new Date().toISOString();

    const newMsg = {
      id: messageId,
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      phone: cleanPhone,
      projectRef: cleanProjectRef,
      status: "new",
      createdAt,
    };

    // 1. Persist directly to Firestore
    await adminDb.collection(COLLECTION_NAME).doc(messageId).set(newMsg);

    // 2. Dispatch email notification safely in background
    let emailSent = false;
    try {
      const emailResult = await sendContactNotificationEmail({
        name: newMsg.name,
        email: newMsg.email,
        subject: newMsg.subject,
        message: newMsg.message,
        phone: newMsg.phone,
        projectRef: newMsg.projectRef,
      });
      emailSent = emailResult.success;
    } catch (emailErr) {
      console.warn("[API Contact POST] Email notification dispatch warning:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: newMsg,
      emailSent,
    });
  } catch (err: unknown) {
    const msg = (err as Error)?.message || String(err);
    console.error("[API Contact POST] Error processing contact form:", msg);
    return NextResponse.json(
      { error: "Internal server error processing inquiry" },
      { status: 500 }
    );
  }
}

// PATCH /api/contact — Protected: Verified Admin only
export async function PATCH(request: Request) {
  try {
    const authResult = await verifyServerRequest(request, true);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = (await request.json()) as {
      id?: unknown;
      status?: unknown;
      replyText?: unknown;
      repliedBy?: unknown;
    };
    const { id, status, replyText, repliedBy } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
    }

    const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const msg = docSnap.data() as ContactMessageRecord;
    const updatePayload: Partial<ContactMessageRecord> = {};

    if (replyText && typeof replyText === "string" && replyText.trim().length > 0) {
      const cleanReply = replyText.trim().slice(0, 5000);
      const replyTimestamp = new Date().toISOString();
      const author = repliedBy ? String(repliedBy).slice(0, 100) : "EduNova Support Admin";

      updatePayload.reply = cleanReply;
      updatePayload.repliedAt = replyTimestamp;
      updatePayload.repliedBy = author;
      updatePayload.status = (typeof status === "string" ? status : "resolved") as ContactMessageRecord["status"];

      const replyEntry = {
        id: `RPL-${Date.now().toString(36).toUpperCase()}`,
        text: cleanReply,
        repliedAt: replyTimestamp,
        repliedBy: author,
      };

      updatePayload.replies = Array.isArray(msg.replies)
        ? [...msg.replies, replyEntry]
        : [replyEntry];
    } else if (status && typeof status === "string") {
      updatePayload.status = status as ContactMessageRecord["status"];
    }

    await docRef.update(updatePayload);

    return NextResponse.json({
      success: true,
      message: { ...msg, ...updatePayload },
    });
  } catch (err: unknown) {
    const msg = (err as Error)?.message || String(err);
    console.error("[API Contact PATCH] Error updating message:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/contact?id=... — Protected: Verified Admin only
export async function DELETE(request: Request) {
  try {
    const authResult = await verifyServerRequest(request, true);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("clearAll");

    if (id === "all" || clearAll === "true") {
      const snapshot = await adminDb.collection(COLLECTION_NAME).limit(200).get();
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      return NextResponse.json({ success: true, cleared: true });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    await adminDb.collection(COLLECTION_NAME).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = (err as Error)?.message || String(err);
    console.error("[API Contact DELETE] Error deleting message:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
