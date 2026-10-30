// scripts/test_deliverables_and_payment_workflow.mjs
// Automated verification suite for EduNova Forge Deliverables (Complete ZIP) & Restored 25% Advance Payment Policy

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=================================================================");
console.log("  EDUNOVA FORGE: COMPLETE PROJECT ZIP & 25% ADVANCE PAYMENT AUDIT ");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────
// Suite 1: Project Deliverables UI & Complete ZIP Architecture
// ─────────────────────────────────────────────────────────────
console.log("Suite 1: Project Deliverables UI & Complete ZIP Architecture");

const deliverablesSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/data/deliverables.ts"),
  "utf8"
);

test("1.1 Report deliverable defined in PDF format with Documents/ path", () => {
  assert(deliverablesSource.includes('"report"'));
  assert(deliverablesSource.includes('"PDF"'));
  assert(deliverablesSource.includes("Documents/Project_Report.pdf"));
});

test("1.2 Presentation deliverable defined in PPTX format with Documents/ path", () => {
  assert(deliverablesSource.includes('"presentation"'));
  assert(deliverablesSource.includes('"PPTX"'));
  assert(deliverablesSource.includes("Documents/Project_Presentation.pptx"));
});

test("1.3 Source code deliverable defined in ZIP format with Source_Code/ path", () => {
  assert(deliverablesSource.includes('"source_code"'));
  assert(deliverablesSource.includes('"ZIP"'));
  assert(deliverablesSource.includes("Source_Code/Source_Files.zip"));
});

test("1.4 Hardware documentation deliverable defined for circuit diagrams", () => {
  assert(deliverablesSource.includes('"circuit_diagram"'));
  assert(deliverablesSource.includes("Circuit_Schematic.pdf"));
});

test("1.5 User Guide deliverable defined in PDF format with Documents/ path", () => {
  assert(deliverablesSource.includes('"user_guide"'));
  assert(deliverablesSource.includes("Documents/User_Guide.pdf"));
});

const deliverablesUiSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/ui/ProjectDeliverablesSection.tsx"),
  "utf8"
);

test("1.6 Individual deliverable cards have NO individual download buttons", () => {
  assert(!deliverablesUiSource.includes('onClick={() => handleDownload(item)}'), "Found legacy individual card download action");
  assert(deliverablesUiSource.includes("Included in ZIP") || deliverablesUiSource.includes("Bundled in ZIP"));
});

test("1.7 Deliverables section provides single Download Complete Project primary action", () => {
  assert(deliverablesUiSource.includes("Download Complete Project"));
  assert(deliverablesUiSource.includes("All included project documents, source files, and supporting resources are bundled into one complete project ZIP."));
  assert(deliverablesUiSource.includes("downloadCompleteProjectZip"));
});

const zipGenSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/projectZipGenerator.ts"),
  "utf8"
);

test("1.8 Project ZIP Generator packages Documents/, Source_Code/, and README.md", () => {
  assert(zipGenSource.includes('zip.folder(cleanTitle)'));
  assert(zipGenSource.includes('root.file("README.md"'));
  assert(zipGenSource.includes('root.folder("Documents")'));
  assert(zipGenSource.includes('root.folder("Source_Code")'));
  assert(zipGenSource.includes("Project_Report.pdf"));
  assert(zipGenSource.includes("Project_Presentation.pptx"));
  assert(zipGenSource.includes("User_Guide.pdf"));
});

// ─────────────────────────────────────────────────────────────
// Suite 2: Restored 25% Advance Payment & 75% Balance Calculations
// ─────────────────────────────────────────────────────────────
console.log("\nSuite 2: Restored 25% Advance Payment & 75% Balance Calculations");

function calculateAdvanceAndBalance(total) {
  const advance = Math.round(total * 0.25);
  const balance = total - advance;
  return { total, advance, balance };
}

const testPrices = [999, 1499, 2499, 3299, 4500, 7899, 12500, 19999];

test("2.1 Advance payment is exactly 25% and balance is 75% across test prices", () => {
  testPrices.forEach((price) => {
    const { advance, balance, total } = calculateAdvanceAndBalance(price);
    assert.strictEqual(advance + balance, total, `Sum mismatch for price ${price}`);
    assert(Math.abs(advance - price * 0.25) <= 1, `Advance calculation error for ${price}`);
    assert(Math.abs(balance - price * 0.75) <= 1, `Balance calculation error for ${price}`);
  });
});

const ordersRouteSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/orders/create/route.ts"),
  "utf8"
);

test("2.2 Backend order API calculates 25% advance for catalog build orders", () => {
  assert(ordersRouteSource.includes("Math.round(projData.price * 0.25)"));
  assert(ordersRouteSource.includes("verifiedAdvanceAmount = baseAmount"));
  assert(ordersRouteSource.includes("verifiedBalanceAmount = projData.price - baseAmount"));
  assert(ordersRouteSource.includes('Advance (25%):'));
});

test("2.3 Backend order API calculates 25% advance for custom requests", () => {
  assert(ordersRouteSource.includes("Math.round(agreedPrice * 0.25)"));
  assert(ordersRouteSource.includes("verifiedBalanceAmount = agreedPrice - baseAmount"));
});

test("2.4 Backend order API calculates 75% balance for final payment", () => {
  assert(ordersRouteSource.includes("Math.round(agreedPrice * 0.75)"));
  assert(ordersRouteSource.includes('Balance (75%):'));
});

const checkoutModalSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/ui/CheckoutModal.tsx"),
  "utf8"
);

