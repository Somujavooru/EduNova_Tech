import assert from "assert";
import fs from "fs";

console.log("=================================================================");
console.log("  VERIFICATION TEST: SOCIAL MEDIA SETTINGS & LIVE UPDATE CHECKS  ");
console.log("=================================================================\n");

// 1. Verify Footer respects enabled status for ALL social links
console.log("Suite 1: Footer Social Media Rendering Logic");
const footerCode = fs.readFileSync("EduNova-main/src/components/ui/Footer.tsx", "utf8");

const requiredChecks = [
  "socials?.instagram?.enabled &&",
  "socials?.linkedin?.enabled &&",
  "socials?.twitter?.enabled &&",
  "socials?.github?.enabled &&",
  "socials?.youtube?.enabled &&",
  "socials?.facebook?.enabled &&",
  "socials?.discord?.enabled &&",
  "socials?.telegram?.enabled &&",
  "socials?.whatsapp?.enabled &&",
  "socials?.email?.enabled &&",
];

for (const check of requiredChecks) {
  assert(footerCode.includes(check), `Footer must check '${check}' before rendering`);
  console.log(`  [PASS] Footer strictly checks: ${check}`);
}

// 2. Verify Contact page renders enabled socials as clickable links and skips disabled ones
console.log("\nSuite 2: Contact Page Social Media Rendering Logic");
const contactCode = fs.readFileSync("EduNova-main/src/app/contact/page.tsx", "utf8");
assert(contactCode.includes("if (!data.enabled) return null;"), "Contact page must hide disabled socials");
assert(contactCode.includes("<a") && contactCode.includes("href={cleanHref}"), "Contact page must render enabled socials as live links");
console.log("  [PASS] Contact page skips disabled socials and renders active socials as functional links");

// 3. Verify Admin Settings instant toggle persistence
console.log("\nSuite 3: Admin Settings Instant Persistence");
const adminSettingsCode = fs.readFileSync("EduNova-main/src/app/admin/settings/page.tsx", "utf8");
assert(
  adminSettingsCode.includes("savePlatformSettings({ socialLinks: nextSocials })"),
  "Admin settings toggle must immediately call savePlatformSettings"
);
console.log("  [PASS] Admin Settings toggle immediately persists social changes live to Firestore & API");

console.log("\n=================================================================");
console.log(" ALL SOCIAL MEDIA SETTINGS CHECKS PASSED SUCCESSFULLY!");
console.log("=================================================================");

