/**
 * POST /api/orders/create
 *
 * Server-side order creation with atomic UTR uniqueness enforcement and server-side validation.
 *
 * Flow:
 * 1. Verify the caller's Firebase ID token (never trust client-supplied userId).
 * 2. Validate order fields, amount, and UTR format.
 * 3. Run a Firestore transaction:
 *    - Read utrIndex/{utrNumber} — if exists and same user, return existing order (safe idempotency); if different, abort 409.
 *    - Write utrIndex/{utrNumber} + orders/{newOrderId} atomically.
 * 4. Return the created order with pending status.
 */

import { NextResponse } from "next/server";
import { adminAuth, adminDb, hasAdminCredentials } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { getClientIp } from "@/lib/clientIp";
import { checkRateLimit } from "@/lib/rateLimit";
import { mockProjects } from "@/lib/data/mockProjects";

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

/**
 * Wraps a promise with a hard timeout to ensure no route hangs indefinitely.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms. Please check database connectivity.`)),
        timeoutMs
      )
    ),
  ]);
}

export async function POST(request: Request) {
  const reqStart = Date.now();

  // ── 0. Rate limiting (IP level) ─────────────────────────────────────────
  const ip = getClientIp(request);
  console.info(`[Order API Timing] [0ms] Stage 1: Order creation request received from IP: ${ip}`);

  const ipAllowed = await checkRateLimit(`order-create:ip:${ip}`, 10, 60);
  if (!ipAllowed) {
    console.warn(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 1 FAILED: IP Rate limit exceeded`);
    return NextResponse.json(
      { error: "Too many order creation attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  // ── 1. Verify Firebase ID token ─────────────────────────────────────────
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 2 FAILED: Missing or malformed Bearer token`);
    return NextResponse.json({ error: "Unauthorized — missing token" }, { status: 401 });
  }

  const idToken = authHeader.slice(7).trim();
  let uid: string;
  let userEmail: string;
  let userName: string;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    userEmail = decoded.email || "";
    userName = decoded.name || "Customer";
    console.info(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 2: Firebase auth verified for UID prefix: ${uid.slice(0, 6)}...`);
  } catch (tokenErr: unknown) {
    console.error(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 2 FAILED: Token verification failed:`, (tokenErr as Error)?.message || tokenErr);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const userAllowed = await checkRateLimit(`order-create:uid:${uid}`, 5, 60);
  if (!userAllowed) {
    console.warn(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 2 FAILED: UID rate limit exceeded`);
    return NextResponse.json(
      { error: "Too many order creation attempts for this account. Please wait a moment." },
      { status: 429 }
    );
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

  const isCloudinaryHost = parsedScreenshotUrl.hostname === "res.cloudinary.com";
  const isFirebaseStorageHost = parsedScreenshotUrl.hostname === "firebasestorage.googleapis.com";

  if (
    parsedScreenshotUrl.protocol !== "https:" ||
    (!isCloudinaryHost && parsedScreenshotUrl.hostname !== "firebasestorage.googleapis.com")
  ) {
    return NextResponse.json(
      { error: "Payment screenshot must be an HTTPS URL hosted on Cloudinary or Firebase Storage" },
      { status: 400 }
    );
  }

  const decodedScreenshotPath = decodeURIComponent(parsedScreenshotUrl.pathname);
  const expectedBucket = "edunova-ac27f";
  const expectedCloudName = process.env.CLOUDINARY_CLOUD_NAME || "zxqt8ykg";
  const expectedUserScreenshotPath = `payment-screenshots/${uid}/`;

  const isValidPath =
    (isCloudinaryHost && (decodedScreenshotPath.includes(expectedCloudName) || decodedScreenshotPath.includes("payment-screenshots"))) ||
    (isFirebaseStorageHost && decodedScreenshotPath.includes(expectedBucket));

  if (!isValidPath || !decodedScreenshotPath.includes(expectedUserScreenshotPath)) {
    return NextResponse.json(
      { error: "Payment screenshot does not belong to your user account or authorized storage" },
      { status: 400 }
    );
  }

  // ── 3. Check Firebase Admin Firestore credentials ─────────────────────
  console.info(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 3: Checking Firebase Admin credentials...`);
  if (!hasAdminCredentials()) {
    console.error(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 3 FAILED: Firebase Admin service account is not configured in .env.local.`);
    return NextResponse.json(
      {
        error: "Server configuration error: Firebase Admin credentials are not configured in .env.local. Please set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
        detail: "MISSING_ADMIN_CREDENTIALS",
      },
      { status: 500 }
    );
  }

  // Enrich user info from Firestore users doc if available (guarded by timeout)
  try {
    const userDoc = await withTimeout(
      adminDb.collection("users").doc(uid).get(),
      4000,
      "User profile lookup"
    );
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      if (userData.email) userEmail = userData.email;
      if (userData.name) userName = userData.name;
    }
  } catch (dbErr: unknown) {
    console.warn(`[Order API Timing] [${Date.now() - reqStart}ms] User profile lookup notice (using token claims):`, (dbErr as Error)?.message || dbErr);
  }

  // ── 4. Compute price SERVER-SIDE (ignore client-supplied amount) ────────
  let baseAmount: number;
  let verifiedTitle = String(projectTitle).slice(0, 200);
  let verifiedCategory = String(projectCategory).slice(0, 100);
  let verifiedSeller = String(sellerName).slice(0, 100);
  let isCatalogBuildOrder = false;
  let catalogProjectForCustomReq: Record<string, any> | null = null;
  let targetCustomReqId: string | null = null;

  if (orderType === "marketplace") {
    console.info(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 4: Reading project catalog for projectId: ${projectId}...`);
    try {
      const projSnap = await withTimeout(
        adminDb.collection("projects").doc(projectId).get(),
        6000,
        "Project catalog lookup"
      );
      if (projSnap.exists) {
        const projData = projSnap.data();
        if (typeof projData?.price !== "number" || projData.price <= 0) {
          return NextResponse.json({ error: "Invalid project price in catalog" }, { status: 400 });
        }
        baseAmount = projData.price;
        verifiedTitle = String(projData.title || projectTitle).slice(0, 200);
        verifiedCategory = String(projData.category || projectCategory).slice(0, 100);
        verifiedSeller = String(projData.sellerName || sellerName).slice(0, 100);
      } else {
        const staticProj = mockProjects.find((p) => p.id === projectId);
        if (!staticProj || typeof staticProj.price !== "number" || staticProj.price <= 0) {
          return NextResponse.json({ error: "Project not found" }, { status: 400 });
        }
        baseAmount = staticProj.price;
        verifiedTitle = String(staticProj.title || projectTitle).slice(0, 200);
        verifiedCategory = String(staticProj.category || projectCategory).slice(0, 100);
        verifiedSeller = String(staticProj.sellerName || sellerName).slice(0, 100);

        // Auto-seed to Firestore asynchronously for future queries
        adminDb.collection("projects").doc(projectId).set(staticProj, { merge: true }).catch(() => {});
      }
      console.info(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 4: Project catalog verified (baseAmount: ₹${baseAmount})`);
    } catch (projErr) {
      console.error(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 4 FAILED: Project catalog lookup error:`, projErr);
      return NextResponse.json({ error: (projErr as Error)?.message || "Failed to fetch project catalog" }, { status: 500 });
    }
  } else if (orderType === "advance_payment") {
    // ── Milestone Advance Payment (25%): Can be an existing custom request OR a build-on-order catalog project ──
    const candidateCustomReqId = customRequestId;
    let foundCustomReqDoc = null;

    if (candidateCustomReqId) {
      try {
        const customSnap = await withTimeout(
          adminDb.collection("custom_requests").doc(candidateCustomReqId).get(),
          4000,
          "Custom request lookup"
        );
        if (customSnap.exists) {
          foundCustomReqDoc = customSnap;
        }
      } catch (e) {
        console.warn("[Order API] Notice checking custom request for advance payment:", e);
      }
    }

    if (foundCustomReqDoc) {
      targetCustomReqId = candidateCustomReqId!;
      const reqData = foundCustomReqDoc.data()!;
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
      baseAmount = Math.round(agreedPrice * 0.25);
      verifiedTitle = `Advance (25%): ${reqData.projectTitle || projectTitle}`.slice(0, 200);
      verifiedCategory = "custom_request";
      verifiedSeller = "EduNova Team";
    } else {
      // Build-on-order catalog project: compute 25% price from project catalog
      console.info(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 4: Verifying build-on-order catalog project: ${projectId}...`);
      try {
        const projSnap = await withTimeout(
          adminDb.collection("projects").doc(projectId).get(),
          6000,
          "Project catalog lookup"
        );
        let projData = null;
        if (projSnap.exists) {
          projData = projSnap.data();
        } else {
          const staticProj = mockProjects.find((p) => p.id === projectId);
          if (staticProj) {
            projData = staticProj;
            adminDb.collection("projects").doc(projectId).set(staticProj, { merge: true }).catch(() => {});
          }
        }

        if (!projData || typeof projData.price !== "number" || projData.price <= 0) {
          return NextResponse.json({ error: "Project not found" }, { status: 400 });
        }

        baseAmount = Math.round(projData.price * 0.25);
        verifiedTitle = `Advance (25%): ${projData.title || projectTitle}`.slice(0, 200);
        verifiedCategory = String(projData.category || projectCategory).slice(0, 100);
        verifiedSeller = String(projData.sellerName || sellerName).slice(0, 100);
        isCatalogBuildOrder = true;
        catalogProjectForCustomReq = projData;
      } catch (projErr) {
        console.error(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 4 FAILED: Catalog build lookup error:`, projErr);
        return NextResponse.json({ error: (projErr as Error)?.message || "Failed to fetch project catalog" }, { status: 500 });
      }
    }
  } else if (orderType === "final_payment") {
    targetCustomReqId = customRequestId || projectId;
    if (!targetCustomReqId) {
      return NextResponse.json({ error: "Missing custom request ID for final payment" }, { status: 400 });
    }
    try {
      const customSnap = await withTimeout(
        adminDb.collection("custom_requests").doc(targetCustomReqId).get(),
        6000,
        "Custom request lookup"
      );
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

      baseAmount = Math.round(agreedPrice * 0.75);
      verifiedTitle = `Final (75%): ${reqData.projectTitle || projectTitle}`.slice(0, 200);
      verifiedCategory = "custom_request";
      verifiedSeller = "EduNova Team";
    } catch (customErr) {
      console.error(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 4 FAILED: Custom request lookup error:`, customErr);
      return NextResponse.json({ error: (customErr as Error)?.message || "Failed to fetch custom request" }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
  }

  // Pre-query any unused successful referral record for this user (referrer)
  let referralDocRef = null;
  try {
    const referralQuerySnap = await withTimeout(
      adminDb
        .collection("referrals")
        .where("referrerId", "==", uid)
        .where("status", "==", "successful")
        .where("rewardUsed", "==", false)
        .limit(1)
        .get(),
      4000,
      "Referral discount lookup"
    );
    if (!referralQuerySnap.empty) {
      referralDocRef = referralQuerySnap.docs[0].ref;
    }
  } catch (refErr) {
    console.warn(`[Order API Timing] [${Date.now() - reqStart}ms] Referral check notice:`, refErr);
  }

  // ── 5. Atomic transaction: UTR check + Discount Redemption + Order Creation (with safe Idempotency) ───
  console.info(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 5: Starting atomic Firestore transaction for UTR...`);
  const txStart = Date.now();

  try {
    const invoiceId = `INV-${crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const result = await withTimeout(
      adminDb.runTransaction(async (tx) => {
        // 1. Check utrIndex
        const utrRef = adminDb.collection("utrIndex").doc(trimmedUtr);
        const utrDoc = await tx.get(utrRef);

        if (utrDoc.exists) {
          const existingUtrData = utrDoc.data();
          // Safe Idempotency: If this exact UTR was already recorded for THIS user, return the existing order
          if (existingUtrData?.orderId && existingUtrData?.userId === uid) {
            const existingOrderRef = adminDb.collection("orders").doc(existingUtrData.orderId);
            const existingOrderDoc = await tx.get(existingOrderRef);
            if (existingOrderDoc.exists) {
              console.info(`[Order API Timing] Stage 5: Idempotent duplicate request detected — returning existing order ${existingUtrData.orderId}`);
              return existingOrderDoc.data();
            }
          }

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

        // 5. Pre-allocate order document ID
        const orderRef = adminDb.collection("orders").doc();
        const orderId = orderRef.id;

        let effectiveCustomRequestId = customRequestId;

        // Auto-create custom_requests build tracking record for catalog build orders
        if (isCatalogBuildOrder && catalogProjectForCustomReq) {
          const customReqRef = adminDb.collection("custom_requests").doc();
          effectiveCustomRequestId = customReqRef.id;

          const customReqData = {
            id: effectiveCustomRequestId,
            userId: uid,
            userName,
            userEmail,
            projectTitle: String(catalogProjectForCustomReq.title || projectTitle).slice(0, 200),
            description: String(catalogProjectForCustomReq.description || "").slice(0, 2000),
            budget: catalogProjectForCustomReq.price,
            source: "catalog_order",
            requestType: "catalog_order",
            catalogProjectId: projectId,
            orderId,
            status: "pending",
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            negotiationHistory: [
              {
                id: `OFFER-${crypto.randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase()}`,
                price: catalogProjectForCustomReq.price,
                message: `Catalog Order: "${catalogProjectForCustomReq.title}". 25% Advance payment (₹${finalAmount}) submitted to begin project development.`,
                sentBy: "user",
                createdAt: now,
              }
            ],
            trackingHistory: [
              {
                stage: "planning",
                label: "Order Placed & Advance Under Verification",
                progressPercent: 10,
                notes: "25% advance payment submitted. Waiting for admin approval to commence project development.",
                completedAt: now,
              }
            ],
            advancePayment: {
              amount: finalAmount,
              utrNumber: trimmedUtr,
              screenshot: paymentScreenshot,
              status: "pending",
              submittedAt: now,
            },
            driveUrl: catalogProjectForCustomReq.driveUrl || "",
            demoVideoUrl: catalogProjectForCustomReq.demoVideoUrl || "",
            createdAt: now,
            updatedAt: now,
          };

          tx.set(customReqRef, customReqData);
        } else if (targetCustomReqId) {
          const targetReqRef = adminDb.collection("custom_requests").doc(targetCustomReqId);
          if (orderType === "advance_payment") {
            tx.update(targetReqRef, {
              advancePayment: {
                amount: finalAmount,
                utrNumber: trimmedUtr,
                screenshot: paymentScreenshot,
                status: "pending",
                submittedAt: now,
              },
              updatedAt: now,
            });
          } else if (orderType === "final_payment") {
            tx.update(targetReqRef, {
              finalPayment: {
                amount: finalAmount,
                utrNumber: trimmedUtr,
                screenshot: paymentScreenshot,
                status: "pending",
                discountApplied,
                submittedAt: now,
              },
              updatedAt: now,
            });
          }
        }

        const orderData = {
          id: orderId,
          invoiceId,
          userId: uid,
          userEmail,
          userName,
          orderType,
          ...(effectiveCustomRequestId ? { customRequestId: effectiveCustomRequestId } : {}),
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
          buildStage: orderType === "advance_payment" ? "planning" : null,
          driveUrl: catalogProjectForCustomReq?.driveUrl || "",
          demoVideoUrl: catalogProjectForCustomReq?.demoVideoUrl || "",
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
      }),
      8000,
      "Order creation transaction"
    );

    console.info(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 5: Atomic Firestore transaction completed in ${Date.now() - txStart}ms`);
    console.info(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 6: Order created successfully, response sent (201 Created)`);

    const orderData = result as Record<string, unknown>;
    return NextResponse.json(
      { order: orderData, amount: orderData.amount, discountApplied: orderData.discountApplied },
      { status: 201 }
    );
  } catch (err: unknown) {
    if ((err as { httpStatus?: number })?.httpStatus === 409) {
      console.warn(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 5 Conflict: UTR already used (409)`);
      return NextResponse.json(
        { error: (err as { message: string }).message },
        { status: 409 }
      );
    }

    console.error(`[Order API Timing] [${Date.now() - reqStart}ms] Stage 5 FAILED: Transaction error:`, err);
    const errMessage = (err as Error)?.message || "Failed to create order. Please try again.";
    return NextResponse.json(
      { error: errMessage },
      { status: 500 }
    );
  }
}
