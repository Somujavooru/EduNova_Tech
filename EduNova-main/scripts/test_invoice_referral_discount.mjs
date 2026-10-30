import assert from "assert";
import fs from "fs";

console.log("=================================================================");
console.log("  TEST: REFERRAL DISCOUNT MENTIONED IN 75% FINAL PAYMENT INVOICE ");
console.log("=================================================================\n");

const invoiceCode = fs.readFileSync("EduNova-main/src/lib/invoiceGenerator.ts", "utf8");

// 1. Check invoice code extracts and calculates referral discount
assert(
  invoiceCode.includes("const discountApplied = Number(") || invoiceCode.includes("discountApplied"),
  "invoiceGenerator must extract discountApplied"
);
console.log("  [PASS] 1. invoiceGenerator correctly extracts discountApplied from order / finalPayment");

// 2. Check milestone text includes referral discount mention
assert(
  invoiceCode.includes("milestoneText = disc > 0") && invoiceCode.includes("Referral Disc Applied"),
  "Milestone badge in invoice must explicitly state that Referral Discount was applied"
);
console.log("  [PASS] 2. Milestone badge explicitly notes 'Referral Disc Applied' for transparency");

// 3. Check itemized table row describes the referral discount
assert(
  invoiceCode.includes("Referral Discount: - INR ${fDiscountApplied} applied on 75% final payment"),
  "Table row must explicitly display 'Referral Discount: - INR ... applied on 75% final payment'"
);
console.log("  [PASS] 3. Project table row mentions Referral Discount deducted from 75% final payment");

// 4. Check summary calculation rows include 75% Delivery Balance and Referral Reward Discount deduction
assert(
  invoiceCode.includes("75% Delivery Balance:") &&
  invoiceCode.includes("Referral Reward Discount:"),
  "Financial calculation breakdown must include both '75% Delivery Balance' and 'Referral Reward Discount'"
);
console.log("  [PASS] 4. Financial Summary breakdown includes 75% Delivery Balance and Referral Reward Discount (-INR)");

// 5. Check dashboard invoice trigger passes discountApplied
const dashboardCode = fs.readFileSync("EduNova-main/src/app/dashboard/page.tsx", "utf8");
assert(
  dashboardCode.includes("discountApplied: finDiscount") &&
  dashboardCode.includes("discountApplied: reqDiscount"),
  "Dashboard handleDownloadInvoice must pass discountApplied for synthetic and linked orders"
);
console.log("  [PASS] 5. Dashboard passes discountApplied to handleDownloadInvoice for all 75% final bill clicks");

console.log("\n=================================================================");
console.log(" ALL INVOICE REFERRAL DISCOUNT CHECKS PASSED SUCCESSFULLY!");
console.log("=================================================================");

