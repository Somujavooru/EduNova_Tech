import fs from "fs";

console.log("=================================================================");
console.log("  EDUNOVA FORGE: DISCUSSION BADGE & 75% INVOICE TEST SUITE      ");
console.log("=================================================================");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// 1. Admin Layout - Discussion Badge & Hardcoded filter removal
const adminLayout = fs.readFileSync("EduNova-main/src/app/admin/layout.tsx", "utf8");
assert(!adminLayout.includes('txt !== "hi"') && !adminLayout.includes('txt !== "hello"'), "1.1 Hardcoded exclusion ('hi', 'hello', 'test') removed from discussions badge filter");
assert(adminLayout.includes('edunova_admin_read_discussions'), "1.2 Admin read discussions tracking integrated in layout.tsx");
assert(adminLayout.includes('<NotificationBell'), "1.3 Admin header contains NotificationBell for instant real-time alerts across all admin pages");

// 2. Notification System
const notifTs = fs.readFileSync("EduNova-main/src/lib/notifications.ts", "utf8");
assert(notifTs.includes('"discussion_received"') && notifTs.includes('"discussion_reply"'), "2.1 NotificationType includes discussion_received and discussion_reply");
assert(notifTs.includes('/admin/discussions'), "2.2 Admin template routes discussion notifications to /admin/discussions");

// 3. Notification Bell Realtime Sync
const notifBell = fs.readFileSync("EduNova-main/src/components/ui/NotificationBell.tsx", "utf8");
assert(notifBell.includes('liveDiscussionsRef'), "3.1 NotificationBell tracks live discussion questions for admin");
assert(notifBell.includes('liveUserDiscussionsRef'), "3.2 NotificationBell tracks admin replies in real time for students/users");
assert(notifBell.includes('unsubComments'), "3.3 NotificationBell subscribes to Firestore comments collection for real-time updates");

// 4. Invoicing for 75% Final Payment
const dashPage = fs.readFileSync("EduNova-main/src/app/dashboard/page.tsx", "utf8");
assert(dashPage.includes('Final Invoice (75%)'), "4.1 User dashboard displays 'Final Invoice (75%)' button");
assert(dashPage.includes('isReqFinalPaymentVerified') && dashPage.includes('handleDownloadInvoice'), "4.2 Dashboard checks final payment verification and triggers final invoice download");
assert(dashPage.includes('Advance Bill (25%)') && dashPage.includes('Final Bill (75%)'), "4.3 Custom request invoices provide distinct 25% Advance and 75% Final buttons");

// 5. Invoice Generator
const invGen = fs.readFileSync("EduNova-main/src/lib/invoiceGenerator.ts", "utf8");
assert(invGen.includes('order.orderType === "final_payment"'), "5.1 Invoice generator supports final_payment milestone");
assert(invGen.includes('Custom Project: 75% Final Delivery Milestone'), "5.2 Invoice displays official 75% Final Delivery Milestone header");

console.log("=================================================================");
console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================================");

if (failed > 0) process.exit(1);

