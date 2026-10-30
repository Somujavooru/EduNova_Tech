import { Order } from "@/lib/data/orders";
import * as XLSX from "xlsx";

// Generate proper Excel file from orders
export function downloadOrdersExcel(orders: Order[], filename?: string) {
  const data = orders.map(order => ({
    "Order ID": order.id,
    "Invoice ID": order.invoiceId || `INV-${order.id.replace("ORD-", "")}`,
    "Buyer Name": order.userName,
    "Buyer Email": order.userEmail,
    "Project Name": order.projectTitle,
    "Category": order.projectCategory,
    "Amount (₹)": order.amount,
    "UTR Number": order.utrNumber || "N/A",
    "Payment Method": order.paymentMethod || "UPI",
    "Purchase Date": new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    "Approval Status": order.status.toUpperCase(),
    "Delivery Status": (order.deliveryStatus || (order.status === "approved" ? "delivered" : "pending")).toUpperCase(),
    "Delivery Date": order.deliveredAt
      ? new Date(order.deliveredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "N/A",
    "Last Updated": new Date(order.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  }));

  // Create worksheet and workbook
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

  // Format filename (default to current month/year if not provided)
  let exportName = filename;
  if (!exportName) {
    const monthYear = new Date().toLocaleString("default", { month: "short", year: "numeric" }).replace(/\s/g, "");
    exportName = `EduNova_Forge_Sales_Report_${monthYear}.xlsx`;
  } else if (!exportName.endsWith(".xlsx")) {
    exportName = exportName.replace(/\.csv$/, "") + ".xlsx";
  }

  // Create array buffer from workbook
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  // Use the secure backend API to enforce headers and native browser handling
  import("@/lib/downloadUtils").then(({ secureApiDownload }) => {
    secureApiDownload(blob, exportName, "excel");
  });
}

// Summary report
export function generateSummaryReport(orders: Order[]) {
  const total = orders.length;
  const approved = orders.filter(o => o.status === "approved");
  const pending = orders.filter(o => o.status === "pending");
  const rejected = orders.filter(o => o.status === "rejected");
  const revenue = approved.reduce((sum, o) => sum + o.amount, 0);

  return {
    totalOrders: total,
    approvedOrders: approved.length,
    pendingOrders: pending.length,
    rejectedOrders: rejected.length,
    totalRevenue: revenue,
    averageOrderValue: total > 0 ? Math.round(revenue / approved.length) : 0,
  };
}
