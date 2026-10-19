import { db, auth } from "../firebase";
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, deleteField, query, where
} from "firebase/firestore";
import { withRetry } from "../withRetry";
import { logger } from "../logger";

// Recursively strip undefined values from an object before sending to Firestore.
// Firestore rejects `undefined` field values in updateDoc/setDoc calls.
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = stripUndefined(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export type CustomRequestStatus = "pending" | "reviewing" | "offer_sent" | "counter_offered" | "negotiating" | "awaiting_final_approval" | "accepted" | "planning" | "building" | "development" | "testing" | "final_review" | "completed" | "delivered" | "in_progress" | "rejected";

export interface TrackingEntry {
  stage: string;
  label: string;
  completedAt?: string;
  notes?: string;
  progressPercent: number;
}

export interface NegotiationOffer {
  id: string;
  price: number;
  message: string;
  sentBy: "admin" | "user";
  createdAt: string;
}

export interface MilestonePayment {
  amount: number;
  utrNumber?: string;
  screenshot?: string;
  status: "pending" | "submitted" | "verified" | "rejected";
  submittedAt?: string;
  verifiedAt?: string;
  /** Referral discount amount applied at the time of payment, in INR */
  discountApplied?: number;
}

export interface CustomRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  projectTitle: string;
  description: string;
  requiredTech?: string; // Optional
  budget: number;
  deadline: string;
  additionalNotes?: string;
  uploadedFiles?: string[]; // Optional mock files
  status: CustomRequestStatus;
  negotiationHistory: NegotiationOffer[];
  trackingHistory: TrackingEntry[];
  advancePayment?: MilestonePayment;
  finalPayment?: MilestonePayment;
  driveUrl?: string;
  demoVideoUrl?: string;
  feedback?: {
    rating: number; // 1 to 5
    comment: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

const COLLECTION_NAME = "custom_requests";

export const getAllCustomRequests = async (): Promise<CustomRequest[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    const requests: CustomRequest[] = [];
    querySnapshot.forEach((doc) => {
      requests.push(doc.data() as CustomRequest);
    });
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn("[CustomRequests] Notice fetching custom requests:", err);
    return [];
  }
};

export const getUserCustomRequests = async (userId: string): Promise<CustomRequest[]> => {
  if (!userId) return [];

  try {
    return await withRetry(
      async () => {
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const requests: CustomRequest[] = [];
        querySnapshot.forEach((docSnap) => {
          requests.push(docSnap.data() as CustomRequest);
        });
        return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
      { label: "Fetch custom requests" }
    );
  } catch (err: any) {
    console.warn("[CustomRequests] Could not fetch custom requests (using empty list):", err?.message || err);
    return [];
  }
};

export const getCustomRequestById = async (id: string): Promise<CustomRequest | null> => {
  try {
    if (!id) return null;
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));
    if (docSnap.exists()) {
      return docSnap.data() as CustomRequest;
    }
    return null;
  } catch (err) {
    console.error("Firebase Error fetching custom request by id:", err);
    return null;
  }
};

export const submitCustomRequest = async (
  requestData: Omit<CustomRequest, "id" | "status" | "negotiationHistory" | "trackingHistory" | "createdAt" | "updatedAt">
): Promise<CustomRequest | null> => {
  try {
    // Ensure the user is authenticated before attempting a write
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("[CustomRequests] No authenticated user — cannot submit.");
      return null;
    }

    // Force-refresh the auth token so Firestore gets a valid, non-expired token
    try {
      await currentUser.getIdToken(/* forceRefresh */ true);
    } catch (tokenErr) {
      console.warn("[CustomRequests] Token refresh warning (proceeding):", tokenErr);
    }

    const now = new Date().toISOString();
    const docRef = doc(collection(db, COLLECTION_NAME));
    const id = docRef.id;

    const newReq: CustomRequest = stripUndefined({
      ...requestData,
      id,
      userId: currentUser.uid,   // Always use the real Firebase UID
      status: "pending" as const,
      negotiationHistory: [],
      trackingHistory: [],
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(docRef, newReq);
    logger.log("[CustomRequests] Successfully submitted request:", id);
    return newReq;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "unknown";
    const msg  = (err as Error)?.message ?? String(err);
    console.error(`[CustomRequests] Error submitting custom request [${code}]: ${msg}`, err);

    // Attach the error message so the caller can surface it
    (submitCustomRequest as { lastError?: string }).lastError = `[${code}] ${msg}`;
    return null;
  }
};

export const updateCustomRequestStatus = async (id: string, newStatus: CustomRequestStatus): Promise<CustomRequest | null> => {
  try {
    if (!id) return null;
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data() as CustomRequest;
    data.status = newStatus;
    data.updatedAt = new Date().toISOString();

    await updateDoc(docRef, stripUndefined({ ...data }));
    return data;
  } catch (err) {
    console.error("Firebase Error updating custom request status:", err);
    return null;
  }
};

export const addNegotiationOffer = async (id: string, offer: Omit<NegotiationOffer, "id" | "createdAt">, newStatus: CustomRequestStatus): Promise<CustomRequest | null> => {
  try {
    if (!id) return null;
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data() as CustomRequest;
    
    const newOffer: NegotiationOffer = {
      ...offer,
      id: `OFFER-${crypto.randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };
    
    data.negotiationHistory = [...(data.negotiationHistory || []), newOffer];
    data.status = newStatus;
    data.updatedAt = new Date().toISOString();

    await updateDoc(docRef, stripUndefined({ ...data }));
    return data;
  } catch (err) {
    console.error("Firebase Error adding negotiation offer:", err);
    return null;
  }
};

export const updateProjectTracking = async (
  id: string,
  stage: string,
  label: string,
  progressPercent: number,
  notes?: string
): Promise<CustomRequest | null> => {
  try {
    if (!id) return null;
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data() as CustomRequest;

    const entry: TrackingEntry = {
      stage,
      label,
      completedAt: new Date().toISOString(),
      progressPercent,
      ...(notes ? { notes } : {}),
    };

    const tracking = [...(data.trackingHistory || [])];
    const existingIdx = tracking.findIndex(t => t.stage === stage);
    if (existingIdx !== -1) {
      tracking[existingIdx] = entry;
    } else {
      tracking.push(entry);
    }

    data.status = stage as CustomRequestStatus;
    data.trackingHistory = tracking;
    data.updatedAt = new Date().toISOString();

    await updateDoc(docRef, stripUndefined({ ...data }));
    return data;
  } catch (err) {
    console.error("Firebase Error updating project tracking:", err);
    return null;
  }
};

/**
 * Updates arbitrary fields on a custom request.
 * The supabaseUpdates parameter has been removed — it was never used.
 */
export const updateCustomRequestFields = async (
  id: string,
  updates: Partial<CustomRequest>
): Promise<CustomRequest | null> => {
  try {
    if (!id) return null;
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data() as CustomRequest;
    const updatedData: CustomRequest = {
      ...data,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, stripUndefined({ ...updatedData }));
    return updatedData;
  } catch (err) {
    console.error("[CustomRequests] Error updating custom request fields:", err);
    return null;
  }
};

export const deleteCustomRequest = async (id: string): Promise<boolean> => {
  try {
    if (!id) return false;
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (err) {
    console.error("[CustomRequests] Firebase error deleting request:", err);
    return false;
  }
};

export const clearAllCustomRequests = async (): Promise<boolean> => {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    return true;
  } catch (err) {
    console.error("[CustomRequests] Firebase error clearing all requests:", err);
    return false;
  }
};
