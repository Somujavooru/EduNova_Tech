import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/orders/status?query=...
 *
 * Public-safe order status lookup endpoint for the AI Assistant.
 * Accepts:
 *   - Order Document ID (e.g., "ORD-123456" or Firestore ID)
 *   - Invoice ID (e.g., "INV-2026-001")
 *   - 12-digit UTR Number
 *
 * Returns non-sensitive public order status and milestone progress.
 */
function normalizeCode(str: string): string {
  return str
    .toUpperCase()
    .replace(/^(INV-|ORD-)/, "")
    .replace(/[\s\-_]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("query")?.trim();

  if (!rawQuery) {
    return NextResponse.json({ success: false, error: "Missing query parameter" }, { status: 400 });
  }

  try {
    const ordersCol = adminDb.collection("orders");
    const cleanId = rawQuery.replace(/^(INV-|ORD-)/i, "").trim();

    // 1. Direct document ID lookups (exact raw or stripped)
    let matchedDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    const directDoc = await ordersCol.doc(rawQuery).get();
    if (directDoc.exists) {
      matchedDoc = directDoc;
    } else if (cleanId && cleanId !== rawQuery) {
      const cleanDoc = await ordersCol.doc(cleanId).get();
      if (cleanDoc.exists) {
        matchedDoc = cleanDoc;
      }
    }

    // 2. Query by invoiceId or utrNumber (exact)
    if (!matchedDoc) {
      const snapInvoice = await ordersCol.where("invoiceId", "==", rawQuery).limit(1).get();
      if (!snapInvoice.empty) {
        matchedDoc = snapInvoice.docs[0];
      }
    }

    if (!matchedDoc && cleanId) {
      const snapInvoiceClean = await ordersCol.where("invoiceId", "==", `INV-${cleanId}`).limit(1).get();
      if (!snapInvoiceClean.empty) {
        matchedDoc = snapInvoiceClean.docs[0];
      }
    }

    if (!matchedDoc) {
      const snapUtr = await ordersCol.where("utrNumber", "==", rawQuery).limit(1).get();
      if (!snapUtr.empty) {
        matchedDoc = snapUtr.docs[0];
      }
    }

    // 3. Fallback Smart Fuzzy Search (handles O vs 0, lowercase, prefix, and invoiceId variations)
    if (!matchedDoc) {
      const normTarget = normalizeCode(rawQuery);
      const allOrdersSnap = await ordersCol.limit(200).get();

      for (const doc of allOrdersSnap.docs) {
        const d = doc.data();
        const docIdNorm = normalizeCode(doc.id);
        const invIdNorm = normalizeCode(d.invoiceId || "");
        const utrNorm = String(d.utrNumber || "").trim();

        // Exact normalized match on ID or Invoice ID (e.g. O replaced with 0)
        if (docIdNorm === normTarget || (invIdNorm && invIdNorm === normTarget)) {
          matchedDoc = doc;
          break;
        }

        // Check if query starts with or is contained in docId / invoiceId if query length >= 6
        if (normTarget.length >= 6) {
          if (docIdNorm.startsWith(normTarget) || normTarget.startsWith(docIdNorm)) {
            matchedDoc = doc;
            break;
          }
          if (invIdNorm && (invIdNorm.startsWith(normTarget) || normTarget.startsWith(invIdNorm))) {
            matchedDoc = doc;
            break;
          }
        }

        // Clean UTR comparison
        if (rawQuery.replace(/\D/g, "") && utrNorm && rawQuery.replace(/\D/g, "") === utrNorm.replace(/\D/g, "")) {
          matchedDoc = doc;
          break;
        }
      }
    }

    if (matchedDoc && matchedDoc.exists) {
      const data = matchedDoc.data();
      if (data) {
        return NextResponse.json({
          success: true,
          found: true,
          order: formatOrderResponse(matchedDoc.id, data),
        });
      }
    }

    return NextResponse.json({ success: true, found: false });
  } catch (err: any) {
    console.error("[Orders Status API] Error searching order:", err);
    return NextResponse.json({ success: false, found: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

function formatOrderResponse(id: string, data: any) {
  return {
    id,
    invoiceId: data.invoiceId || id,
    projectTitle: data.projectTitle || "Custom Engineering Project",
    projectCategory: data.projectCategory || "Engineering",
    status: data.status || "pending",
    deliveryStatus: data.deliveryStatus || "pending",
    buildStage: data.buildStage || (data.status === "approved" ? "delivered" : "planning"),
    orderType: data.orderType || "marketplace",
    amount: data.amount || 0,
    createdAt: data.createdAt,
    deliveredAt: data.deliveredAt || null,
  };
}
