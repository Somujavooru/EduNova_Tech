import { adminAuth, adminDb, hasAdminCredentials } from "@/lib/firebaseAdmin";

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

export interface AuthVerificationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  status: number;
}

/**
 * Verifies the caller's Firebase ID token from the Authorization header.
 * Optionally enforces administrative privileges.
 *
 * Checks:
 * 1. Firebase Auth custom claims: decoded.admin === true
 * 2. Fallback to Firestore users/{uid}.role === "admin" to support active sessions
 *    and users promoted via admin UI before token refresh.
 */
export async function verifyServerRequest(
  request: Request,
  requireAdmin: boolean = false
): Promise<AuthVerificationResult> {
  let idToken = "";
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    idToken = authHeader.slice(7).trim();
  } else {
    try {
      const url = new URL(request.url);
      idToken = url.searchParams.get("token") || "";
    } catch {
      // ignore
    }
  }

  if (!idToken) {
    return {
      success: false,
      error: "Unauthorized — missing or invalid Authorization token",
      status: 401,
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = (decoded.email || "").toLowerCase().trim();
    const uid = decoded.uid;

    let role: "user" | "admin" = "user";

    // 1. Check custom claim (primary admin check)
    if (decoded.admin === true) {
      role = "admin";
    } else if (
      decoded.email_verified === true &&
      (email === "somashekharjavooru@gmail.com" ||
        email === "vijayrk0513@gmail.com" ||
        email === "somashekhar@edunova.com" ||
        email === "vijay@edunova.com" ||
        email === "admin@edunova.com")
    ) {
      role = "admin";
      // Auto-grant Firebase Auth custom claim so Firestore security rules recognize admin immediately
      if (hasAdminCredentials()) {
        adminAuth.setCustomUserClaims(uid, { admin: true }).catch(() => {});
      }
    } else if (hasAdminCredentials()) {
      // 2. Fallback: check Firestore users/{uid} document (only if credentials configured)
      try {
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (userDoc.exists && userDoc.data()?.role === "admin") {
          role = "admin";
        }
      } catch (dbErr: unknown) {
        console.warn("[serverAuth] Failed to check users collection role:", (dbErr as Error)?.message || dbErr);
      }
    }

    if (requireAdmin && role !== "admin") {
      return {
        success: false,
        error: "Forbidden — administrator privileges required",
        status: 403,
      };
    }

    return {
      success: true,
      status: 200,
      user: {
        uid,
        email,
        name: decoded.name || "",
        role,
      },
    };
  } catch (err: unknown) {
    const message = (err as Error)?.message || "Invalid token";
    console.error("[serverAuth] Token verification failed:", message);
    return {
      success: false,
      error: "Unauthorized — invalid or expired token",
      status: 401,
    };
  }
}
