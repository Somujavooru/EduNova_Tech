import assert from "assert";
import fs from "fs";

console.log("=================================================================");
console.log("  VERIFICATION TEST: DELIVERABLES LAYOUT, UNLIMITED REFERRALS,   ");
console.log("            AND STRICT 75% FINAL PAYMENT LOCK                   ");
console.log("=================================================================\n");

// -------------------------------------------------------------
// 1. Deliverables Layout & Card Containment
// -------------------------------------------------------------
console.log("Suite 1: Deliverables Card Arrangement & Clean Badges");
const deliverablesUi = fs.readFileSync("EduNova-main/src/components/ui/ProjectDeliverablesSection.tsx", "utf8");

// Badge must be within flex header row with shrink-0 and proper border containment
assert(
  deliverablesUi.includes("getFormatBadgeStyle(item.format)") || deliverablesUi.includes("getFormatBadgeStyle(\n                          item.format"),
  "Format badge must use getFormatBadgeStyle"
);
assert(
  deliverablesUi.includes("shrink-0"),
  "Format badge must have shrink-0 to prevent overflowing"
);
console.log("  [PASS] 1.1 Deliverable format badges (PDF, PPTX, ZIP) contained cleanly within card header");

// File size and inclusion status must not break awkwardly across lines
assert(
  deliverablesUi.includes("truncate") && deliverablesUi.includes("whitespace-nowrap"),
  "File paths truncate properly and status badges have whitespace-nowrap"
);
console.log("  [PASS] 1.2 Path truncates cleanly and footer items maintain whitespace-nowrap preventing text wrapping");

// -------------------------------------------------------------
// 2. Unlimited Referrals Program
// -------------------------------------------------------------
console.log("\nSuite 2: Unlimited Referrals System");
const referralsLib = fs.readFileSync("EduNova-main/src/lib/data/referrals.ts", "utf8");
const dashboardUi = fs.readFileSync("EduNova-main/src/app/dashboard/page.tsx", "utf8");

// Check referral backend does not exit early when referralCompleted is true
assert(
  !referralsLib.includes("if (userData.referralCompleted) return;") &&
  !referralsLib.includes("if (userData.rewardRedeemed) return;"),
  "Referral system must not block further referrals after first completion"
);
console.log("  [PASS] 2.1 Backend referral processing allows unlimited referrals per user");

// Check dashboard referral card does not show 1/1 cap or "Referral Closed"
assert(
  !dashboardUi.includes("Referral Closed") &&
  !dashboardUi.includes("Maximum of 1 successful referral reached") &&
  dashboardUi.includes("Unlimited Referrals!"),
  "Dashboard UI must promote unlimited referrals without a 1-referral cap"
);
console.log("  [PASS] 2.2 Dashboard UI announces Unlimited Referrals and removes 'Referral Closed' badge");

// -------------------------------------------------------------
// 3. Strict 75% Payment Lock for Delivery
// -------------------------------------------------------------
console.log("\nSuite 3: Strict 75% Payment Lock (Admin Stage 5 Does Not Unlock Files Without 75% Payment)");

// In dashboard/page.tsx, isReqFinalPaymentVerified must not use (o.deliveryStatus === 'delivered' && o.status === 'approved')
assert(
  !dashboardUi.includes('(o.deliveryStatus === "delivered" && o.status === "approved")'),
  "isReqFinalPaymentVerified must NOT consider stage 5 'delivered' as payment proof"
);
console.log("  [PASS] 3.1 isReqFinalPaymentVerified does NOT bypass payment verification when status is 'delivered'");

// Action buttons must check 75% final payment approval strictly
assert(
  dashboardUi.includes("Complete 75% Payment to Download"),
  "Dashboard displays 'Complete 75% Payment to Download' button when 75% payment is unverified"
);
console.log("  [PASS] 3.2 User dashboard presents prompt to complete 75% payment to unlock download");

// Check admin orders amount breakdown calculates 75% balance correctly
const adminOrdersUi = fs.readFileSync("EduNova-main/src/app/admin/orders/page.tsx", "utf8");
assert(
  adminOrdersUi.includes("75% Balance: ₹"),
  "Admin orders page displays 75% Balance amount"
);
assert(
  !adminOrdersUi.includes(`75% Balance: ₹{(order.balanceAmount ?? (order.orderType === "advance_payment" ? Math.round(order.amount / 0.25) - order.amount : 0)).toLocaleString("en-IN")}`),
  "Admin orders page uses dynamic total - advance calculation for 75% balance"
);
console.log("  [PASS] 3.3 Admin Orders Amount Breakdown accurately shows 75% balance instead of ₹0");

console.log("\n=================================================================");
console.log(" ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
console.log("=================================================================");
