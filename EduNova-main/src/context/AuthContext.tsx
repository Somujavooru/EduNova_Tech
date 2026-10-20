"use client";

import { createContext, useContext, useState, useRef, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, googleProvider } from "@/lib/firebase";
import { 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { sendNotification } from "@/lib/notifications";

const isDev = process.env.NODE_ENV !== "production";
const devLog = (...args: unknown[]) => { if (isDev) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (isDev) console.warn(...args); };

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  profilePicture?: string | null;
  phoneNumber?: string | null;
  provider?: string;
  lastLogin?: string;
  referralCode?: string;
  referredBy?: string | null;
  availableDiscount?: number;
  createdAt?: string;
  referralUnlocked?: boolean;
  referralCompleted?: boolean;
  successfulReferralCount?: number;
  maxReferralAllowed?: number;
  rewardRedeemed?: boolean;
  rewardRedeemedAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, password?: string) => Promise<string | null>;
  googleLogin: () => Promise<string | null>;
  signup: (name: string, email: string, password?: string, phoneNumber?: string) => Promise<string | null>;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  resendVerification: (email: string, password?: string) => Promise<string | null>;
  showWelcome: boolean;
  dismissWelcome: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = [
  "somashekharjavooru@gmail.com",
  "vijayrk0513@gmail.com",
  "somashekhar@edunova.com",
  "vijay@edunova.com",
  "admin@edunova.com",
];

const checkIsAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const router = useRouter();
  const googleLoginInProgress = useRef(false);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      devLog("[Auth] onAuthStateChanged fired. User:", firebaseUser?.uid || "null");
      
      // Clear previous listener if auth state changes
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (firebaseUser) {
        const isUserAdmin = checkIsAdmin(firebaseUser.email);
        const isGoogle = firebaseUser.providerData[0]?.providerId === "google.com";
        const isVerified = firebaseUser.emailVerified || isUserAdmin || isGoogle;

        if (!isVerified) {
          devLog("[Auth] User email not verified, holding back session.");
          setUser(null);
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);
        setLoading(true);
        setAuthError(null);

        // REALTIME LISTENER: Any change in Firestore role immediately reflects here
        unsubSnapshot = onSnapshot(
          userRef,
          (docSnap) => {
            const now = new Date().toISOString();
            const provider = firebaseUser.providerData[0]?.providerId === "google.com" ? "google" : "email";

            if (docSnap.exists()) {
              const data = docSnap.data() as User;
              const role = isUserAdmin || checkIsAdmin(data.email) || data.role === "admin" ? "admin" : "user";
              setUser({ ...data, id: firebaseUser.uid, role });
              setLoading(false);
            } else {
              devLog("[Auth] User document missing. Creating new user document...");
              
              const storedReferredBy = typeof window !== "undefined" ? sessionStorage.getItem("edunova_ref") : null;
              const newUser: User & { createdAt: string } = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "EduNova User"),
                email: firebaseUser.email!,
                role: isUserAdmin ? "admin" : "user",
                profilePicture: firebaseUser.photoURL || null,
                phoneNumber: firebaseUser.phoneNumber || null,
                provider,
                lastLogin: now,
                createdAt: now,
                referredBy: storedReferredBy || null,
                availableDiscount: 0,
                referralUnlocked: false,
                referralCompleted: false,
                successfulReferralCount: 0,
                maxReferralAllowed: 1,
              };
              
              setDoc(userRef, newUser)
                .then(() => {
                  if (storedReferredBy) {
                    import("@/lib/data/referrals").then(({ createReferral }) =>
                      createReferral(storedReferredBy, firebaseUser.uid)
                    );
                  }
                  devLog("[Auth] New user document created successfully.");
                  setShowWelcome(true);
                  sendNotification("login", { userName: newUser.name, userEmail: newUser.email });
                })
                .catch((err) => {
                  console.warn("[Auth] Notice creating user document (proceeding with session):", err?.message || err);
                  setUser(newUser);
                  setLoading(false);
                });
            }
          },
          (error) => {
            console.warn("[Auth] Realtime listener notice (using session fallback):", error?.message || error);

            if (unsubSnapshot) {
              unsubSnapshot();
              unsubSnapshot = null;
            }

            const fallbackUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "EduNova User"),
              email: firebaseUser.email || "",
              role: isUserAdmin ? "admin" : "user",
              profilePicture: firebaseUser.photoURL || null,
              provider: firebaseUser.providerData[0]?.providerId === "google.com" ? "google" : "email",
              lastLogin: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              referredBy: null,
              availableDiscount: 0,
              referralUnlocked: false,
              referralCompleted: false,
              successfulReferralCount: 0,
              maxReferralAllowed: 1,
            };

            setUser(fallbackUser);
            setAuthError(null);
            setLoading(false);
          }
        );
      } else {
        devLog("[Auth] User logged out.");
        setUser(null);
        setAuthError(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  // Handle return from signInWithRedirect (fallback when popup is blocked)
  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        router.push("/dashboard");
      }
    }).catch(() => { /* redirect result errors are non-critical */ });
  }, [router]);

  const dismissWelcome = () => setShowWelcome(false);
  const clearAuthError = () => setAuthError(null);

  const triggerEmailEvent = async (type: "login" | "welcome", email: string, name: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();
      fetch(`/api/email/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email, name }),
      }).catch((error) => devWarn(`[Auth] Failed to trigger ${type} email:`, error));
    } catch {
      // Non-critical — email notifications failing should not affect auth flow
    }
  };

  const login = async (email: string, password?: string): Promise<string | null> => {
    try {
      if (!password) return "Password is required.";
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const isUserAdmin = checkIsAdmin(email);
      const isGoogle = userCredential.user.providerData[0]?.providerId === "google.com";
      const isVerified = userCredential.user.emailVerified || isUserAdmin || isGoogle;

      if (!isVerified) {
        await signOut(auth);
        setUser(null);
        return "EMAIL_NOT_VERIFIED";
      }

      triggerEmailEvent("login", email, userCredential.user.displayName || email.split("@")[0]);
      
      const userRef = doc(db, "users", userCredential.user.uid);
      setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true }).catch(() => {});
      
      return null;
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        return "Invalid email or password. If you signed up with Google, please use the Google button below.";
      }
      if (code === "auth/too-many-requests") return "Too many failed attempts. Please try again later.";
      if (code === "auth/user-disabled") return "This account has been disabled. Contact support.";
      if (code === "auth/invalid-email") return "Please enter a valid email address.";
      return (error as Error).message || "Login failed. Please try again.";
    }
  };

  const googleLogin = async (): Promise<string | null> => {
    if (googleLoginInProgress.current) return null;
    googleLoginInProgress.current = true;

    return new Promise((resolve) => {
      signInWithPopup(auth, googleProvider)
        .then((result) => {
          const additionalInfo = getAdditionalUserInfo(result);
          const email = result.user.email || "";
          const name = result.user.displayName || "User";
          
          if (additionalInfo?.isNewUser) {
            triggerEmailEvent("welcome", email, name);
          } else {
            triggerEmailEvent("login", email, name);
          }

          const userRef = doc(db, "users", result.user.uid);
          setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true }).catch(() => {});

          resolve(null);
        })
        .catch(async (error: unknown) => {
          const code = (error as { code?: string })?.code || "";
          const message = (error as Error).message || "";
          
          if (code === "auth/popup-blocked") {
            devWarn("[Auth] Popup blocked, falling back to redirect...");
            try {
              await signInWithRedirect(auth, googleProvider);
              resolve(null);
            } catch {
              resolve("Failed to redirect for Google Login.");
            }
            return;
          }
          
          if (code === "auth/cancelled-popup-request" || code === "auth/popup-closed-by-user") {
            resolve(null);
            return;
          }
          
          if (
            code === "auth/api-key-not-valid. - please pass a valid api key." ||
            code === "auth/invalid-api-key" ||
            message.includes("api-key-not-valid")
          ) {
            resolve("Configuration Error: Please add your Firebase API credentials to .env.local to enable Google Login.");
            return;
          }

          console.error("[Auth] Google Login Error:", message);
          resolve("Failed to authenticate with Google. " + message);
        })
        .finally(() => {
          googleLoginInProgress.current = false;
        });
    });
  };

  const signup = async (name: string, email: string, password?: string, phoneNumber?: string): Promise<string | null> => {
    try {
      if (!password) return "Password is required.";
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      // Send Firebase Email Verification
      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyErr) {
        devWarn("[Auth] Verification email warning:", verifyErr);
      }

      const now = new Date().toISOString();
      const storedReferredBy = typeof window !== "undefined" ? sessionStorage.getItem("edunova_ref") : null;
      const isUserAdmin = checkIsAdmin(email);
      const newUser: User & { createdAt: string } = {
        id: userCredential.user.uid,
        name,
        email,
        phoneNumber: phoneNumber || null,
        role: isUserAdmin ? "admin" : "user",
        provider: "email",
        profilePicture: null,
        lastLogin: now,
        createdAt: now,
        referredBy: storedReferredBy || null,
        availableDiscount: 0,
        referralUnlocked: false,
        referralCompleted: false,
        successfulReferralCount: 0,
        maxReferralAllowed: 1,
      };

      const userRef = doc(db, "users", userCredential.user.uid);
      setDoc(userRef, newUser).then(() => {
        if (storedReferredBy) {
          import("@/lib/data/referrals").then(({ createReferral }) =>
            createReferral(storedReferredBy, userCredential.user.uid)
          );
        }
      }).catch(() => {});

      // Sign out user immediately so they must click verification link before logging in
      await signOut(auth);
      setUser(null);

      triggerEmailEvent("welcome", email, name);

      return null;
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code || "";
      if (code === "auth/email-already-in-use") {
        return "An account with this email address already exists. Please log in instead, or use 'Forgot password' on the login page.";
      }
      if (code === "auth/weak-password") return "Password must be at least 6 characters.";
      if (code === "auth/invalid-email") return "Please enter a valid email address.";
      return (error as Error).message || "Signup failed. Please try again.";
    }
  };

  const resendVerification = async (email: string, password?: string): Promise<string | null> => {
    try {
      if (!email) return "Email address is required.";
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return null;
      }
      if (!password) {
        return "Password is required to resend verification email.";
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      return null;
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code || "";
      if (code === "auth/too-many-requests") {
        return "Too many requests. Please wait a minute before requesting another verification email.";
      }
      return (error as Error).message || "Failed to resend verification email.";
    }
  };

  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: unknown) {
      console.error("[Auth] Admin Login Error:", (error as Error).message);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push("/");
  };

  const resetPassword = async (email: string): Promise<string | null> => {
    try {
      if (!email) return "Email address is required.";
      
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.includes("google.com") && !methods.includes("password")) {
          return "This account uses Google Sign-In. Please continue with Google.";
        }
      } catch (methodError: unknown) {
        // If email enumeration protection is enabled, this will throw — fall through.
        devWarn("[Auth] Could not fetch sign-in methods (enumeration protection may be enabled):", (methodError as Error).message);
      }

      await sendPasswordResetEmail(auth, email);
      return null;
    } catch (error: unknown) {
      console.error("[Auth] Reset Password Error:", error);
      const code = (error as { code?: string })?.code || "";
      if (code === "auth/invalid-email") return "Please enter a valid email address.";
      if (code === "auth/user-not-found") return "No account found with this email.";
      if (code === "auth/too-many-requests") return "Too many requests. Please try again later.";
      return (error as Error).message || "Failed to send password reset email. Please try again.";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        clearAuthError,
        login,
        googleLogin,
        signup,
        adminLogin,
        logout,
        resetPassword,
        resendVerification,
        showWelcome,
        dismissWelcome,
      }}
    >
      {loading ? (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a1a" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid rgba(176,38,255,0.3)",
                borderTopColor: "#b026ff",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ color: "#888", fontSize: 14, fontFamily: "system-ui" }}>Loading EduNova...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      ) : authError ? (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a1a" }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <p style={{ color: "#ef4444", fontSize: 16, fontFamily: "system-ui", marginBottom: 8, fontWeight: 600 }}>
              Account Load Error
            </p>
            <p style={{ color: "#888", fontSize: 14, fontFamily: "system-ui", marginBottom: 24 }}>
              {authError}
            </p>
            <button
              onClick={() => { setAuthError(null); setLoading(true); window.location.reload(); }}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                background: "#b026ff",
                color: "#fff",
                border: "none",
                fontFamily: "system-ui",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
