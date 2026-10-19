/**
 * POST /api/orders/create
 *
 * Server-side order creation with atomic UTR uniqueness enforcement and server-side validation.
 *
 * Flow:
 * 1. Verify the caller's Firebase ID token (never trust client-supplied userId).
 * 2. Validate order fields, amount, and UTR format.
 * 3. Run a Firestore transaction:
 *    - Read utrIndex/{utrNumber} — if exists, abort 409.
 *    - Write utrIndex/{utrNumber} + orders/{newOrderId} atomically.
 * 4. Return the created order with pending status.
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { getClientIp } from "@/lib/clientIp";
import { checkRateLimit } from "@/lib/rateLimit";

interface CreateOrderBody {
  projectId: string;
  projectTitle: string;
  projectCategory?: string;
  sellerName?: string;
  amount?: number;
  utrNumber: string;
  paymentMethod: string;
  paymentScreenshot: string;
  orderType?: "marketplace" | "advance_payment" | "final_payment";
  customRequestId?: string;
}

export async function POST(request: Request) {
  // ── 0. Rate limiting (IP level) ─────────────────────────────────────────
  const ip = getClientIp(request);
  const ipAllowed = await checkRateLimit(`order-create:ip:${ip}`, 10, 60);
  if (!ipAllowed) {
    return NextResponse.json(
      { error: "Too many order creation attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  // ── 1. Verify Firebase ID token ─────────────────────────────────────────
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized — missing token" }, { status: 401 });
  }

  const idToken = authHeader.slice(7);
  let uid: string;
  let userEmail: string;
  let userName: string;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;

    const userAllowed = await checkRateLimit(`order-create:uid:${uid}`, 5, 60);
    if (!userAllowed) {
      return NextResponse.json(
        { error: "Too many order creation attempts for this account. Please wait a moment." },
        { status: 429 }
      );
    }
    // Get user profile from Firestore for name/email
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    userEmail = userData.email || decoded.email || "";
    userName = userData.name || decoded.name || "Unknown";
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // ── 2. Parse and validate body ──────────────────────────────────────────
  let body: CreateOrderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    projectId,
    projectTitle,
    projectCategory = "general",
    sellerName = "EduNova",
    utrNumber,
    paymentMethod = "UPI",
    paymentScreenshot,
    orderType = "marketplace",
    customRequestId,
  } = body;

  if (!projectId || !projectTitle || !utrNumber?.trim() || !paymentScreenshot) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const trimmedUtr = utrNumber.trim();
  if (!/^[a-zA-Z0-9_\-]{4,50}$/.test(trimmedUtr)) {
    return NextResponse.json(
      { error: "Invalid UTR format. UTR should be 4-50 alphanumeric characters." },
      { status: 400 }
    );
  }

  // ── Validate paymentScreenshot URL security ───────────────────────────
  let parsedScreenshotUrl: URL;
  try {
    parsedScreenshotUrl = new URL(paymentScreenshot);
  } catch {
    return NextResponse.json(
      { error: "Invalid payment screenshot URL. Must be an HTTPS URL." },
      { status: 400 }
    );
  }

  if (
    parsedScreenshotUrl.protocol !== "https:" ||
    parsedScreenshotUrl.hostname !== "firebasestorage.googleapis.com"
  ) {
    return NextResponse.json(
      { error: "Payment screenshot must be an HTTPS URL hosted on firebasestorage.googleapis.com" },
      { status: 400 }
    );
  }

  const decodedScreenshotPath = decodeURIComponent(parsedScreenshotUrl.pathname);
  const expectedBucket = "edunova-ac27f";
  const expectedUserScreenshotPath = `payment-screenshots/${uid}/`;

  if (
    !decodedScreenshotPath.includes(expectedBucket) ||
    !decodedScreenshotPath.includes(expectedUserScreenshotPath)
  ) {
    return NextResponse.json(
      { error: "Payment screenshot does not belong to your user account or this project storage bucket" },
      { status: 400 }
    );
  }

  // ── 3. Compute price SERVER-SIDE (ignore client-supplied amount) ────────
  let baseAmount: number;
  let verifiedTitle = String(projectTitle).slice(0, 200);
  let verifiedCategory = String(projectCategory).slice(0, 100);
  let verifiedSeller = String(sellerName).slice(0, 100);

  if (orderType === "marketplace") {
    const projSnap = await adminDb.collection("projects").doc(projectId).get();
    if (!projSnap.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 400 });
    }
    const projData = projSnap.data();
    if (typeof projData?.price !== "number" || projData.price <= 0) {
      return NextResponse.json({ error: "Invalid project price in catalog" }, { status: 400 });
    }
    baseAmount = projData.price;
    verifiedTitle = String(projData.title || projectTitle).slice(0, 200);
    verifiedCategory = String(projData.category || projectCategory).slice(0, 100);
    verifiedSeller = String(projData.sellerName || sellerName).slice(0, 100);
  } else if (orderType === "advance_payment" || orderType === "final_payment") {
    const targetCustomReqId = customRequestId || projectId;
    if (!targetCustomReqId) {
      return NextResponse.json({ error: "Missing custom request ID for custom order" }, { status: 400 });
    }
    const customSnap = await adminDb.collection("custom_requests").doc(targetCustomReqId).get();
    if (!customSnap.exists) {
      return NextResponse.json({ error: "Custom request not found" }, { status: 400 });
    }
    const reqData = customSnap.data()!;
    if (reqData.userId !== uid) {
      return NextResponse.json(
        { error: "Unauthorized access to custom request" },
        { status: 403 }
      );
    }
    const latestOffer = reqData.negotiationHistory?.[reqData.negotiationHistory.length - 1];
    const agreedPrice = Number(latestOffer ? latestOffer.price : reqData.budget);
    if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
      return NextResponse.json({ error: "Invalid price on custom request" }, { status: 400 });
    }

    if (orderType === "advance_payment") {
      baseAmount = Math.round(agreedPrice * 0.25);
      verifiedTitle = `Advance (25%): ${reqData.projectTitle || projectTitle}`.slice(0, 200);
    } else {
      baseAmount = Math.round(agreedPrice * 0.75);
      verifiedTitle = `Final (75%): ${reqData.projectTitle || projectTitle}`.slice(0, 200);
    }
    verifiedCategory = "custom_request";
    verifiedSeller = "EduNova Team";
  } else {
    return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
  }

  // Pre-query any unused successful referral record for this user (referrer)
  const referralQuerySnap = await adminDb
    .collection("referrals")
    .where("referrerId", "==", uid)
    .where("status", "==", "successful")
    .where("rewardUsed", "==", false)
    .limit(1)
    .get();

  const referralDocRef = !referralQuerySnap.empty ? referralQuerySnap.docs[0].ref : null;

  // ── 4. Atomic transaction: UTR check + Discount Redemption + Order Creation
  try {
    const invoiceId = `INV-${crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const result = await adminDb.runTransaction(async (tx) => {
      // 1. Check utrIndex
      const utrRef = adminDb.collection("utrIndex").doc(trimmedUtr);
      const utrDoc = await tx.get(utrRef);

      if (utrDoc.exists) {
        throw {
          httpStatus: 409,
          message: `UTR "${trimmedUtr}" has already been used for another order. Please check your transaction details or use a different UTR number.`,
        };
      }

      // 2. Read users/{uid} inside transaction for atomic discount validation
      const userRef = adminDb.collection("users").doc(uid);
      const txUserDoc = await tx.get(userRef);
      const txUserData = txUserDoc.exists ? txUserDoc.data() : null;

      // 3. Read referral doc if exists
      const txReferralDoc = referralDocRef ? await tx.get(referralDocRef) : null;

      // 4. Calculate discount atomically
      const availableDiscount =
        typeof txUserData?.availableDiscount === "number" && txUserData.availableDiscount > 0
          ? txUserData.availableDiscount
          : 0;
      const isRewardRedeemed = txUserData?.rewardRedeemed === true;

      const discountApplied =
        !isRewardRedeemed && availableDiscount > 0
          ? Math.min(availableDiscount, baseAmount)
          : 0;

      const finalAmount = Math.max(0, baseAmount - discountApplied);

      // 5. Create the order document
      const orderRef = adminDb.collection("orders").doc();
      const orderId = orderRef.id;

      const orderData = {
        id: orderId,
        invoiceId,
        userId: uid,
        userEmail,
        userName,
        orderType,
        ...(customRequestId ? { customRequestId } : {}),
        projectId,
        projectTitle: verifiedTitle,
        projectCategory: verifiedCategory,
        sellerName: verifiedSeller,
        amount: finalAmount,
        discountApplied,
        utrNumber: trimmedUtr,
        paymentMethod: String(paymentMethod).slice(0, 50),
        paymentScreenshot,
        status: "pending",
        deliveryStatus: "pending",
        duplicateUtrWarning: false,
        createdAt: now,
        updatedAt: now,
        deliveredAt: null,
        deadlineDate: null,
      };

      // 6. Write UTR index and order atomically
      tx.set(utrRef, {
        orderId,
        userId: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(orderRef, orderData);

      // 7. Atomically redeem discount if applied
      if (discountApplied > 0) {
        tx.update(userRef, {
          availableDiscount: 0,
          rewardRedeemed: true,
          rewardRedeemedAt: now,
          updatedAt: now,
        });

        if (txReferralDoc && txReferralDoc.exists) {
          tx.update(referralDocRef!, {
            rewardUsed: true,
            updatedAt: now,
          });
        }
      }

      return orderData;
    });

    return NextResponse.json(
      { order: result, amount: result.amount, discountApplied: result.discountApplied },
      { status: 201 }
    );
  } catch (err: unknown) {
    if ((err as { httpStatus?: number })?.httpStatus === 409) {
      return NextResponse.json(
        { error: (err as { message: string }).message },
        { status: 409 }
      );
    }

    console.error("[API /orders/create] Transaction error:", err);
    return NextResponse.json(
      { error: "Failed to create order. Please try again." },
      { status: 500 }
    );
  }
}
