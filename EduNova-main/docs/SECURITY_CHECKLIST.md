# EduNova Security & Authorization Checklist

This document details the security posture, authentication rules, authorization boundaries, and vulnerability mitigations implemented for EduNova.

---

## 1. Authentication & Role-Based Access Control

### Role Architecture
- **Roles:** `user` (default) and `admin`.
- **Admin Verification Rule:**
  - Evaluated via `request.auth.token.email_verified == true` against trusted `ADMIN_EMAILS` list.
  - Or verified via trusted Firestore document `users/{uid}.role == 'admin'`.
  - Normal users CANNOT elevate their own privileges via client writes (enforced by `firestore.rules`).

### Server-Side API Authorization (`src/lib/serverAuth.ts`)
- Never trusts client-supplied headers, request bodies, or URL parameters for admin status.
- Validates the Firebase ID token in the `Authorization: Bearer <token>` header on every protected endpoint.
- Verifies email verification status and administrative role before executing mutations or returning sensitive records.

---

## 2. Firestore Security Rules Enforcement

| Collection | Read Permitted | Create Permitted | Update Permitted | Delete Permitted |
| :--- | :--- | :--- | :--- | :--- |
| **`users/{uid}`** | Owner or Admin | Owner (default `role: "user"`) | Owner (`role` immutable) or Admin | Admin only |
| **`orders/{orderId}`** | Owner or Admin | Authenticated Owner (`status: "pending"`) | **Admin only** for status/amount; Owner can update non-critical profile | Admin only |
| **`custom_requests/{requestId}`** | Owner or Admin | Authenticated Owner (`status: "pending"`) | Admin or Owner (cannot edit `driveUrl`/admin fields) | Admin only |
| **`contact_messages/{messageId}`** | **Admin only** | Public (with validation) | **Admin only** | **Admin only** |
| **`utrIndex/{utrNumber}`** | **None (Server only)** | **None (Server only)** | **None** | **None** |
| **`projects/{projectId}`** | Public | Admin only | Admin only | Admin only |
| **`reviews/{reviewId}`** | Public | Authenticated Author | Author or Admin | Author or Admin |

---

## 3. Payment & Order Safety Controls

1. **Atomic UTR Uniqueness:**
   - Enforced inside an atomic Firestore transaction (`adminDb.runTransaction`) in `POST /api/orders/create`.
   - Before order insertion, `utrIndex/{utrNumber}` is queried. If the UTR already exists, the transaction aborts with HTTP 409 Conflict.
2. **Client Status Tampering Block:**
   - In `firestore.rules`, non-admin users are strictly forbidden from modifying `status`, `deliveryStatus`, `deliveredAt`, `amount`, `utrNumber`, or `invoiceId`.
3. **Price Validation:**
   - `POST /api/orders/create` verifies that the submitted amount is a finite positive number and cross-references against catalog project prices.

---

## 4. Secure File Downloads & DOS Protection

1. **Path Traversal Elimination:**
   - The `/api/download/secure` route sanitizes filenames with `sanitizeFilename()`, stripping `..`, `/`, `\`, null bytes, and non-printable characters.
2. **Memory Exhaustion Guard:**
   - Enforces a 15MB base64 payload size boundary to prevent denial-of-service memory exhaustion in Worker isolates.
3. **No-Sniff & No-Cache Headers:**
   - Enforces `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-cache, no-store, must-revalidate` to prevent CDN poisoning and MIME sniffing.

---

## 5. Email Injection & Rate Limiting

1. **Input Sanitization:**
   - All user-supplied contact strings (name, email, subject, message) are escaped via `escapeHtml()` prior to template insertion.
2. **Rate Limiting:**
   - Contact form submissions are throttled to a maximum of 5 requests per minute per IP address.
   - Login alert emails are throttled by IP and email address.
   - Email endpoints verify that the authenticated caller's email matches the notification target to prevent arbitrary email relaying.

---

## 6. Secrets Management

- **Committed Code Cleanliness:** No RSA private keys, service account JSON files, or SMTP passwords exist in the source repository.
- **Git Ignore Protection:** `.gitignore` explicitly excludes `.env*`, `*.pem`, `*.tsbuildinfo`, `firebase-debug.log*`, and `node_modules/`.
- **Runtime Environment:** Secrets are injected exclusively via Cloudflare Dashboard or Wrangler secret bindings.
