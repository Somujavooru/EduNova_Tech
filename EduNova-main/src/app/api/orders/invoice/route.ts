/**
 * GET /api/orders/invoice
 *
 * Secure server-side endpoint to verify invoice access permissions before downloading.
 *
 * Requirements:
 * 1. Users can download invoices ONLY for their own orders (order.userId === request.auth.uid).
 * 2. Administrators can download invoices for any order.
 * 3. Enforces real order data from Firestore, not fabricated confirmation.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyServerRequest } from "@/lib/serverAuth";

export async function GET(request: Request) {
  // 1. Verify caller authentication
  const authResult = await verifyServerRequest(request, false);
  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { error: authResult.error || "Authentication required to download invoice" },
      { status: authResult.status || 401 }
    );
  }

  const { uid, role } = authResult.user;
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "Missing required orderId parameter" }, { status: 400 });
  }

  try {
    const orderDoc = await adminDb.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderDoc.data();
    if (!orderData) {
      return NextResponse.json({ error: "Order data unavailable" }, { status: 404 });
    }

    // 2. Strict role-based authorization check:
    // Only the order owner or a verified administrator can access the invoice
    const isOwner = orderData.userId === uid;
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You are only authorized to download invoices for your own orders." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: orderDoc.id,
        ...orderData,
      },
    });
  } catch (err: unknown) {
    console.error("[OrdersInvoiceAPI] Error fetching invoice:", err);
    return NextResponse.json({ error: "Failed to verify invoice access" }, { status: 500 });
  }
}
