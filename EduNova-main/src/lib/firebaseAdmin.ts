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

function parsePrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined;
  let key = rawKey.trim();
  // Strip outer quotes if present
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  // Convert escaped newlines to real newlines
  key = key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  return key;
}

function createAdminApp(): App {
  // Prevent re-initialization on hot reload
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Format 1: Full JSON string in FIREBASE_SERVICE_ACCOUNT_JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      const serviceAccount = JSON.parse(rawJson);
      console.info("[FirebaseAdmin] Initializing with FIREBASE_SERVICE_ACCOUNT_JSON");
      return initializeApp({ credential: cert(serviceAccount) });
    } catch (e) {
      console.warn("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
    }
  }

  // Format 2: Path to JSON file in FIREBASE_SERVICE_ACCOUNT_PATH
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path");
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_PATH.trim().replace(/^['"]|['"]$/g, "");
      const resolved = path.isAbsolute(raw) ? raw : path.resolve(/*turbopackIgnore: true*/ process.cwd(), raw);
      const targetPath = fs.existsSync(resolved) ? resolved : (fs.existsSync(raw) ? raw : null);
      if (targetPath) {
        const fileContent = fs.readFileSync(targetPath, "utf-8");
        const serviceAccount = JSON.parse(fileContent);
        console.info(`[FirebaseAdmin] Initializing with service account file from ${targetPath}`);
        return initializeApp({ credential: cert(serviceAccount) });
      } else {
        console.warn(`[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT_PATH specified but file not found: ${raw}`);
      }
    } catch (e) {
      console.warn("[FirebaseAdmin] Failed to load FIREBASE_SERVICE_ACCOUNT_PATH:", e);
    }
  }

  // Format 3: Individual environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || "edunova-ac27f";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (clientEmail && privateKey) {
    console.info(`[FirebaseAdmin] Initializing with clientEmail: ${clientEmail}`);
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  // Graceful fallback: Firebase Admin Auth verifies ID tokens against Google's public certificates
  // using projectId alone, without requiring private service account keys on the Spark plan.
  return initializeApp({
    projectId,
  });
}

export function hasAdminCredentials(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return true;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path");
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_PATH.trim().replace(/^['"]|['"]$/g, "");
      const resolved = path.isAbsolute(raw) ? raw : path.resolve(/*turbopackIgnore: true*/ process.cwd(), raw);
      return fs.existsSync(resolved) || fs.existsSync(raw);
    } catch {
      return false;
    }
  }
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) return true;
  return false;
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
