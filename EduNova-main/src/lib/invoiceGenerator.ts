import jsPDF from "jspdf";
import { Order } from "@/lib/data/orders";
import { EF_LOGO_BASE64 } from "@/lib/logoAsset";

function numberToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatTens = (n: number) => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
  };

  const formatHundreds = (n: number) => {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred";
      n %= 100;
      if (n > 0) str += " and ";
    }
    if (n > 0) {
      str += formatTens(n);
    }
    return str;
  };

  let intNum = Math.floor(num);
  let result = "";
  const crore = Math.floor(intNum / 10000000);
  intNum %= 10000000;
  const lakh = Math.floor(intNum / 100000);
  intNum %= 100000;
  const thousand = Math.floor(intNum / 1000);
  intNum %= 1000;
  const hundred = intNum;

  if (crore > 0) result += formatHundreds(crore) + " Crore ";
  if (lakh > 0) result += formatHundreds(lakh) + " Lakh ";
  if (thousand > 0) result += formatHundreds(thousand) + " Thousand ";
  if (hundred > 0) result += formatHundreds(hundred);

  return (result.trim() || "Zero") + " Rupees Only";
}

// Generate realistic vector handwritten digital signature on transparent canvas
function generateDigitalSignatureDataUrl(): string {
  if (typeof document === "undefined") return "";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.strokeStyle = "#1d4ed8"; // Royal blue pen ink
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Main flowing cursive stroke
    ctx.beginPath();
    ctx.moveTo(35, 75);
    ctx.bezierCurveTo(42, 35, 68, 18, 82, 24);
    ctx.bezierCurveTo(94, 28, 72, 68, 56, 78);
    ctx.bezierCurveTo(46, 84, 70, 84, 95, 64);
    ctx.bezierCurveTo(112, 48, 122, 50, 134, 66);
    ctx.bezierCurveTo(142, 76, 148, 54, 158, 50);
    ctx.bezierCurveTo(168, 46, 172, 64, 182, 64);
    ctx.bezierCurveTo(192, 64, 198, 44, 212, 42);
    ctx.bezierCurveTo(226, 40, 222, 68, 236, 64);
    ctx.bezierCurveTo(252, 58, 262, 46, 278, 44);
    ctx.bezierCurveTo(294, 42, 308, 54, 322, 50);
    ctx.bezierCurveTo(332, 48, 346, 24, 356, 22);
    ctx.bezierCurveTo(364, 20, 362, 44, 346, 66);
    ctx.stroke();

    // Underline flourish
    ctx.beginPath();
    ctx.lineWidth = 2.4;
    ctx.moveTo(60, 92);
    ctx.bezierCurveTo(130, 96, 250, 94, 345, 80);
    ctx.bezierCurveTo(368, 77, 376, 84, 360, 89);
    ctx.bezierCurveTo(338, 93, 275, 95, 225, 95);
    ctx.stroke();

    // Accent dots
    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.arc(368, 85, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(378, 84, 2.5, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

export function generateInvoice(order: Order) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // ========== PROFESSIONAL COLOR PALETTE ==========
  const navyDark: [number, number, number] = [15, 23, 42];        // #0F172A
  const slateDark: [number, number, number] = [30, 41, 59];       // #1E293B
  const slateMuted: [number, number, number] = [71, 85, 105];     // #475569
  const slateLight: [number, number, number] = [148, 163, 184];   // #94A3B8
  const borderLight: [number, number, number] = [226, 232, 240];  // #E2E8F0
  const bgCard: [number, number, number] = [248, 250, 252];       // #F8FAFC
  const royalBlue: [number, number, number] = [37, 99, 235];      // #2563EB
  const greenEmerald: [number, number, number] = [16, 185, 129];  // #10B981
  const greenDark: [number, number, number] = [5, 150, 105];      // #059669
  const white: [number, number, number] = [255, 255, 255];

  // 1. Crisp White Background
  doc.setFillColor(...white);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // 2. Top Corporate Accent Bar
  doc.setFillColor(...royalBlue);
  doc.rect(0, 0, pageWidth, 3.5, "F");

  let y = 14;

  // ========== COMPANY HEADER (LEFT) ==========
  // Official Brand: 3D EF Monogram Symbol Badge + "Edu" (Dark Navy) + "Nova" (Cyan) + "Forge" (Dark Navy)
  const logoW = 16;
  const logoH = 13.1;
  const logoX = margin;
  const logoY = 8;

  try {
    // Elegant dark rounded badge container for 3D monogram
    doc.setFillColor(10, 14, 26); // #0A0E1A
    doc.roundedRect(logoX, logoY, logoW + 4, logoH + 4, 2.5, 2.5, "F");
    doc.addImage(EF_LOGO_BASE64, "PNG", logoX + 2, logoY + 2, logoW, logoH);
  } catch (err) {
    console.warn("Could not embed EF logo in invoice:", err);
  }

  const textX = margin + logoW + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);

  // 1. "Edu" in Deep Navy
  doc.setTextColor(...navyDark);
  doc.text("Edu", textX, 15);
  const edunWidth = doc.getTextWidth("Edu");

  // 2. "Nova" in Vibrant Electric Cyan
  doc.setTextColor(0, 180, 216); // #00B4D8 Cyan
  doc.text("Nova", textX + edunWidth, 15);
  const novaWidth = doc.getTextWidth("Nova");

  // 3. "Forge" in Deep Navy
  doc.setTextColor(...navyDark);
  doc.text("Forge", textX + edunWidth + novaWidth + 1.2, 15);

  // Tagline: DISCOVER • BUILD • BRING IDEAS TO LIFE
  const tagY = 20.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(...slateMuted);
  doc.text("DISCOVER", textX, tagY);
  let tagX = textX + doc.getTextWidth("DISCOVER ");
  doc.setTextColor(0, 180, 216);
  doc.text("• ", tagX, tagY);
  tagX += doc.getTextWidth("• ");
  doc.setTextColor(...slateMuted);
  doc.text("BUILD", tagX, tagY);
  tagX += doc.getTextWidth("BUILD ");
  doc.setTextColor(0, 180, 216);
  doc.text("• ", tagX, tagY);
  tagX += doc.getTextWidth("• ");
  doc.setTextColor(...slateMuted);
  doc.text("BRING IDEAS TO LIFE", tagX, tagY);

  const compY = 25;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...royalBlue);
  doc.text("EDUNOVA FORGE TECHNOLOGIES PVT. LTD.", textX, compY);

  const contactY = 29;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...slateMuted);
  doc.text("edunovaforgessupport@gmail.com", textX, contactY);

  // ========== INVOICE BADGE & DETAILS (RIGHT) ==========
  const rightX = pageWidth - margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...navyDark);
  doc.text("INVOICE", rightX, 14, { align: "right" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...royalBlue);
  const invoiceSubtitle =
    order.status === "approved"
      ? "[ OFFICIAL PAYMENT RECEIPT ]"
      : order.status === "rejected"
      ? "[ INVOICE - PAYMENT REJECTED ]"
      : "[ PAYMENT INVOICE - PENDING REVIEW ]";
  doc.text(invoiceSubtitle, rightX, 19, { align: "right" });

  // Formatted codes
  const invoiceCode = order.invoiceId || `EDN-INV-${order.id.replace("ORD-", "").slice(0, 10).toUpperCase()}`;
  const orderCode = order.id.startsWith("ORD-") ? order.id : `ORD-${order.id}`;

  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  // Dedicated Left/Right alignment columns with ample clearance (starts at 126, left block ends at 86)
  const metaLabelsX = 126;
  const metaValuesX = 148;

  let metaY = 24;
  const metaLineH = 4.5;

  const renderMetaItem = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text(label, metaLabelsX, metaY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...navyDark);
    doc.text(value, metaValuesX, metaY);
    metaY += metaLineH;
  };

  renderMetaItem("Invoice No:", invoiceCode);
  renderMetaItem("Invoice Date:", formattedDate);
  renderMetaItem("Order Ref ID:", orderCode);
  renderMetaItem("Fulfillment:", "Digital / Instant Access");

  // Horizontal divider
  y = 43;
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // ========== TWO-COLUMN BILLING & PAYMENT BOXES ==========
  y += 5;
  const colW = (contentWidth - 6) / 2;
  const boxH = 32;

  // Box 1: Billed To (Customer Details)
  doc.setFillColor(...bgCard);
  doc.roundedRect(margin, y, colW, boxH, 2, 2, "F");
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, y, colW, boxH, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...royalBlue);
  doc.text("BILLED TO / CUSTOMER DETAILS", margin + 5, y + 6);

  doc.setFontSize(9.5);
  doc.setTextColor(...navyDark);
  doc.text(order.userName || "Valued Client", margin + 5, y + 12.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateMuted);
  doc.text(`Email: ${order.userEmail}`, margin + 5, y + 18);
  doc.text(`Customer ID: ${order.userId || "GUEST-USER"}`, margin + 5, y + 23);
  doc.text(`Billing Country: India  |  Delivery: Online Download`, margin + 5, y + 28);

  // Box 2: Payment & Fulfillment Details
  const rightBoxX = margin + colW + 6;
  doc.setFillColor(...bgCard);
  doc.roundedRect(rightBoxX, y, colW, boxH, 2, 2, "F");
  doc.setDrawColor(...borderLight);
  doc.roundedRect(rightBoxX, y, colW, boxH, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...royalBlue);
  doc.text("PAYMENT & TRANSACTION REFERENCE", rightBoxX + 5, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateMuted);

  const valOffset = 24;

  doc.text("Payment Mode:", rightBoxX + 5, y + 12.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navyDark);
  doc.text(order.paymentMethod ? `${order.paymentMethod} / Online Transfer` : "Online UPI / IMPS Transfer", rightBoxX + valOffset, y + 12.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slateMuted);
  doc.text("UTR / Ref No:", rightBoxX + 5, y + 17.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navyDark);
  doc.text(order.utrNumber ? String(order.utrNumber) : "VERIFIED_GATEWAY", rightBoxX + valOffset, y + 17.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slateMuted);
  doc.text("Payment Status:", rightBoxX + 5, y + 22.5);

  // Status Badge (Standard ASCII, no broken checkmarks)
  if (order.status === "approved") {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(rightBoxX + valOffset, y + 19.5, 30, 4.8, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...greenDark);
    doc.setFontSize(7);
    doc.text("PAID & VERIFIED", rightBoxX + valOffset + 2.5, y + 23);
  } else if (order.status === "rejected") {
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(254, 202, 202); // red-200
    doc.roundedRect(rightBoxX + valOffset, y + 19.5, 32, 4.8, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(7);
    doc.text("PAYMENT REJECTED", rightBoxX + valOffset + 2.5, y + 23);
  } else {
    doc.setFillColor(254, 243, 199); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.roundedRect(rightBoxX + valOffset, y + 19.5, 32, 4.8, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(7);
    doc.text("PENDING REVIEW", rightBoxX + valOffset + 2.5, y + 23);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateMuted);
  doc.text("Milestone:", rightBoxX + 5, y + 28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navyDark);
  let milestoneText = "Direct Marketplace Purchase (100% Full Access)";
  if (order.orderType === "advance_payment") milestoneText = "Custom Project: 25% Advance Milestone";
  if (order.orderType === "final_payment") {
    const disc = Number(order.discountApplied ?? (order as any).finalPayment?.discountApplied ?? (order as any).referralDiscount ?? 0);
    milestoneText = disc > 0
      ? `Custom Project: 75% Final (INR ${disc} Referral Disc Applied)`
      : "Custom Project: 75% Final Delivery Milestone";
  }
  doc.text(milestoneText, rightBoxX + valOffset, y + 28);

  y += boxH + 6;

  // ========== ITEMIZED TABLE WITH STRUCTURED GRID ==========
  const tableTop = y;
  const thH = 8;

  // Columns Layout (Fixed widths totaling exactly 180mm)
  const cNoW = 10;       // x0 to x1
  const cDescW = 106;    // x1 to x2
  const cQtyW = 16;      // x2 to x3
  const cRateW = 24;     // x3 to x4
  const cAmtW = 24;      // x4 to x5

  const x0 = margin;          // 15
  const x1 = x0 + cNoW;       // 25
  const x2 = x1 + cDescW;     // 131
  const x3 = x2 + cQtyW;      // 147
  const x4 = x3 + cRateW;     // 171
  const x5 = x4 + cAmtW;      // 195 (pageWidth - margin)

  // Table Header Background
  doc.setFillColor(...slateDark);
  doc.rect(x0, tableTop, contentWidth, thH, "F");

  // Subtle Header Column Dividers
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.3);
  doc.line(x1, tableTop, x1, tableTop + thH);
  doc.line(x2, tableTop, x2, tableTop + thH);
  doc.line(x3, tableTop, x3, tableTop + thH);
  doc.line(x4, tableTop, x4, tableTop + thH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...white);

  doc.text("#", x0 + 4, tableTop + 5.2);
  doc.text("DESCRIPTION OF PROJECT & DELIVERABLES", x1 + 4, tableTop + 5.2);
  doc.text("QTY", x2 + 5, tableTop + 5.2);
  doc.text("RATE (INR)", x4 - 3, tableTop + 5.2, { align: "right" });
  doc.text("AMOUNT (INR)", x5 - 3, tableTop + 5.2, { align: "right" });

  y += thH;

  // Financial Milestone & Totals Calculations
  const discountApplied = Number(
    order.discountApplied ??
    (order as any).finalPayment?.discountApplied ??
    (order as any).referralDiscount ??
    0
  );

  const currentPaid = Number(order.amount) || 0;
  let totalProjectCost = currentPaid;
  let nextTotalToPay = 0;
  let advancePaid = 0;
  let base75Balance = 0;

  const totalCostProp = order.totalProjectPrice || (order as any).totalAmount;

  if (order.orderType === "advance_payment") {
    totalProjectCost = totalCostProp || Math.round((currentPaid + discountApplied) * 4); // 25% Advance Milestone
    advancePaid = currentPaid;
    nextTotalToPay = Math.max(0, totalProjectCost - (currentPaid + discountApplied));
  } else if (order.orderType === "final_payment") {
    totalProjectCost = totalCostProp || Math.round((currentPaid + discountApplied) / 0.75); // 75% Final milestone
    advancePaid = order.advanceAmount || Math.round(totalProjectCost * 0.25);
    base75Balance = Math.max(0, totalProjectCost - advancePaid);
    nextTotalToPay = 0; // Completed
  } else {
    totalProjectCost = totalCostProp || (currentPaid + discountApplied);
    advancePaid = currentPaid;
    nextTotalToPay = 0;
  }

  const fTotalCost = totalProjectCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fPaidAmount = currentPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fAdvancePaid = advancePaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fBase75Balance = base75Balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fDiscountApplied = discountApplied.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fNextToPay = nextTotalToPay.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Table Row (Generous height so text never touches bottom line)
  const rowH = 24;
  doc.setFillColor(...white);
  doc.rect(x0, y, contentWidth, rowH, "F");

  // Grid Borders for Data Row
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.3);
  doc.rect(x0, y, contentWidth, rowH, "S");
  doc.line(x1, y, x1, y + rowH);
  doc.line(x2, y, x2, y + rowH);
  doc.line(x3, y, x3, y + rowH);
  doc.line(x4, y, x4, y + rowH);

  // #
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateDark);
  doc.text("1", x0 + 4, y + 5.5);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...navyDark);
  
  let safeTitle = order.projectTitle || "Curated Engineering Project";
  if (safeTitle.length > 55) safeTitle = safeTitle.substring(0, 52) + "...";
  doc.text(safeTitle, x1 + 4, y + 5.5);

  // Subtitle / Deliverables (Formatted cleanly within the column)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...slateMuted);
  doc.text(`Category: ${String(order.projectCategory || "Engineering").toUpperCase()}  |  Fulfillment: Digital Download`, x1 + 4, y + 10.5);
  doc.text("Deliverables: Complete Source Code, Circuit Diagrams, Report & PPT", x1 + 4, y + 15);
  
  if (discountApplied > 0) {
    doc.setTextColor(...greenDark);
    doc.setFont("helvetica", "bold");
    doc.text(`Referral Discount: - INR ${fDiscountApplied} applied on 75% final payment`, x1 + 4, y + 19.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slateMuted);
  } else {
    doc.text("License: Academic & Research Evaluation Single-User License", x1 + 4, y + 19.5);
  }

  // QTY, Rate, Amount (Decimal aligned numbers)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateDark);
  doc.text("1", x2 + 6, y + 5.5);
  doc.text(fPaidAmount, x4 - 3, y + 5.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text(fPaidAmount, x5 - 3, y + 5.5, { align: "right" });

  y += rowH + 6;

  // ========== AMOUNT IN WORDS & FINANCIAL SUMMARY ==========
  const summaryBlockTop = y;
  const leftSummaryW = 96;
  const rightSummaryW = 78;
  const rightSummaryX = pageWidth - margin - rightSummaryW;

  // Left side: Amount in Words Card (Taller height with generous internal padding so text never touches border)
  const wordsCardH = 26;
  doc.setFillColor(...bgCard);
  doc.roundedRect(margin, summaryBlockTop, leftSummaryW, wordsCardH, 2, 2, "F");
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, summaryBlockTop, leftSummaryW, wordsCardH, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...slateMuted);
  doc.text("TOTAL INVOICE AMOUNT IN WORDS", margin + 5, summaryBlockTop + 6.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...navyDark);
  const words = numberToWords(currentPaid);
  const splitWords = doc.splitTextToSize(words, leftSummaryW - 10);
  doc.text(splitWords, margin + 5, summaryBlockTop + 13.5);

  // Right side: Financial Calculation Breakdown (Decimal aligned)
  let sumY = summaryBlockTop;
  const lineH = 5;

  const renderSummaryRow = (label: string, value: string, isBold: boolean = false, isAccent: boolean = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(isBold ? 8.5 : 7.5);
    doc.setTextColor(isAccent ? royalBlue[0] : isBold ? navyDark[0] : slateMuted[0], isAccent ? royalBlue[1] : isBold ? navyDark[1] : slateMuted[1], isAccent ? royalBlue[2] : isBold ? navyDark[2] : slateMuted[2]);
    doc.text(label, rightSummaryX, sumY + 4);
    doc.text(value, pageWidth - margin, sumY + 4, { align: "right" });
    sumY += lineH;
  };

  if (order.orderType === "final_payment") {
    renderSummaryRow("Total Project Cost:", `INR ${fTotalCost}`);
    renderSummaryRow("Advance Paid (25%):", `INR ${fAdvancePaid}`);
    renderSummaryRow("75% Delivery Balance:", `INR ${fBase75Balance}`);
    if (discountApplied > 0) {
      renderSummaryRow("Referral Reward Discount:", `- INR ${fDiscountApplied}`, false, true);
    }
    renderSummaryRow("Paid Amount (Final 75%):", `INR ${fPaidAmount}`, true);
    renderSummaryRow("Next Total Need to be Paid:", "INR 0.00 (Fully Paid)");
  } else if (order.orderType === "advance_payment") {
    renderSummaryRow("Total Project Cost:", `INR ${fTotalCost}`);
    if (discountApplied > 0) {
      renderSummaryRow("Referral Reward Discount:", `- INR ${fDiscountApplied}`, false, true);
    }
    renderSummaryRow("Paid Amount (25% Advance):", `INR ${fPaidAmount}`, true);
    renderSummaryRow("Next Total Need to be Paid:", `INR ${fNextToPay}`);
    renderSummaryRow("Payment Schedule:", "75% Delivery Balance");
  } else {
    renderSummaryRow("Total Project Cost:", `INR ${fTotalCost}`);
    if (discountApplied > 0) {
      renderSummaryRow("Referral Reward Discount:", `- INR ${fDiscountApplied}`, false, true);
    }
    renderSummaryRow("Paid Amount:", `INR ${fPaidAmount}`, true);
    renderSummaryRow("Next Total Need to be Paid:", "INR 0.00 (Fully Paid)");
    renderSummaryRow("Platform & Processing Fee:", "0.00 (Free)");
  }

  // Total Line with border
  doc.setDrawColor(...navyDark);
  doc.setLineWidth(0.5);
  doc.line(rightSummaryX, sumY + 1, pageWidth - margin, sumY + 1);
  sumY += 2;

  // Grand Total Box
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(rightSummaryX - 2, sumY, rightSummaryW + 2, 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...royalBlue);
  doc.text("TOTAL PAID (INR):", rightSummaryX + 2, sumY + 6);
  doc.setFontSize(10.5);
  doc.text(`INR ${fPaidAmount}`, pageWidth - margin - 2, sumY + 6, { align: "right" });

  y = Math.max(summaryBlockTop + 34, sumY + 13);

  // ========== OFFICIAL STAMP & SIGNATURE SECTION ==========
  // Left: Official Double-Border Paid Seal
  const stampW = 75;
  const stampH = 25;
  const stampX = margin + 2;
  const stampCenterX = stampX + stampW / 2;

  const isApproved = order.status === "approved";
  const isRejected = order.status === "rejected";

  const stampColorDark: [number, number, number] = isApproved
    ? greenDark
    : isRejected
    ? [220, 38, 38] // red-600
    : [180, 83, 9]; // amber-700

  const stampColorLight: [number, number, number] = isApproved
    ? greenEmerald
    : isRejected
    ? [239, 68, 68] // red-500
    : [245, 158, 11]; // amber-500

  doc.setDrawColor(...stampColorDark);
  doc.setLineWidth(0.8);
  doc.roundedRect(stampX, y, stampW, stampH, 2.5, 2.5, "S");
  doc.setDrawColor(...stampColorLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(stampX + 1.2, y + 1.2, stampW - 2.4, stampH - 2.4, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...stampColorDark);
  doc.text(
    isApproved
      ? "EDUNOVA FORGE PLATFORM OFFICIAL VERIFIED"
      : isRejected
      ? "EDUNOVA FORGE PAYMENT VERIFICATION"
      : "EDUNOVA FORGE PAYMENT VERIFICATION",
    stampCenterX,
    y + 6,
    { align: "center" }
  );

  doc.setFontSize(10.5);
  doc.text(
    isApproved
      ? "PAID & DELIVERED"
      : isRejected
      ? "PAYMENT REJECTED"
      : "PENDING VERIFICATION",
    stampCenterX,
    y + 12.5,
    { align: "center" }
  );

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `TXN REF: ${order.utrNumber || (isApproved ? "VERIFIED" : "PENDING")}  |  DATE: ${formattedDate}`,
    stampCenterX,
    y + 17.5,
    { align: "center" }
  );
  doc.text(
    isApproved
      ? "STATUS: 100% DIGITALLY FULFILLED"
      : isRejected
      ? "STATUS: UTR VERIFICATION FAILED"
      : "STATUS: AWAITING ADMIN UTR APPROVAL",
    stampCenterX,
    y + 21.5,
    { align: "center" }
  );

  // Right: Authorized Signatory Block (With REALISTIC VECTOR SIGNATURE and no typed name text)
  const sigX = pageWidth - margin - 65;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...navyDark);
  doc.text("For EDUNOVA FORGE TECHNOLOGIES PVT. LTD.", sigX, y + 4);

  // Generate and embed realistic handwritten digital vector signature stroke
  const sigDataUrl = generateDigitalSignatureDataUrl();
  if (sigDataUrl) {
    try {
      doc.addImage(sigDataUrl, "PNG", sigX + 2, y + 6, 52, 14);
    } catch {
      // Fallback elegant stroke line if canvas fails
      doc.setDrawColor(29, 78, 216);
      doc.setLineWidth(1.2);
      doc.line(sigX + 10, y + 15, sigX + 50, y + 15);
    }
  }

  // Signature Underline
  doc.setDrawColor(...slateLight);
  doc.setLineWidth(0.4);
  doc.line(sigX, y + 21, sigX + 60, y + 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...slateMuted);
  doc.text("Authorized Signatory", sigX + 18, y + 25);

  y += stampH + 7;

  // ========== TERMS & CONDITIONS (OFFICIAL COMPLIANCE - STRICTLY WRAPPED INSIDE BOX) ==========
  const termsBoxH = 26;
  doc.setFillColor(...bgCard);
  doc.roundedRect(margin, y, contentWidth, termsBoxH, 2, 2, "F");
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, y, contentWidth, termsBoxH, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...navyDark);
  doc.text("TERMS & CONDITIONS OF SERVICE:", margin + 5, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...slateMuted);

  const termLines = [
    "1. License: Project deliverables and source code are licensed for educational and academic research evaluation.",
    "2. Delivery: Instant download access is permanently activated on your EduNova Forge student dashboard.",
    "3. Digital Receipt: Official digitally verified payment receipt issued for online engineering project deliverables.",
    "4. Support & Queries: For technical support, deployment, or queries, contact edunovaforgessupport@gmail.com."
  ];

  let termY = y + 9.5;
  const termsTextWidth = contentWidth - 10;

  termLines.forEach(line => {
    const wrapped = doc.splitTextToSize(line, termsTextWidth);
    doc.text(wrapped, margin + 5, termY);
    termY += 4;
  });

  // ========== PROFESSIONAL FOOTER ==========
  const footerY = pageHeight - 10;
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 2.5, pageWidth - margin, footerY - 2.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...slateLight);
  doc.text("This is a computer-generated invoice receipt. No physical signature is required.", margin, footerY);
  doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}  |  Page 1 of 1`, pageWidth - margin, footerY, { align: "right" });

  // ========== DOWNLOAD PDF FILE ==========
  const filename = `EdunovaForge-Invoice-${order.id}.pdf`;

  const blob = doc.output("blob");

  import("@/lib/downloadUtils").then(({ secureApiDownload }) => {
    secureApiDownload(blob, filename, "pdf");
  });
}
