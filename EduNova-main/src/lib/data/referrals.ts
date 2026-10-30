import { db } from "../firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, writeBatch } from "firebase/firestore";
import { logger } from "../logger";
import { generateId } from "@/lib/idUtils";

export interface Referral {
  id: string;
  referrerId: string;    // The user who shared the code
  referredUserId: string; // The user who signed up using the code
  status: "pending" | "successful";
  projectId?: string;    // The project the referred friend bought
  orderId?: string;      // The order for the 25% payment
  rewardAmount: number;
  rewardUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function createReferral(referrerCode: string, newUserId: string): Promise<boolean> {
  // ── 1. Resolve referrer uid via the public referralCodes index ────────────
  // We never query the users collection by referralCode — that would be denied
  // by the per-uid read rule and would expose user profiles to enumeration.
  const codeRef = doc(db, "referralCodes", referrerCode.toUpperCase());
  const codeSnap = await getDoc(codeRef);
  if (!codeSnap.exists()) return false;

  const referrer = codeSnap.data().uid as string;
  if (!referrer) return false;
  if (referrer === newUserId) return false; // Prevent self-referral

  // ── 2. Check if a referral for this new user already exists ──────────────
  const q2 = query(collection(db, "referrals"), where("referredUserId", "==", newUserId));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) return false;

  const id = generateId("REF");
  const ref: Referral = {
    id,
    referrerId: referrer,
    referredUserId: newUserId,
    status: "pending",
    rewardAmount: 0,
    rewardUsed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "referrals", id), ref);
  return true;
}

export async function unlockReferralReward(referredUserId: string, projectId: string, orderId: string, projectAmount: number) {
  try {
    const q = query(collection(db, "referrals"), where("referredUserId", "==", referredUserId), where("status", "==", "pending"));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const referralSnap = snap.docs[0];
      const referralData = referralSnap.data() as Referral;
      
      // Tier-based reward: ₹50 per ₹1000 for projects ≤₹3000, ₹75 per ₹1000 for projects >₹3000
      const ratePerThousand = projectAmount <= 3000 ? 50 : 75;
      const rewardAmount = Math.floor(projectAmount / 1000) * ratePerThousand;
      
      // Debug validation logs
      logger.log(`[Referral Calc] Project Amount: ₹${projectAmount}`);
      logger.log(`[Referral Calc] Reward Tier: ₹${ratePerThousand}`);
      logger.log(`[Referral Calc] Calculated Reward: ₹${rewardAmount}`);
      
      if (rewardAmount <= 0) return;

      // Unlimited referrals: no cap, credit referrer for every successful referral
      const userRef = doc(db, "users", referralData.referrerId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();

        // Proceed to unlock referral record
        await updateDoc(doc(db, "referrals", referralData.id), {
          status: "successful",
          projectId,
          orderId,
          rewardAmount,
          updatedAt: new Date().toISOString()
        });

        // Accumulate discount without any referral count limit
        const newDiscount = (userData.availableDiscount || 0) + rewardAmount;
        const newCount = (userData.successfulReferralCount || 0) + 1;

        await updateDoc(userRef, { 
          availableDiscount: newDiscount,
          successfulReferralCount: newCount,
          referralCompleted: false, // Keep referral program permanently open
          rewardRedeemed: false
        });

        // Send notification to referrer
        try {
          const { sendNotification } = await import("@/lib/notifications");
          const referredSnap = await getDoc(doc(db, "users", referredUserId));
          const referredName = referredSnap.exists() ? referredSnap.data().name : "A friend";
          
          sendNotification("referral_success", {
            userEmail: userData.email,
            userName: userData.name,
            referredName,
            rewardAmount
          });
        } catch (e) {
          console.error("Failed to send referral notification:", e);
        }
      }
    }
  } catch (error) {
    console.warn("[Referrals] Notice unlocking referral reward:", error);
  }
}

export async function getReferralsByUser(userId: string): Promise<Referral[]> {
  try {
    const q = query(collection(db, "referrals"), where("referrerId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Referral).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err: any) {
    console.warn("[Referrals] Notice fetching user referrals:", err?.code || err?.message || "Unavailable");
    return [];
  }
}

export async function getAllReferrals(): Promise<Referral[]> {
  try {
    const snap = await getDocs(collection(db, "referrals"));
    return snap.docs.map(doc => doc.data() as Referral).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err: any) {
    console.warn("[Referrals] Notice fetching all referrals:", err?.code || err?.message || "Unavailable");
    return [];
  }
}

/**
 * Unlocks the referral code feature for a customer when ANY project order
 * (marketplace catalog purchase or 25% custom project advance) is approved by an admin.
 * Writes users/{uid}.referralUnlocked = true and indexes referralCodes/{code} atomically.
 */
export async function unlockUserReferralCode(userId: string): Promise<string | null> {
  if (!userId) return null;

  // 1. Primary: Server-side Admin SDK API (bypasses client Firestore rule restrictions)
  try {
    const { auth } = await import("../firebase");
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/referrals/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.referralCode) return data.referralCode;
      }
    }
  } catch (apiErr) {
    console.warn("[Referrals] Server API unlock notice:", apiErr);
  }

  // 2. Fallback: Client-side writeBatch
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;

    const userData = userSnap.data();
    const batch = writeBatch(db);

    let code = userData.referralCode;
    const updates: Record<string, unknown> = {
      referralUnlocked: true,
      updatedAt: new Date().toISOString(),
    };

    if (!code) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      updates.referralCode = code;
      batch.set(doc(db, "referralCodes", code), { uid: userId });
    } else {
      batch.set(doc(db, "referralCodes", code), { uid: userId }, { merge: true });
    }

    batch.update(userRef, updates);
    await batch.commit();

    return code;
  } catch (err) {
    console.warn("[Referrals] Notice unlocking user referral code:", err);
    return null;
  }
}
