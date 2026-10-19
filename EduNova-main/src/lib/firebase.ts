import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Silence internal Firebase SDK background sync retries
setLogLevel("silent");

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

// Initialize Firestore with persistent offline cache.
// initializeFirestore can only be called once — on hot-reload, fall back to getFirestore.
function createFirestore() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
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