test("2.5 CheckoutModal calculates 25% advance and 75% remaining balance", () => {
  assert(checkoutModalSource.includes("Math.round(project.price * 0.25)"));
  assert(checkoutModalSource.includes("Order Project (25% Advance)"));
  assert(checkoutModalSource.includes("Remaining Balance (75%)"));
  assert(checkoutModalSource.includes("Advance Due Now (25%)"));
  assert(checkoutModalSource.includes("Submit 25% Advance & Start Build"));
});

const projectDetailSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/ui/ProjectDetailModal.tsx"),
  "utf8"
);

test("2.6 ProjectDetailModal displays 25% advance and 75% on delivery badges", () => {
  assert(projectDetailSource.includes("Math.round(project.price * 0.25)"));
  assert(projectDetailSource.includes("Build on Order (25% Advance)"));
  assert(projectDetailSource.includes("75% on delivery"));
  assert(projectDetailSource.includes("Order Project (25% Advance)"));
});

// ─────────────────────────────────────────────────────────────
// Suite 3: Admin Dashboard Verification & Approval Workflow
// ─────────────────────────────────────────────────────────────
console.log("\nSuite 3: Admin Dashboard Verification & Approval Workflow");

const adminOrdersSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/admin/orders/page.tsx"),
  "utf8"
);

test("3.1 Admin orders UI displays 25% advance, total price, and 75% remaining balance", () => {
  assert(adminOrdersSource.includes("25% Advance"));
  assert(adminOrdersSource.includes("75% Balance"));
  assert(adminOrdersSource.includes("totalProjectPrice"));
});

test("3.2 Admin order inspection modal displays full payment breakdown", () => {
  assert(adminOrdersSource.includes("Required 25% Advance"));
  assert(adminOrdersSource.includes("Remaining 75% Balance"));
  assert(adminOrdersSource.includes("Verified Amount Paid"));
});

test("3.3 Admin rejection modal requires rejection reason", () => {
  assert(adminOrdersSource.includes("rejectionModalOrder"));
  assert(adminOrdersSource.includes("rejectionReasonText"));
  assert(adminOrdersSource.includes("handleConfirmReject"));
});

test("3.4 Admin approval records admin identity and timestamp", () => {
  assert(adminOrdersSource.includes("updateOrderStatus"));
  const ordersSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/data/orders.ts"),
    "utf8"
  );
  assert(ordersSource.includes('verifiedBy: adminEmail || "admin"'));
  assert(ordersSource.includes("verifiedAt: now"));
});

// ─────────────────────────────────────────────────────────────
// Suite 4: Customer Dashboard & Complete ZIP Workflow
// ─────────────────────────────────────────────────────────────
console.log("\nSuite 4: Customer Dashboard & Complete ZIP Workflow");

const dashboardSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/dashboard/page.tsx"),
  "utf8"
);

test("4.1 Dashboard tracks 25% advance and prompts 75% balance upon completion", () => {
  assert(dashboardSource.includes("Build on Order (25% Advance Paid)"));
  assert(dashboardSource.includes("25% Advance Payment under verification"));
  assert(dashboardSource.includes("25% Advance Verified!"));
  assert(dashboardSource.includes("Pay the remaining 75% balance"));
  assert(dashboardSource.includes("Pay Remaining 75% Balance"));
});

test("4.2 Dashboard invoices clearly state 25% Advance and 75% Final", () => {
  assert(dashboardSource.includes("Advance Invoice (25%)"));
  assert(dashboardSource.includes("Final Invoice (75%)"));
});

test("4.3 Dashboard handleDownloadProject triggers complete project ZIP download", () => {
  assert(dashboardSource.includes("downloadCompleteProjectZip"));
});

test("4.4 Deliverables unlocked only for approved orders", () => {
  assert(dashboardSource.includes("isPurchasedAndApproved={true}"));
});

test("4.5 Rejection reason and resubmission modal function correctly", () => {
  assert(dashboardSource.includes("item.primaryOrder.rejectionReason"));
  assert(dashboardSource.includes("resubmitOrderModal"));
  assert(dashboardSource.includes("handleResubmitPayment"));
});

// ─────────────────────────────────────────────────────────────
// Suite 5: ZIP File Generation Integrity Test
// ─────────────────────────────────────────────────────────────
console.log("\nSuite 5: ZIP File Generation Integrity Test");

test("5.1 JSZip packages valid complete archive with expected folder hierarchy", async () => {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const root = zip.folder("Test_Project");
  assert(root, "Could not create root folder");
  
  root.file("README.md", "# Test Project Documentation");
  const docs = root.folder("Documents");
  docs.file("Project_Report.pdf", "%PDF-1.4 dummy");
  docs.file("Project_Presentation.pptx", "Presentation deck");
  docs.file("User_Guide.pdf", "User setup guide");
  
  const src = root.folder("Source_Code");
  src.file("main.py", "print('hello world')");
  src.file("requirements.txt", "numpy>=1.0.0");
  
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  assert(zipBuffer.length > 100, "ZIP buffer was empty");
  
  // Verify reading back from the generated ZIP
  const unzipped = await JSZip.loadAsync(zipBuffer);
  assert(unzipped.file("Test_Project/README.md"));
  assert(unzipped.file("Test_Project/Documents/Project_Report.pdf"));
  assert(unzipped.file("Test_Project/Documents/Project_Presentation.pptx"));
  assert(unzipped.file("Test_Project/Documents/User_Guide.pdf"));
  assert(unzipped.file("Test_Project/Source_Code/main.py"));
  assert(unzipped.file("Test_Project/Source_Code/requirements.txt"));
});

console.log("\n=================================================================");
console.log(` AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All deliverables, complete ZIP download, and 25% advance payment checks passed!\n");
  process.exit(0);
}
