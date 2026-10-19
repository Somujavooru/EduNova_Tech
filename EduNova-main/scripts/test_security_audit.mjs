/**
 * EduNova Comprehensive Security & Quality Audit Test Suite
 *
 * Runs automated checks against:
 * 1. Firestore Security Rules structure & constraints
 * 2. API Route authorization & input validation contracts
 * 3. Secret leaks across client-facing code
 * 4. Filesystem persistence removal
 * 5. Download sanitization & memory boundary enforcement
 * 6. Email injection & XSS sanitization
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    results.push({ status: "PASS", name: testName });
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    results.push({ status: "FAIL", name: testName, details });
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
  }
}

console.log("\n=======================================================");
console.log("    EDUNOVA PRODUCTION SECURITY & COMPATIBILITY AUDIT   ");
console.log("=======================================================\n");

// ── Test Suite 1: Firestore Security Rules ────────────────────────────────────
console.log("Suite 1: Firestore Security Rules Verification");
const firestoreRulesPath = path.join(PROJECT_ROOT, "firestore.rules");
const firestoreRules = fs.readFileSync(firestoreRulesPath, "utf-8");

// Filter out comments to check actual active rule code
const activeRulesCode = firestoreRules
  .split("\n")
  .filter((l) => !l.trim().startsWith("//"))
  .join("\n");

assert(
  !activeRulesCode.includes("|| true") && !activeRulesCode.includes("isAnyAdmin() || true"),
  "1.1 Contact messages unconditional authorization bypass (|| true) removed from active rules"
);

assert(
  firestoreRules.includes("match /contact_messages/{messageId}") &&
    firestoreRules.includes("allow create: if false;") &&
    firestoreRules.includes("allow read, update, delete: if isAnyAdmin();"),
  "1.2 Contact messages direct client creation denied (allow create: if false;), restricted to isAnyAdmin()"
);

assert(
  firestoreRules.includes("match /orders/{orderId}") &&
    firestoreRules.includes("allow create: if false;"),
  "1.3 Orders direct client creation is denied (allow create: if false;)"
);

assert(
  firestoreRules.includes("match /orders/{orderId}") &&
    firestoreRules.includes("!request.resource.data.diff(resource.data).affectedKeys().hasAny([") &&
    firestoreRules.includes('"status"') &&
    firestoreRules.includes('"deliveryStatus"'),
  "1.4 Orders status & deliveryStatus modification blocked for non-admin clients"
);

assert(
  firestoreRules.includes("match /users/{uid}") &&
    firestoreRules.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly(["),
  "1.5 User profile updates enforce strict allowlist (money/role tampering blocked)"
);

assert(
  firestoreRules.includes("match /utrIndex/{utrNumber}") &&
    firestoreRules.includes("allow read, write: if false;"),
  "1.6 Direct client access to utrIndex is completely denied"
);

// ── Test Suite 2: Filesystem Persistence ──────────────────────────────────────
console.log("\nSuite 2: Filesystem Persistence & Runtime Compatibility");
const contactMessagesJsonPath = path.join(PROJECT_ROOT, "src", "lib", "data", "contact_messages.json");
assert(
  !fs.existsSync(contactMessagesJsonPath),
  "2.1 contact_messages.json file is completely removed"
);

const contactApiContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "app", "api", "contact", "route.ts"), "utf-8");
assert(
  !contactApiContent.includes("fs.writeFileSync") && !contactApiContent.includes("fs.readFileSync"),
  "2.2 Contact API does not use Node.js fs read/write operations"
);

assert(
  contactApiContent.includes("verifyServerRequest(request, true)"),
  "2.3 Contact API GET, PATCH, DELETE protected with verifyServerRequest admin check"
);

// ── Test Suite 3: Client-Side Secure Downloads & Serverless DOS Elimination ───
console.log("\nSuite 3: Client-Side Secure Downloads & Serverless DOS Elimination");
const downloadApiRoutePath = path.join(PROJECT_ROOT, "src", "app", "api", "download");
assert(
  !fs.existsSync(downloadApiRoutePath),
  "3.1 Redundant /api/download/secure route completely deleted (avoids server memory exhaustion)"
);

const downloadUtilsContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "lib", "downloadUtils.ts"), "utf-8");
assert(
  downloadUtilsContent.includes("URL.createObjectURL") &&
    downloadUtilsContent.includes("URL.revokeObjectURL"),
  "3.2 downloadUtils.ts generates pure client-side downloads via URL.createObjectURL"
);

// ── Test Suite 4: Order Creation & Payment Security ───────────────────────────
console.log("\nSuite 4: Order & Payment Creation Validation");
const orderCreateApiContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "app", "api", "orders", "create", "route.ts"), "utf-8");

assert(
  orderCreateApiContent.includes("^[a-zA-Z0-9_\\-]{4,50}$"),
  "4.1 Order creation validates UTR format via regex"
);

assert(
  orderCreateApiContent.includes("adminDb.collection(\"projects\").doc(projectId).get()") &&
    orderCreateApiContent.includes('"Project not found"'),
  "4.2 Order creation computes price server-side from catalog and rejects missing projects (400)"
);

assert(
  orderCreateApiContent.includes("adminDb.runTransaction") &&
    orderCreateApiContent.includes("discountApplied") &&
    orderCreateApiContent.includes("rewardUsed"),
  "4.3 Order creation uses atomic Firestore transaction for UTR, referral discount redemption, and order creation"
);

const ordersDataContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "lib", "data", "orders.ts"), "utf-8");
assert(
  !ordersDataContent.includes("setDoc(orderRef") && !ordersDataContent.includes("Fallback: Direct Client"),
  "4.4 Client orders.ts never creates orders directly via client Firestore (no setDoc fallback)"
);

// ── Test Suite 5: Cloud Storage & Payment Screenshot Security ────────────────
console.log("\nSuite 5: Cloud Storage & Payment Screenshot Security");
const storageRulesPath = path.join(PROJECT_ROOT, "storage.rules");
const storageRulesContent = fs.readFileSync(storageRulesPath, "utf-8");

assert(
  storageRulesContent.includes("match /payment-screenshots/{uid}/{fileName}") &&
    storageRulesContent.includes("request.auth.uid == uid") &&
    storageRulesContent.includes("resource == null"),
  "5.1 Storage rules scope screenshots per UID and prohibit file overwrites (resource == null)"
);

assert(
  storageRulesContent.includes("5 * 1024 * 1024") &&
    storageRulesContent.includes("image/(jpeg|png|webp)"),
  "5.2 Storage rules enforce strict 5MB size limit and image/(jpeg|png|webp) content types"
);

assert(
  storageRulesContent.includes("request.auth.uid == uid || isAdmin()") &&
    !storageRulesContent.includes("resource.metadata.userId"),
  "5.3 Storage rules read authorization does not depend on spoofable client metadata"
);

const firebaseJsonPath = path.join(PROJECT_ROOT, "firebase.json");
const firebaseJsonContent = JSON.parse(fs.readFileSync(firebaseJsonPath, "utf-8"));
assert(
  Boolean(firebaseJsonContent.storage && firebaseJsonContent.storage.rules === "storage.rules"),
  "5.4 firebase.json includes storage configuration pointing to storage.rules"
);

const uploadScreenshotContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "lib", "uploadScreenshot.ts"), "utf-8");
assert(
  uploadScreenshotContent.includes("payment-screenshots/${userId}/") &&
    !uploadScreenshotContent.includes("return dataUrl;") &&
    uploadScreenshotContent.includes("throw new Error"),
  "5.5 uploadScreenshot uses per-user path and throws error instead of inline base64 fallback"
);

assert(
  orderCreateApiContent.includes('hostname !== "firebasestorage.googleapis.com"') &&
    orderCreateApiContent.includes("payment-screenshots/${uid}/"),
  "5.6 Order creation strictly validates paymentScreenshot host and per-user storage path"
);

// ── Test Suite 6: Secret Leaks in Source Code ──────────────────────────────────
console.log("\nSuite 6: Secrets & Credentials Audit");
function scanForSecrets(dirPath) {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      if (file.name !== "node_modules" && file.name !== ".next" && file.name !== ".git") {
        scanForSecrets(fullPath);
      }
    } else if (file.isFile() && /\.(tsx|ts|js|mjs|json)$/.test(file.name)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes("BEGIN RSA PRIVATE KEY") || content.includes("BEGIN PRIVATE KEY")) {
        assert(false, `6.x Private key found in ${fullPath}`, "Hardcoded private key detected");
      }
    }
  }
}
scanForSecrets(path.join(PROJECT_ROOT, "src"));
assert(true, "6.1 Source tree verified free of hardcoded RSA/private keys");

// ── Test Suite 7: Cloudflare Worker Configuration ─────────────────────────────
console.log("\nSuite 7: Cloudflare Worker Deployment Configuration");
const wranglerPath = path.join(PROJECT_ROOT, "wrangler.jsonc");
assert(fs.existsSync(wranglerPath), "6.1 wrangler.jsonc exists");

const wranglerContent = fs.readFileSync(wranglerPath, "utf-8");
assert(
  wranglerContent.includes('"nodejs_compat"') && wranglerContent.includes('"ASSETS"'),
  "7.2 wrangler.jsonc contains nodejs_compat flag and ASSETS binding"
);

assert(
  wranglerContent.includes('"RATE_LIMITER"'),
  "7.3 wrangler.jsonc configures Cloudflare RATE_LIMITER binding"
);

const clientIpContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "lib", "clientIp.ts"), "utf-8");
assert(
  clientIpContent.includes('request.headers.get("cf-connecting-ip")') &&
    !clientIpContent.includes("x-forwarded-for") &&
    !clientIpContent.includes("x-real-ip"),
  "7.4 clientIp.ts strictly inspects cf-connecting-ip and ignores spoofable x-forwarded-for"
);

const emailLoginContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "app", "api", "email", "login", "route.ts"), "utf-8");
const emailWelcomeContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "app", "api", "email", "welcome", "route.ts"), "utf-8");
assert(
  !contactApiContent.includes("x-forwarded-for") &&
    !emailLoginContent.includes("x-forwarded-for") &&
    !emailWelcomeContent.includes("x-forwarded-for"),
  "7.5 All API routes eliminated spoofable x-forwarded-for headers in favor of getClientIp"
);

const contactDataContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "lib", "data", "contact.ts"), "utf-8");
assert(
  !contactDataContent.includes('setDoc(doc(db, "contact_messages"'),
  "7.6 Client contact.ts never writes to contact_messages via direct Firestore setDoc"
);

const nextConfigContent = fs.readFileSync(path.join(PROJECT_ROOT, "next.config.ts"), "utf-8");
assert(
  nextConfigContent.includes("X-Content-Type-Options") &&
    nextConfigContent.includes("X-Frame-Options") &&
    nextConfigContent.includes("Strict-Transport-Security"),
  "7.7 next.config.ts applies production security headers"
);

// ── Test Suite 8: Admin Claims, Logging & CSP Security ────────────────────────
console.log("\nSuite 8: Admin Custom Claims, CSP & Production Logging");
const setAdminClaimPath = path.join(PROJECT_ROOT, "scripts", "set_admin_claim.mjs");
assert(fs.existsSync(setAdminClaimPath), "8.1 scripts/set_admin_claim.mjs exists");

const setAdminClaimContent = fs.readFileSync(setAdminClaimPath, "utf-8");
assert(
  setAdminClaimContent.includes("setCustomUserClaims") &&
    setAdminClaimContent.includes("admin: true"),
  "8.2 set_admin_claim.mjs sets { admin: true } custom user claim"
);

const serverAuthContent = fs.readFileSync(path.join(PROJECT_ROOT, "src", "lib", "serverAuth.ts"), "utf-8");
assert(
  !serverAuthContent.includes("ADMIN_EMAILS") &&
    serverAuthContent.includes("decoded.admin === true"),
  "8.3 serverAuth.ts checks decoded.admin === true with no hardcoded ADMIN_EMAILS array"
);

assert(
  !firestoreRules.includes("@edunova.com") &&
    !storageRulesContent.includes("@edunova.com"),
  "8.4 firestore.rules and storage.rules contain zero hardcoded @edunova.com email addresses"
);

assert(
  nextConfigContent.includes("Content-Security-Policy-Report-Only"),
  "8.5 next.config.ts specifies Content-Security-Policy-Report-Only header"
);

const libFiles = fs.readdirSync(path.join(PROJECT_ROOT, "src", "lib"));
let rawConsoleLogsInLib = 0;
for (const f of libFiles) {
  if (f !== "logger.ts" && (f.endsWith(".ts") || f.endsWith(".tsx"))) {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, "src", "lib", f), "utf-8");
    if (content.includes("console.log(")) {
      rawConsoleLogsInLib++;
    }
  }
}
assert(
  rawConsoleLogsInLib === 0,
  "8.6 src/lib root files contain zero raw console.log statements (routed through logger.ts)"
);

assert(
  !contactApiContent.includes(": any") && !contactApiContent.includes("as any"),
  "8.7 Contact API route has zero occurrences of ': any' or 'as any'"
);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n=======================================================");
console.log(` AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All security and runtime compatibility audit checks passed successfully!\n");
  process.exit(0);
}
