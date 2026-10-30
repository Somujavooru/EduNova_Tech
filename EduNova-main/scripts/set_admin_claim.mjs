/**
 * CLI script to grant Firebase Auth custom claims (`admin: true`) and update Firestore role.
 *
 * Dedicated strictly and exclusively for Vijay: vijayrk0513@gmail.com
 *
 * Usage:
 *   node scripts/set_admin_claim.mjs vijayrk0513@gmail.com
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const REQUIRED_TARGET_EMAIL = "vijayrk0513@gmail.com";
const REQUIRED_TARGET_UID = "V5YRvg0cjla4j1VBP68NzHDOfB23";

const emailArg = process.argv[2]?.trim().toLowerCase();

// ── Strict Pre-Execution Guard: Reject any email other than vijayrk0513@gmail.com ──
if (!emailArg) {
  console.error("Error: Please provide the target email address.");
  console.error(`Usage: node scripts/set_admin_claim.mjs ${REQUIRED_TARGET_EMAIL}`);
  process.exit(1);
}

if (emailArg !== REQUIRED_TARGET_EMAIL) {
  console.error("\n=======================================================");
  console.error("SECURITY VIOLATION: INVALID TARGET EMAIL");
  console.error(`This promotion script is strictly restricted to: ${REQUIRED_TARGET_EMAIL}`);
  console.error(`Provided email: '${emailArg}' is not permitted.`);
  console.error("ABORTING IMMEDIATELY. NO FIREBASE CHANGES MADE.");
  console.error("=======================================================\n");
  process.exit(1);
}

// Initialize Admin SDK with credentials from environment or serviceAccountKey.json
let app;
if (!getApps().length) {
  const serviceAccountPath = path.join(PROJECT_ROOT, "serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    app = initializeApp({ credential: cert(serviceAccount) });
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "edunova-ac27f",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    app = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "edunova-ac27f",
    });
  }
}

const auth = getAuth(app);
const db = getFirestore(app);

async function setAdminClaim() {
  console.log(`Looking up user for email: ${emailArg}...`);
  try {
    const user = await auth.getUserByEmail(emailArg);
    console.log(`Found user: ${user.uid} (${user.email})`);

    // Strict UID verification guard
    if (user.uid !== REQUIRED_TARGET_UID) {
      console.error("\n=======================================================");
      console.error("SECURITY VIOLATION: UID MISMATCH");
      console.error(`Expected UID: ${REQUIRED_TARGET_UID}`);
      console.error(`Resolved UID: ${user.uid}`);
      console.error("ABORTING IMMEDIATELY. NO FIREBASE CHANGES MADE.");
      console.error("=======================================================\n");
      process.exit(1);
    }
    console.log(`✓ Safety check passed: Email and UID strictly match Vijay (${REQUIRED_TARGET_UID}).`);

    // 1. Preserve existing custom claims and add admin: true without deleting other claims
    const existingClaims = user.customClaims || {};
    const updatedClaims = {
      ...existingClaims,
      admin: true,
    };
    await auth.setCustomUserClaims(user.uid, updatedClaims);
    console.log(`✓ Custom claims updated safely: ${JSON.stringify(updatedClaims)}`);

    // 2. Update ONLY the required admin fields in Firestore users/{uid} with merge: true
    const now = new Date().toISOString();
    await db.collection("users").doc(user.uid).set(
      {
        id: user.uid,
        email: user.email,
        name: user.displayName || "Vijay",
        role: "admin",
        updatedAt: now,
      },
      { merge: true }
    );
    console.log(`✓ Firestore users/${user.uid} document updated with role: "admin" (only required admin fields merged).`);

    console.log("\nSuccess! Vijay is now an administrator.");
    console.log("NOTE: If the user is currently logged in, they must refresh their token");
    console.log("(e.g., re-login or call auth.currentUser.getIdToken(true)) to receive the new claim.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to set admin claim:", err.message || err);
    process.exit(1);
  }
}

setAdminClaim();
