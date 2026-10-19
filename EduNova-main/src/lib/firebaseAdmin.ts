/**
 * Firebase Admin SDK — lazy singleton initializer for server-side use only.
 *
 * Requires ONE of:
 *   - FIREBASE_SERVICE_ACCOUNT_JSON env var: the full service account JSON as a string.
 *   - OR the three individual vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
 *
 * Add these to .env.local (never commit them). Get the service account JSON from:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key.
 *
 * NOTE: Initialization is lazy — the admin app is only created when first
 * accessed via getAdminAuth() / getAdminDb(). This prevents build-time crashes
 * when credentials are not available (e.g., during `next build`).
 */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let _adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;

function createAdminApp(): App {
  // Prevent re-initialization on hot reload
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return initializeApp({ credential: cert(serviceAccount) });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[FirebaseAdmin] Missing service account credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON " +
        "or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in .env.local"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

function ensureApp(): App {
  if (!_adminApp) {
    _adminApp = createAdminApp();
  }
  return _adminApp;
}

/** Lazily initialized Firebase Admin Auth instance. */
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    if (!_adminAuth) _adminAuth = getAuth(ensureApp());
    return Reflect.get(_adminAuth, prop, receiver);
  },
});

/** Lazily initialized Firebase Admin Firestore instance. */
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    if (!_adminDb) _adminDb = getFirestore(ensureApp());
    return Reflect.get(_adminDb, prop, receiver);
  },
});

// Keep backward-compatible named export
export const adminApp = new Proxy({} as App, {
  get(_target, prop, receiver) {
    return Reflect.get(ensureApp(), prop, receiver);
  },
});
