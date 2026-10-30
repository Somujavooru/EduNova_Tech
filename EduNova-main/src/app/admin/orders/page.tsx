"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllOrders,
  updateOrderStatus,
  updateOrderDeliveryStatus,
  deleteOrder,
  Order,
  OrderStatus,
  DeliveryStatus,
  updateOrderBuildStage,
} from "@/lib/data/orders";
import { updateCustomRequestFields } from "@/lib/data/customRequests";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import { generateInvoice } from "@/lib/invoiceGenerator";
import { downloadOrdersExcel } from "@/lib/exportOrders";
import { sendNotification } from "@/lib/notifications";
import { unlockUserReferralCode, unlockReferralReward } from "@/lib/data/referrals";
import { copyToClipboard as safeCopy } from "@/lib/clipboard";
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  IndianRupee,
  FileSpreadsheet,
  Receipt,
  Eye,
  ExternalLink,
  Copy,
  Check,
  Truck,
  PackageCheck,
  AlertTriangle,
  Image as ImageIcon,
  X,
  Filter,
  ArrowUpDown,
  RefreshCw,
  User,
  Mail,
  Hash,
  Tag,
  ShieldAlert,
  Sparkles,
  Rocket,
  Link as LinkIcon,
} from "lucide-react";

function BuildStageBadge({ stage }: { stage?: string }) {
  const config: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
    planning: {
      label: "Planning (25%)",
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
    building: {
      label: "Building (50%)",
      icon: Rocket,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    },
    testing: {
      label: "Testing (75%)",
      icon: Eye,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
    },
    completed: {
      label: "Ready for Delivery",
      icon: PackageCheck,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
    },
    delivered: {
      label: "Delivered (100%)",
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    },
  };
  const c = config[stage || "planning"] || config.planning;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${c.color} ${c.bg} border ${c.border}`}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const config = {
    pending: {
      label: "Pending Approval",
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    },
    approved: {
      label: "Approved",
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    },
    rejected: {
      label: "Rejected",
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${c.color} ${c.bg} border ${c.border}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

function DeliveryBadge({ status }: { status: Order["deliveryStatus"] }) {
  const config = {
    pending: {
      label: "Pending Delivery",
      icon: Truck,
      color: "text-amber-300",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    },
    delivered: {
      label: "Delivered",
      icon: PackageCheck,
      color: "text-emerald-300",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    },
    failed: {
      label: "Delivery Failed",
      icon: AlertTriangle,
      color: "text-red-300",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${c.color} ${c.bg} border ${c.border}`}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "marketplace" | "custom">("all");
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "pending" | "delivered" | "failed">("all");
  const [search, setSearch] = useState("");
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string>("");
  const [imageError, setImageError] = useState(false);
  const [rejectionModalOrder, setRejectionModalOrder] = useState<Order | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      if (u) {
        try {
          const t = await u.getIdToken();
          setAdminToken(t);
        } catch {}
      }
    });
    return () => unsubAuth();
  }, []);

  // Live real-time listener on orders collection
  useEffect(() => {
    let unsub = () => {};

    const fetchOrders = async () => {
      try {
        const orderList = await getAllOrders();
        setOrders(orderList);
        if (previewOrder) {
          const fresh = orderList.find((o) => o.id === previewOrder.id);
          if (fresh) setPreviewOrder(fresh);
        }
      } catch (e) {}
    };

    fetchOrders();

    try {
      unsub = onSnapshot(
        collection(db, "orders"),
        (snap) => {
          const orderList = snap.docs
            .map((d) => ({ ...d.data(), id: d.id } as Order))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setOrders(orderList);
          if (previewOrder) {
            const fresh = orderList.find((o) => o.id === previewOrder.id);
            if (fresh) setPreviewOrder(fresh);
          }
        },
        (err) => {
          console.warn("[AdminOrders] Firestore orders listener notice (using polling):", err?.message);
        }
      );
    } catch (e) {}

    const handleSync = () => fetchOrders();
    window.addEventListener("edunova_orders_updated", handleSync);
    window.addEventListener("storage", handleSync);

    const liveTimer = setInterval(fetchOrders, 3000);

    return () => {
      unsub();
      clearInterval(liveTimer);
      window.removeEventListener("edunova_orders_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [previewOrder?.id]);

  const copyToClipboard = async (text: string, id: string) => {
    if (!text) return;
    await safeCopy(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (order: Order) => {
    setIsActionLoading(order.id);
    const adminEmail = auth.currentUser?.email || "somashekharjavooru@gmail.com";
    try {
      const updated = await updateOrderStatus(order.id, "approved", undefined, adminEmail);
      const isFinalApproval = order.orderType === "final_payment" || order.finalPayment?.status === "pending";
      if (updated) {
        if (isFinalApproval) {
          await updateDoc(doc(db, "orders", order.id), {
            "finalPayment.status": "approved",
            "finalPayment.verifiedAt": new Date().toISOString(),
            deliveryStatus: "delivered",
            buildStage: "delivered",
            deliveredAt: new Date().toISOString(),
          });

          if (order.customRequestId) {
            await updateCustomRequestFields(order.customRequestId, {
              status: "delivered",
              finalPayment: {
                amount: order.finalPayment?.amount || order.balanceAmount || order.amount,
                status: "verified",
                utrNumber: order.finalPayment?.utrNumber || order.utrNumber,
                screenshot: order.finalPayment?.screenshot || order.paymentScreenshot,
                verifiedAt: new Date().toISOString(),
              },
              trackingHistory: [
                {
                  stage: "delivered",
                  label: "Project Delivered & Files Unlocked",
                  progressPercent: 100,
                  notes: "Final 75% payment verified. Google Drive links and project deliverables unlocked.",
                  completedAt: new Date().toISOString(),
                }
              ]
            });
          }
        } else if (order.orderType === "advance_payment" && order.customRequestId) {
          await updateCustomRequestFields(order.customRequestId, {
            status: "planning",
            advancePayment: {
              amount: order.advanceAmount || order.amount,
              status: "verified",
              utrNumber: order.utrNumber,
              screenshot: order.paymentScreenshot,
              verifiedAt: new Date().toISOString(),
            },
            trackingHistory: [
              {
                stage: "planning",
                label: "Project Planning & Architecture",
                progressPercent: 25,
                notes: "25% Advance payment verified. Architecture planning and development initialized.",
                completedAt: new Date().toISOString(),
              }
            ]
          });
        }

        // Unlock referral feature for THIS buyer whenever ANY order is approved
        try {
          await unlockUserReferralCode(order.userId);

          // Credit referrer's reward if this user used a referral link
          let totalProjectValue = order.amount;
          if (order.orderType === "advance_payment") {
            totalProjectValue = order.amount * 4;
            if (order.customRequestId) {
              try {
                const { getCustomRequestById } = await import("@/lib/data/customRequests");
                const reqData = await getCustomRequestById(order.customRequestId);
                if (reqData) {
                  const history = reqData.negotiationHistory || [];
                  const lastOffer = history.length > 0 ? history[history.length - 1] : null;
                  totalProjectValue = lastOffer ? lastOffer.price : (reqData.budget || order.amount * 4);
                }
              } catch (e) {
                console.error("Reward calculation lookup notice:", e);
              }
            }
          }
          unlockReferralReward(order.userId, order.projectId || order.customRequestId || order.id, order.id, totalProjectValue);
        } catch (e) {
          console.error("Referral unlock notice:", e);
        }

        // Notify customer
        sendNotification("payment_approved", {
          userName: order.userName,
          userEmail: order.userEmail,
          orderId: order.id,
          projectTitle: order.projectTitle,
        });

        sendNotification("download_unlocked", {
          userName: order.userName,
          userEmail: order.userEmail,
          orderId: order.id,
          projectTitle: order.projectTitle,
        });
      }
    } catch (e) {
      console.error("Approve order error:", e);
      alert("Failed to approve order: " + ((e as Error)?.message || e));
    } finally {
      setIsActionLoading(null);
      if (previewOrder?.id === order.id) setPreviewOrder(null);
    }
  };

  const openRejectionModal = (order: Order) => {
    setRejectionModalOrder(order);
    setRejectionReasonText("Payment verification failed. Submitted UTR or payment screenshot could not be verified against bank records.");
  };

  const handleConfirmReject = async () => {
    if (!rejectionModalOrder) return;
    const order = rejectionModalOrder;
    const reason = rejectionReasonText.trim() || "Payment verification failed. Submitted UTR or payment proof could not be verified.";
    const adminEmail = auth.currentUser?.email || "somashekharjavooru@gmail.com";

    setIsActionLoading(order.id);
    try {
      const updated = await updateOrderStatus(order.id, "rejected", reason, adminEmail);
      if (updated) {
        if (order.orderType === "advance_payment" && order.customRequestId) {
          await updateCustomRequestFields(order.customRequestId, {
            advancePayment: {
              amount: order.amount,
              status: "rejected",
              utrNumber: order.utrNumber,
              screenshot: order.paymentScreenshot,
            },
          });
        }
        if (order.orderType === "final_payment" && order.customRequestId) {
          await updateCustomRequestFields(order.customRequestId, {
            finalPayment: {
              amount: order.amount,
              status: "rejected",
              utrNumber: order.utrNumber,
              screenshot: order.paymentScreenshot,
            },
          });
        }

        sendNotification("payment_rejected", {
          userName: order.userName,
          userEmail: order.userEmail,
          orderId: order.id,
          projectTitle: order.projectTitle,
        });
      }
      setRejectionModalOrder(null);
    } catch (e) {
      console.error("Reject order error:", e);
      alert("Failed to reject order: " + ((e as Error)?.message || e));
    } finally {
      setIsActionLoading(null);
      if (previewOrder?.id === order.id) setPreviewOrder(null);
    }
  };

  const handleToggleDelivery = async (order: Order) => {
    const nextStatus: DeliveryStatus = order.deliveryStatus === "delivered" ? "pending" : "delivered";
    setIsActionLoading(order.id);
    try {
      await updateOrderDeliveryStatus(order.id, nextStatus);
    } catch (e) {
      console.error("Update delivery status error:", e);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleUpdateStage = async (
    order: Order,
    stage: "planning" | "building" | "testing" | "completed" | "delivered"
  ) => {
    setIsActionLoading(order.id);
    try {
      // 1. Update order buildStage in Firestore
      await updateOrderBuildStage(order.id, stage);

      // 2. If there is a linked custom_requests document, update it & append tracking entry
      if (order.customRequestId) {
        const stageConfig: Record<string, { label: string; progressPercent: number; notes: string }> = {
          planning: {
            label: "Project Planning & Architecture",
            progressPercent: 25,
            notes: "Architecture planning, design specifications, and kickoff completed.",
          },
          building: {
            label: "Core Development & Implementation",
            progressPercent: 50,
            notes: "Developers are actively coding modules and core implementation.",
          },
          testing: {
            label: "Testing & Quality Assurance",
            progressPercent: 75,
            notes: "Quality assurance, unit testing, and edge case validation underway.",
          },
          completed: {
            label: "Project Ready for Delivery",
            progressPercent: 90,
            notes: "Project build complete! Final verification done — ready for delivery upon remaining 75% payment.",
          },
          delivered: {
            label: "Project Delivered & Files Unlocked",
            progressPercent: 100,
            notes: "All project deliverables, source code, and Google Drive links unlocked.",
          },
        };

        const cfg = stageConfig[stage];
        if (cfg) {
          const { getCustomRequestById } = await import("@/lib/data/customRequests");
          const existingReq = await getCustomRequestById(order.customRequestId);
          const history = existingReq?.trackingHistory || [];
          const now = new Date().toISOString();
          const is75Verified = existingReq?.finalPayment?.status === "verified";

          const filtered = history.filter((h) => h.stage !== stage);
          filtered.push({
            stage,
            label: stage === "delivered" && !is75Verified ? "Build Finished (Awaiting 75% Payment)" : cfg.label,
            progressPercent: cfg.progressPercent,
            notes: stage === "delivered" && !is75Verified 
              ? "Project build is 100% complete! Files will unlock immediately upon user completing the 75% final payment."
              : cfg.notes,
            completedAt: now,
          });

          await updateCustomRequestFields(order.customRequestId, {
            status: stage,
            trackingHistory: filtered,
          });
        }
      }

      // 3. Send notification to user
      if (stage === "building") {
        sendNotification("project_started", {
          userEmail: order.userEmail,
          userName: order.userName,
          projectTitle: order.projectTitle,
        });
      } else if (stage === "completed") {
        sendNotification("project_completed", {
          userEmail: order.userEmail,
          userName: order.userName,
          projectTitle: order.projectTitle,
        });
      } else if (stage === "delivered") {
        let is75Verified = false;
        if (order.customRequestId) {
          try {
            const { getCustomRequestById } = await import("@/lib/data/customRequests");
            const linkedReq = await getCustomRequestById(order.customRequestId);
            is75Verified = linkedReq?.finalPayment?.status === "verified";
          } catch {}
        }
        if (is75Verified) {
          sendNotification("download_unlocked", {
            userEmail: order.userEmail,
            userName: order.userName,
            projectTitle: order.projectTitle,
            orderId: order.id,
          });
        } else {
          sendNotification("project_completed", {
            userEmail: order.userEmail,
            userName: order.userName,
            projectTitle: order.projectTitle,
          });
        }
      }
    } catch (e: any) {
      console.error("Error updating stage:", e);
      alert("Failed to update stage: " + (e?.message || e));
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleSaveDriveUrl = async (order: Order, driveUrl: string) => {
    setIsActionLoading(order.id);
    try {
      await updateOrderBuildStage(order.id, order.buildStage || "planning", driveUrl);
      if (order.customRequestId) {
        await updateCustomRequestFields(order.customRequestId, { driveUrl });
      }
      alert("Project delivery link saved successfully!");
    } catch (e: any) {
      console.error("Error saving drive URL:", e);
      alert("Failed to save delivery link: " + (e?.message || e));
    } finally {
      setIsActionLoading(null);
    }
  };

  // KPI Calculations
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;
  const approvedOrdersCount = orders.filter((o) => o.status === "approved").length;
  const rejectedOrdersCount = orders.filter((o) => o.status === "rejected").length;
  const totalRevenue = orders
    .filter((o) => o.status === "approved")
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    // Status filter
    if (statusFilter !== "all" && o.status !== statusFilter) return false;

    // Type filter
    if (typeFilter === "marketplace" && o.orderType && o.orderType !== "marketplace") return false;
    if (typeFilter === "custom" && (!o.orderType || o.orderType === "marketplace")) return false;

    // Delivery filter
    if (deliveryFilter !== "all" && o.deliveryStatus !== deliveryFilter) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (o.projectTitle || "").toLowerCase().includes(q);
      const matchBuyer = (o.userName || "").toLowerCase().includes(q);
      const matchEmail = (o.userEmail || "").toLowerCase().includes(q);
      const matchOrderId = (o.id || "").toLowerCase().includes(q);
      const matchInvoice = (o.invoiceId || "").toLowerCase().includes(q);
      const matchUtr = (o.utrNumber || "").toLowerCase().includes(q);
      const matchCategory = (o.projectCategory || "").toLowerCase().includes(q);
      return matchTitle || matchBuyer || matchEmail || matchOrderId || matchInvoice || matchUtr || matchCategory;
    }

    return true;
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* ── Top Header & Export ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Website Project Orders</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                  {totalOrdersCount} Total
                </span>
              </div>
              <p className="text-gray-400 text-xs md:text-sm mt-0.5">
                Review, approve, and track delivery for all orders placed from the website project catalog.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadOrdersExcel(orders, "EduNova_Forge_Project_Orders.xlsx")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(168,85,247,0.15)]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Orders (Excel)
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Orders */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b1933] via-[#110e24] to-[#0a0817] p-5 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Total Orders</p>
              <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{totalOrdersCount}</h3>
              <p className="text-xs text-gray-400 mt-1">Catalog &amp; milestone purchases</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 2. Pending Verification */}
        <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-[#3b2308] via-[#241505] to-[#120a02] p-5 relative overflow-hidden shadow-[0_8px_30px_rgba(245,158,11,0.2)]">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-amber-500/20 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-amber-300 text-xs uppercase tracking-wider font-bold">Pending Approval</p>
                {pendingOrdersCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>
              <h3 className="text-3xl font-black text-amber-400 mt-1 tracking-tight">{pendingOrdersCount}</h3>
              <p className="text-xs text-amber-200/70 mt-1">Awaiting admin payment verification</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/25 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 3. Approved / Delivered */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0c3827] via-[#072418] to-[#03130d] p-5 relative overflow-hidden shadow-[0_8px_30px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-emerald-300 text-xs uppercase tracking-wider font-semibold">Approved &amp; Delivered</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-1 tracking-tight">{approvedOrdersCount}</h3>
              <p className="text-xs text-emerald-200/70 mt-1">Verified and fulfilled</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 4. Total Verified Revenue */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#092a3b] via-[#051a24] to-[#020d12] p-5 relative overflow-hidden shadow-[0_8px_30px_rgba(6,182,212,0.15)]">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-cyan-300 text-xs uppercase tracking-wider font-semibold">Orders Revenue</p>
              <h3 className="text-2xl md:text-3xl font-black text-cyan-300 mt-1 tracking-tight">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </h3>
              <p className="text-xs text-cyan-200/70 mt-1">From approved purchases</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-[#121026]/90 backdrop-blur-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by project name, buyer name, email, order ID, or UTR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-400 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-400"
          >
            <option value="all" className="bg-[#121026] text-white">All Order Sources</option>
            <option value="marketplace" className="bg-[#121026] text-white">Marketplace Projects Only</option>
            <option value="custom" className="bg-[#121026] text-white">Custom Request Milestones</option>
          </select>

          {/* Delivery Filter */}
          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value as any)}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-400"
          >
            <option value="all" className="bg-[#121026] text-white">All Delivery Statuses</option>
            <option value="pending" className="bg-[#121026] text-white">Pending Delivery</option>
            <option value="delivered" className="bg-[#121026] text-white">Delivered</option>
            <option value="failed" className="bg-[#121026] text-white">Failed</option>
          </select>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === "pending"
                ? "bg-amber-500 text-stone-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "bg-white/5 text-amber-400 hover:bg-amber-500/10"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Approval ({pendingOrdersCount})
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === "approved"
                ? "bg-emerald-500 text-stone-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "bg-white/5 text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Approved ({approvedOrdersCount})
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === "rejected"
                ? "bg-red-500 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                : "bg-white/5 text-red-400 hover:bg-red-500/10"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Rejected ({rejectedOrdersCount})
          </button>
        </div>
      </div>

      {/* ── Orders Listing ────────────────────────────────────────────────── */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121026]/60 backdrop-blur-xl p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Orders Found</h3>
          <p className="text-gray-400 text-xs max-w-md mx-auto">
            {search || statusFilter !== "all" || typeFilter !== "all" || deliveryFilter !== "all"
              ? "No orders match the current filter or search criteria. Try resetting your search filters."
              : "No orders have been submitted yet on the platform."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                order.status === "pending"
                  ? "border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-[#181324] to-[#110e20] shadow-[0_4px_25px_rgba(245,158,11,0.08)]"
                  : order.status === "approved"
                  ? "border-emerald-500/30 bg-gradient-to-r from-emerald-950/15 via-[#121024] to-[#0c0a1a]"
                  : "border-red-500/30 bg-gradient-to-r from-red-950/15 via-[#121024] to-[#0c0a1a]"
              }`}
            >
              {/* Card Header Row */}
              <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start md:items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      order.status === "pending"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : order.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-red-500/20 text-red-300 border border-red-500/40"
                    }`}
                  >
                    <Package className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">{order.projectTitle}</h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {order.projectCategory || "Project"}
                      </span>
                      {(!order.orderType || order.orderType === "marketplace") && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Catalog Purchase
                        </span>
                      )}
                      {order.duplicateUtrWarning && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Duplicate UTR Warning
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="font-mono text-gray-300 flex items-center gap-1">
                        <Hash className="w-3 h-3 text-gray-500" />
                        {order.invoiceId || `INV-${order.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <span>•</span>
                      <span>
                        Placed:{" "}
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recently"}
                      </span>
                      {order.sellerName && (
                        <>
                          <span>•</span>
                          <span>Seller: <strong className="text-gray-300">{order.sellerName}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  {order.orderType === "advance_payment" || order.customRequestId ? (
                    <BuildStageBadge stage={order.buildStage || "planning"} />
                  ) : (
                    <DeliveryBadge status={order.deliveryStatus} />
                  )}
                  <StatusBadge status={order.status} />
                </div>
              </div>

              {/* Card Body Grid */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* 1. Buyer Information */}
                <div className="space-y-1">
                  <p className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold flex items-center gap-1">
                    <User className="w-3 h-3" /> Buyer Details
                  </p>
                  <p className="text-white font-bold text-sm">{order.userName || "Customer"}</p>
                  <p className="text-gray-300 flex items-center gap-1 font-mono text-[11px]">
                    <Mail className="w-3 h-3 text-gray-500" />
                    {order.userEmail}
                  </p>
                  <p className="text-gray-500 text-[10px] font-mono truncate">UID: {order.userId}</p>
                </div>

                {/* 2. Amount & Payment Breakdown (25% Advance Workflow) */}
                <div className="space-y-1">
                  <p className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" /> Amount Breakdown
                  </p>
                  <p className="text-xl font-black text-white tracking-tight">
                    ₹{(order.amount || 0).toLocaleString("en-IN")}
                    <span className="text-[11px] text-gray-400 font-normal ml-1.5">paid</span>
                  </p>
                  {order.totalProjectPrice || order.orderType === "advance_payment" ? (
                    <div className="space-y-0.5 text-[11px] text-gray-400 font-mono">
                      {(() => {
                        const total = order.totalProjectPrice || (order.orderType === "advance_payment" ? Math.round(order.amount * 4) : order.amount);
                        const advance = order.advanceAmount || (order.orderType === "advance_payment" ? order.amount : Math.round(total * 0.25));
                        const isFinalApproved = order.finalPayment?.status === "approved" || order.orderType === "final_payment";
                        const balance = isFinalApproved ? 0 : Math.max(0, total - advance);
                        return (
                          <>
                            <p>Total Project Price: <strong className="text-gray-200">₹{total.toLocaleString("en-IN")}</strong></p>
                            <p className="text-amber-300">25% Advance: ₹{advance.toLocaleString("en-IN")}</p>
                            <p className={isFinalApproved ? "text-emerald-400 font-semibold" : "text-blue-300"}>
                              75% Balance: ₹{balance.toLocaleString("en-IN")} {isFinalApproved ? "✓ Paid" : "(Pending)"}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                  {order.discountApplied && order.discountApplied > 0 ? (
                    <p className="text-emerald-400 text-[11px] font-semibold">
                      Discount applied: ₹{order.discountApplied}
                    </p>
                  ) : null}
                  <p className="text-gray-400 text-[11px]">Method: <strong className="text-gray-200">{order.paymentMethod || "UPI"}</strong></p>
                </div>

                {/* 3. UTR & Transaction Verification */}
                <div className="space-y-1">
                  <p className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                    Transaction / UTR Number
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      {order.utrNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(order.utrNumber, `utr-${order.id}`)}
                      title="Copy UTR"
                      className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedId === `utr-${order.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Order ID: <span className="font-mono text-gray-300">{order.id}</span></p>
                </div>

                {/* 4. Payment Screenshot Proof */}
                <div className="space-y-1.5">
                  <p className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Payment Proof
                  </p>
                  {order.paymentScreenshot ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setImageError(false);
                          setPreviewOrder(order);
                          setIsZoomed(false);
                        }}
                        className="group relative w-16 h-12 rounded-lg overflow-hidden border border-white/20 bg-black/40 hover:border-amber-400 transition-colors shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            order.paymentScreenshot?.startsWith("data:image/")
                              ? order.paymentScreenshot
                              : `/api/admin/payments/screenshot?orderId=${order.id}${adminToken ? `&token=${adminToken}` : ""}`
                          }
                          alt="Screenshot Proof"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setImageError(false);
                          setPreviewOrder(order);
                          setIsZoomed(false);
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300 underline font-medium flex items-center gap-1"
                      >
                        Inspect Proof <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs italic">No screenshot provided</p>
                  )}
                </div>
              </div>

              {/* Build Stage Controls for Build-on-Order / Advance Payment Orders */}
              {(order.orderType === "advance_payment" || order.customRequestId || order.buildStage) && (
                <div className="mx-5 mb-4 p-4 rounded-xl bg-purple-950/20 border border-purple-500/25 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Project Build Stage &amp; Progress
                      </span>
                      <BuildStageBadge stage={order.buildStage || "planning"} />
                    </div>
                    <span className="text-[11px] text-gray-400">
                      Live sync with user dashboard &amp; milestone tracker
                    </span>
                  </div>

                  {/* Stage Advance Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateStage(order, "planning")}
                      disabled={isActionLoading === order.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        (order.buildStage || "planning") === "planning"
                          ? "bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                          : "bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      1. Planning (25%)
                    </button>

                    <button
                      onClick={() => handleUpdateStage(order, "building")}
                      disabled={isActionLoading === order.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        order.buildStage === "building"
                          ? "bg-amber-500 text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.4)] font-black"
                          : "bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      2. Building (50%)
                    </button>

                    <button
                      onClick={() => handleUpdateStage(order, "testing")}
                      disabled={isActionLoading === order.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        order.buildStage === "testing"
                          ? "bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                          : "bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      3. Testing (75%)
                    </button>

                    <button
                      onClick={() => handleUpdateStage(order, "completed")}
                      disabled={isActionLoading === order.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        order.buildStage === "completed"
                          ? "bg-cyan-500 text-stone-950 shadow-[0_0_12px_rgba(6,182,212,0.4)] font-black"
                          : "bg-white/5 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/10"
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      4. Ready for Delivery (Prompts User for 75%)
                    </button>

                    <button
                      onClick={() => handleUpdateStage(order, "delivered")}
                      disabled={isActionLoading === order.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        order.buildStage === "delivered"
                          ? "bg-emerald-500 text-stone-950 shadow-[0_0_12px_rgba(16,185,129,0.4)] font-black"
                          : "bg-white/5 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10"
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      5. Delivered (100%)
                    </button>
                  </div>

                  {/* Project Delivery URL (Google Drive) */}
                  <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Google Drive Download URL (https://drive.google.com/...)"
                        defaultValue={order.driveUrl || ""}
                        id={`drive-input-${order.id}`}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const inputEl = document.getElementById(`drive-input-${order.id}`) as HTMLInputElement;
                        if (inputEl) {
                          handleSaveDriveUrl(order, inputEl.value.trim());
                        }
                      }}
                      disabled={isActionLoading === order.id}
                      className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Delivery Link
                    </button>
                  </div>
                </div>
              )}

              {/* Card Actions Footer */}
              <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateInvoice(order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                    Download Invoice
                  </button>

                  <button
                    onClick={() => handleToggleDelivery(order)}
                    disabled={isActionLoading === order.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                    {order.deliveryStatus === "delivered" ? "Mark Pending Delivery" : "Mark Delivered"}
                  </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {order.status === "pending" && (
                    <>
                      <button
                        onClick={() => openRejectionModal(order)}
                        disabled={isActionLoading === order.id}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject Payment
                      </button>

                      <button
                        onClick={() => handleApprove(order)}
                        disabled={isActionLoading === order.id}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 text-stone-950 text-xs font-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02]"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve Payment
                      </button>
                    </>
                  )}

                  {order.status === "approved" && (
                    <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5" /> Verified &amp; Active
                    </span>
                  )}

                  {order.status === "rejected" && (
                    <span className="text-red-400 text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                      <XCircle className="w-3.5 h-3.5" /> Rejected by Admin
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Payment Proof & Order Inspection Modal ────────────────────────── */}
      <AnimatePresence>
        {previewOrder && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setPreviewOrder(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#121026] border border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Order Inspection:</span>
                    <span className="text-indigo-300 font-mono text-sm">{previewOrder.id}</span>
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {previewOrder.projectTitle} • Amount: ₹{(previewOrder.amount || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewOrder(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Order Details Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase">Buyer</span>
                    <p className="text-white font-bold">{previewOrder.userName}</p>
                    <p className="text-gray-400 text-[11px] truncate">{previewOrder.userEmail}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase">Verified Amount Paid</span>
                    <p className="text-white font-bold text-base">₹{(previewOrder.amount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase">UTR Number</span>
                    <p className="text-amber-300 font-mono font-bold">{previewOrder.utrNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase">Payment Status</span>
                    <div className="mt-1">
                      <StatusBadge status={previewOrder.status} />
                    </div>
                  </div>
                </div>

                {/* 25% Advance / 75% Balance Breakdown Box */}
                {(previewOrder.totalProjectPrice || previewOrder.orderType === "advance_payment") && (
                  <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs">
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase block">Total Project Price</span>
                      <span className="font-bold text-white text-sm">
                        ₹{(previewOrder.totalProjectPrice || (previewOrder.orderType === "advance_payment" ? Math.round(previewOrder.amount / 0.25) : previewOrder.amount)).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-400 text-[10px] uppercase block">Required 25% Advance</span>
                      <span className="font-bold text-amber-300 text-sm">
                        ₹{(previewOrder.advanceAmount || (previewOrder.orderType === "advance_payment" ? previewOrder.amount : Math.round((previewOrder.totalProjectPrice || previewOrder.amount) * 0.25))).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-cyan-400 text-[10px] uppercase block">Remaining 75% Balance</span>
                      <span className="font-bold text-cyan-300 text-sm">
                        ₹{(previewOrder.balanceAmount ?? (previewOrder.orderType === "advance_payment" ? Math.round(previewOrder.amount / 0.25) - previewOrder.amount : 0)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Screenshot Viewer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      Uploaded Payment Proof Screenshot
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsZoomed(!isZoomed)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                      >
                        {isZoomed ? "Reset Zoom" : "Toggle 2x Zoom"}
                      </button>
                      <button
                        onClick={() => {
                          const fullUrl = previewOrder.paymentScreenshot?.startsWith("data:image/")
                            ? previewOrder.paymentScreenshot
                            : `/api/admin/payments/screenshot?orderId=${previewOrder.id}${adminToken ? `&token=${adminToken}` : ""}`;
                          window.open(fullUrl, "_blank");
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Open Full
                      </button>
                    </div>
                  </div>

                  <div className="w-full rounded-xl bg-black/60 border border-white/10 p-2 flex items-center justify-center overflow-auto max-h-[450px]">
                    {previewOrder.paymentScreenshot ? (
                      imageError ? (
                        <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
                          <AlertTriangle className="w-8 h-8 text-amber-400" />
                          <p className="text-xs text-white font-medium">Payment Proof Unavailable</p>
                          <p className="text-[11px] text-gray-500">Image could not be retrieved. Please verify with UTR.</p>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={
                            previewOrder.paymentScreenshot?.startsWith("data:image/")
                              ? previewOrder.paymentScreenshot
                              : `/api/admin/payments/screenshot?orderId=${previewOrder.id}${adminToken ? `&token=${adminToken}` : ""}`
                          }
                          alt="Payment Proof"
                          onError={() => setImageError(true)}
                          className={`rounded-lg object-contain transition-all duration-300 ${
                            isZoomed ? "max-w-none scale-150 cursor-zoom-out" : "max-h-[420px] cursor-zoom-in"
                          }`}
                          onClick={() => setIsZoomed(!isZoomed)}
                        />
                      )
                    ) : (
                      <p className="text-gray-500 py-12">No screenshot proof uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
                <button
                  onClick={() => generateInvoice(previewOrder)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold"
                >
                  <Receipt className="w-4 h-4 text-cyan-400" /> Download Invoice
                </button>

                <div className="flex items-center gap-3">
                  {previewOrder.status === "pending" && (
                    <>
                      <button
                        onClick={() => openRejectionModal(previewOrder)}
                        disabled={isActionLoading === previewOrder.id}
                        className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20"
                      >
                        Reject Payment
                      </button>
                      <button
                        onClick={() => handleApprove(previewOrder)}
                        disabled={isActionLoading === previewOrder.id}
                        className="px-5 py-2 rounded-xl bg-emerald-500 text-stone-950 text-xs font-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      >
                        Approve Payment
                      </button>
                    </>
                  )}
                  {previewOrder.status !== "pending" && (
                    <button
                      onClick={() => setPreviewOrder(null)}
                      className="px-5 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Payment Rejection Modal (Mandatory Rejection Reason) ─────────── */}
        {rejectionModalOrder && (
          <div
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setRejectionModalOrder(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#130d1d] border border-red-500/40 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] relative text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Reject Payment Submission</h3>
                    <p className="text-[11px] text-gray-400">Order ID: {rejectionModalOrder.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectionModalOrder(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Order Context */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs space-y-1 mb-4">
                <p className="text-white font-semibold">{rejectionModalOrder.projectTitle}</p>
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>Customer: <strong className="text-gray-200">{rejectionModalOrder.userName}</strong></span>
                  <span>Amount Paid: <strong className="text-amber-300">₹{rejectionModalOrder.amount}</strong></span>
                </div>
                <p className="text-gray-400 text-[11px] font-mono">UTR: {rejectionModalOrder.utrNumber}</p>
              </div>

              {/* Quick Preset Reasons */}
              <div className="space-y-1.5 mb-3">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Select Common Rejection Reason
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Submitted UTR not found in bank statement",
                    "Payment amount does not match required 75% advance",
                    "Payment screenshot is blurry or invalid",
                    "Transaction reversed or failed in UPI gateway",
                    "Duplicate transaction reference submitted",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReasonText(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left ${
                        rejectionReasonText === preset
                          ? "bg-red-500/20 border-red-500/50 text-red-200 font-bold"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for explanation */}
              <div className="space-y-1.5 mb-5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Rejection Reason (Visible to Customer)
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder="Explain why the payment cannot be verified so the student can correct their submission..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-gray-500">
                  This note will be shown on the user's dashboard and notification feed so they can resubmit valid payment proof.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRejectionModalOrder(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isActionLoading === rejectionModalOrder.id || !rejectionReasonText.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isActionLoading === rejectionModalOrder.id ? "Rejecting..." : "Confirm & Reject Payment"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
