import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore, memoryLocalCache, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Silence internal Firebase SDK background sync retries
setLogLevel("silent");

// Automatically purge orphaned Firebase multi-tab sync keys from window.localStorage.
// Firebase's persistentMultipleTabManager writes thousands of 'firestore_clients_...' and
// 'firestore_targets_...' keys into window.localStorage which quickly exhausts the browser's 5MB quota,
// throwing QuotaExceededError and triggering "FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)".
if (typeof window !== "undefined") {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("firestore_") ||
          key.startsWith("firestore-") ||
          key.startsWith("edunova_comment_likes_") ||
          key === "edunova_notifications" ||
          key === "edunova_free_access" ||
          key === "edunova_contact_messages")
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn("[Firebase] Could not clean stale localStorage keys:", err);
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyBiPnl7VECQk7osFaCdd8nDiaypTZdxnKc",
  authDomain: "edunova-ac27f.firebaseapp.com",
  projectId: "edunova-ac27f",
  storageBucket: "edunova-ac27f.firebasestorage.app",
  messagingSenderId: "216541098741",
  appId: "1:216541098741:web:5fc7450d71277c63c4cbbc",
  measurementId: "G-CEFSD0NCLX"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with memory cache.
// Using memoryLocalCache avoids all browser localStorage quota limits, cross-tab lock deadlocks,
// and internal assertion crashes while fully supporting real-time listeners and offline fallback.
function createFirestore() {
  try {
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = createFirestore();
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

// Force the account chooser popup every time
googleProvider.setCustomParameters({
  prompt: "select_account",
});
