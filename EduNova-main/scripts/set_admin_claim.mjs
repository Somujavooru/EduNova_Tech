/**
 * CLI script to grant Firebase Auth custom claims (`admin: true`) and update Firestore role.
 *
 * Usage:
 *   node scripts/set_admin_claim.mjs <email>
 *
 * Example:
 *   node scripts/set_admin_claim.mjs admin@example.com
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

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Error: Please provide an email address.");
  console.error("Usage: node scripts/set_admin_claim.mjs <email>");
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
    // Attempt default application credentials
    app = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "edunova-ac27f",
    });
  }
}

const auth = getAuth(app);
const db = getFirestore(app);

async function setAdminClaim() {
  console.log(`Looking up user for email: ${email}...`);
  try {
    const user = await auth.getUserByEmail(email);
    console.log(`Found user: ${user.uid} (${user.email})`);

    // 1. Set Firebase custom claims
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`✓ Custom claim { admin: true } set successfully on Auth user.`);

    // 2. Set Firestore role
    await db.collection("users").doc(user.uid).set(
      {
        role: "admin",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`✓ Firestore users/${user.uid} document updated with role: "admin".`);

    console.log("\nSuccess! The user is now an administrator.");
    console.log("NOTE: If the user is currently logged in, they must refresh their token");
    console.log("(e.g., re-login or call auth.currentUser.getIdToken(true)) to receive the new claim.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to set admin claim:", err.message || err);
    process.exit(1);
  }
}

setAdminClaim();
