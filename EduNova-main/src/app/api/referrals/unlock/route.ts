import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyServerRequest } from "@/lib/serverAuth";

export async function POST(req: Request) {
  try {
    const authResult = await verifyServerRequest(req);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const caller = authResult.user;
    const body = await req.json().catch(() => ({}));
    const targetUserId = (caller.role === "admin" && body.targetUserId) ? body.targetUserId : caller.uid;

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    // If non-admin is requesting for themselves, verify they have at least one approved order or verified 25% custom advance
    if (caller.role !== "admin") {
      let isEligible = false;

      // 1. Check orders collection
      const ordersSnap = await adminDb
        .collection("orders")
        .where("userId", "==", targetUserId)
        .where("status", "==", "approved")
        .limit(1)
        .get();

      if (!ordersSnap.empty) {
        isEligible = true;
      }

      // 2. Check custom_requests collection for verified advance / active stage
      if (!isEligible) {
        const reqsSnap = await adminDb
          .collection("custom_requests")
          .where("userId", "==", targetUserId)
          .get();

        for (const doc of reqsSnap.docs) {
          const data = doc.data();
          if (
            data.advancePayment?.status === "verified" ||
            data.finalPayment?.status === "verified" ||
            ["planning", "building", "development", "testing", "final_review", "completed", "delivered"].includes(data.status)
          ) {
            isEligible = true;
            break;
          }
        }
      }

      if (!isEligible) {
        return NextResponse.json(
          { error: "Referral unlock requires at least one verified project order or 25% custom project payment." },
          { status: 403 }
        );
      }
    }

    // Fetch user record
    const userRef = adminDb.collection("users").doc(targetUserId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data() || {};
    let code = userData.referralCode;

    if (!code) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    const batch = adminDb.batch();
    batch.update(userRef, {
      referralUnlocked: true,
      referralCode: code,
      updatedAt: new Date().toISOString(),
    });

    const codeRef = adminDb.collection("referralCodes").doc(code);
    batch.set(codeRef, { uid: targetUserId, updatedAt: new Date().toISOString() }, { merge: true });

    await batch.commit();

    return NextResponse.json({
      success: true,
      referralUnlocked: true,
      referralCode: code,
    });
  } catch (err: unknown) {
    console.error("[Referral Unlock API] Error:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to unlock referral code" },
      { status: 500 }
    );
  }
}
