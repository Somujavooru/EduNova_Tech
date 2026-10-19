import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

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
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Unauthorized — missing or invalid Authorization header",
      status: 401,
    };
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    return {
      success: false,
      error: "Unauthorized — empty token",
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
    } else {
      // 2. Fallback: check Firestore users/{uid} document
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
