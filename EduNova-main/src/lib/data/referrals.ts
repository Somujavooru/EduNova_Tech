import { db } from "../firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where } from "firebase/firestore";
import { logger } from "../logger";

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

  // ── 3. Create the referral doc ───────────────────────────────────────────
  const id = `REF-${crypto.randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase()}`;
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

      // Check referrer's limits before applying reward
      const userRef = doc(db, "users", referralData.referrerId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        if (userData.referralCompleted) {
          logger.log("Referrer already completed max allowed referrals. Reward skipped.");
          return;
        }

        if (userData.rewardRedeemed) {
          logger.log("Referrer already redeemed their reward. Cannot re-unlock. Skipped.");
          return;
        }

        // Proceed to unlock
        await updateDoc(doc(db, "referrals", referralData.id), {
          status: "successful",
          projectId,
          orderId,
          rewardAmount,
          updatedAt: new Date().toISOString()
        });

        const newDiscount = (userData.availableDiscount || 0) + rewardAmount;
        const newCount = (userData.successfulReferralCount || 0) + 1;
        const maxAllowed = userData.maxReferralAllowed || 1;
        const isCompleted = newCount >= maxAllowed;

        await updateDoc(userRef, { 
          availableDiscount: newDiscount,
          successfulReferralCount: newCount,
          referralCompleted: isCompleted
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
