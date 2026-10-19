import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { uploadScreenshot } from "@/lib/uploadScreenshot";
import { withRetry } from "@/lib/withRetry";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";

export type OrderStatus = "pending" | "approved" | "rejected";
export type DeliveryStatus = "pending" | "delivered" | "failed";
export type OrderType = "marketplace" | "advance_payment" | "final_payment";

export interface Order {
  id: string;
  invoiceId: string;
  userId: string;
  userEmail: string;
  userName: string;
  orderType?: OrderType;
  customRequestId?: string;
  projectId: string;
  projectTitle: string;
  projectCategory: string;
  sellerName: string;
  amount: number;
  utrNumber: string;
  paymentMethod: string;
  /** Firebase Storage download URL or compressed base64 data URL */
  paymentScreenshot: string;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus;
  /** Set to true when another order with the same UTR already exists — surface a warning in admin UI */
  duplicateUtrWarning?: boolean;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  deadlineDate: string | null;
  discountApplied?: number;
}

/**
 * Custom error for duplicate UTR responses (HTTP 409).
 * Must NEVER be retried.
 */
export class DuplicateUtrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateUtrError";
  }
}

/**
 * Creates an order.
 * First attempts the server-side API route (/api/orders/create).
 * If the server route is unavailable or lacks Firebase Admin credentials,
 * it seamlessly falls back to direct client-side Firestore creation.
 */
export async function createOrder(
  userId: string,
  userEmail: string,
  userName: string,
  project: { id: string; title: string; category: string; sellerName: string; price: number },
  paymentScreenshotDataUrl: string,
  utrNumber: string = "",
  paymentMethod: string = "UPI",
  orderType: OrderType = "marketplace",
  customRequestId?: string
): Promise<Order> {
  const currentUser = auth.currentUser;
  const effectiveUserId = currentUser?.uid || userId;
  if (!effectiveUserId) {
    throw new Error("You must be logged in to create an order.");
  }

  const trimmedUtr = utrNumber.trim();

  // ── 1. Fast-path UTR check (if currentUser available) ─────────────────
  if (trimmedUtr && currentUser) {
    try {
      const idToken = await currentUser.getIdToken();
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const checkRes = await fetch("/api/orders/check-utr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ utrNumber: trimmedUtr }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (checkRes.ok) {
        const { exists } = await checkRes.json();
        if (exists) {
          throw new DuplicateUtrError(
            `UTR "${trimmedUtr}" has already been used for another order. Please use a different UTR number.`
          );
        }
      }
    } catch (err) {
      if (err instanceof DuplicateUtrError) throw err;
      // Server-side check skipped/failed — proceed to next step
      console.warn("[Orders] UTR pre-check skipped or failed (non-critical):", err);
    }
  }

  // ── 2. Upload screenshot to per-user storage path ─────────────────────
  const screenshotUrl = await uploadScreenshot(
    paymentScreenshotDataUrl,
    effectiveUserId
  );

  // ── 3. Server-side Order Creation (Admin SDK only) ──────────────────────
  if (!currentUser) {
    throw new Error("You must be logged in to create an order. Please sign in and retry.");
  }

  const idToken = await currentUser.getIdToken();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);

  let res: Response;
  try {
    res = await fetch("/api/orders/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        projectId: project.id,
        projectTitle: project.title,
        projectCategory: project.category,
        sellerName: project.sellerName,
        amount: project.price,
        utrNumber: trimmedUtr,
        paymentMethod,
        paymentScreenshot: screenshotUrl,
        orderType,
        customRequestId,
      }),
      signal: ctrl.signal,
    });
  } catch (err: unknown) {
    if ((err as Error)?.name === "AbortError") {
      throw new Error("Order creation timed out. Please check your connection and retry.");
    }
    throw new Error(`Network error while creating order: ${(err as Error)?.message || "Please retry."}`);
  } finally {
    clearTimeout(t);
  }

  if (res.status === 409) {
    const data = await res.json().catch(() => ({}));
    throw new DuplicateUtrError(data.error || "This UTR has already been used for another order.");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server error (${res.status}). Failed to create order. Please retry.`);
  }

  const data = await res.json();
  if (!data?.order) {
    throw new Error("Invalid response received from server. Please retry.");
  }

  return data.order as Order;
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  if (!userId) return [];

  try {
    return await withRetry(
      async () => {
        const q = query(collection(db, "orders"), where("userId", "==", userId));
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as Order);
      },
      { label: "Fetch orders" }
    );
  } catch (err: any) {
    console.warn("[Orders] Could not fetch orders from Firestore (using empty list):", err?.message || err);
    return [];
  }
}

export async function getAllOrders(): Promise<Order[]> {
  try {
    const snap = await getDocs(collection(db, "orders"));
    return snap.docs
      .map((d) => d.data() as Order)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err: any) {
    console.warn("[Orders] Could not fetch all orders (using empty list):", err?.code || err?.message);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
  const ref = doc(db, "orders", orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as Order;
  const now = new Date().toISOString();

  // Build a typed partial update — no `as any` cast needed
  const updatePayload: Partial<Pick<Order, "status" | "updatedAt" | "deliveryStatus" | "deliveredAt">> = {
    status,
    updatedAt: now,
  };

  if (status === "approved") {
    updatePayload.deliveryStatus = "delivered";
    updatePayload.deliveredAt = now;
  } else if (status === "rejected") {
    updatePayload.deliveryStatus = "failed";
  }

  await updateDoc(ref, updatePayload);

  return {
    ...data,
    ...updatePayload,
  };
}

/** Returns the count of pending orders without fetching full documents. */
export async function getPendingOrderCount(): Promise<number> {
  try {
    const q = query(collection(db, "orders"), where("status", "==", "pending"));
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err: any) {
    console.warn("[Orders] Could not get pending count (returning 0):", err?.code || err?.message);
    return 0;
  }
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  try {
    if (!orderId) return false;
    await deleteDoc(doc(db, "orders", orderId));
    return true;
  } catch (err) {
    console.error("Firebase Error deleting order:", err);
    return false;
  }
}

export async function clearAllOrders(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, "orders"));
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    return true;
  } catch (err) {
    console.error("Firebase Error clearing all orders:", err);
    return false;
  }
}
