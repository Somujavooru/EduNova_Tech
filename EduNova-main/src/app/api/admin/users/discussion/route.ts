import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyServerRequest } from "@/lib/serverAuth";

const COLLECTION_NAME = "contact_messages";

export async function GET(request: Request) {
  try {
    const authResult = await verifyServerRequest(request, true);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error || "Admin access required" }, { status: authResult.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Missing required email parameter" }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where("email", "==", targetEmail)
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort chronologically ascending
    messages.sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error("[API Admin User Discussion GET] Error:", err?.message || err);
    return NextResponse.json({ error: "Failed to fetch discussion messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyServerRequest(request, true);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "Admin access required" }, { status: authResult.status || 401 });
    }

    const body = await request.json();
    const { email, name, message, subject, phone } = body;

    if (!email || !message) {
      return NextResponse.json({ error: "Email and message are required" }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name || "User").trim();
    const cleanMessage = String(message).trim().slice(0, 5000);
    const cleanSubject = String(subject || "Support Discussion").trim().slice(0, 200);
    const cleanPhone = phone ? String(phone).trim() : "";
    const adminAuthor = authResult.user.name || "EduNova Support Admin";
    const nowIso = new Date().toISOString();

    // Check if there is an existing message document for this user to append a reply
    const existingSnap = await adminDb
      .collection(COLLECTION_NAME)
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();

    let savedMsg: any;

    if (!existingSnap.empty) {
      const docRef = existingSnap.docs[0].ref;
      const data = existingSnap.docs[0].data();
      const existingReplies = Array.isArray(data.replies) ? data.replies : [];
      
      const newReply = {
        id: `RPL-${Date.now().toString(36).toUpperCase()}`,
        text: cleanMessage,
        repliedAt: nowIso,
        repliedBy: adminAuthor,
      };

      const updatedPayload = {
        reply: cleanMessage,
        repliedAt: nowIso,
        repliedBy: adminAuthor,
        status: "resolved",
        replies: [...existingReplies, newReply],
        lastActivityAt: nowIso,
      };

      await docRef.update(updatedPayload);
      savedMsg = { id: docRef.id, ...data, ...updatedPayload };
    } else {
      const messageId = `MSG-ADMIN-${Date.now().toString(36).toUpperCase()}`;
      const newDoc = {
        id: messageId,
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        phone: cleanPhone,
        status: "resolved",
        reply: cleanMessage,
        repliedAt: nowIso,
        repliedBy: adminAuthor,
        replies: [
          {
            id: `RPL-${Date.now().toString(36).toUpperCase()}`,
            text: cleanMessage,
            repliedAt: nowIso,
            repliedBy: adminAuthor,
          }
        ],
        createdAt: nowIso,
        lastActivityAt: nowIso,
      };

      await adminDb.collection(COLLECTION_NAME).doc(messageId).set(newDoc);
      savedMsg = newDoc;
    }

    return NextResponse.json({ success: true, message: savedMsg });
  } catch (err: any) {
    console.error("[API Admin User Discussion POST] Error:", err?.message || err);
    return NextResponse.json({ error: "Failed to send message to user" }, { status: 500 });
  }
}
