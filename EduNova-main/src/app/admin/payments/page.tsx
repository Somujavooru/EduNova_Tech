"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllOrders, updateOrderStatus, deleteOrder, clearAllOrders, Order } from "@/lib/data/orders";
import { updateCustomRequestFields } from "@/lib/data/customRequests";
import { Trash2, CheckCircle, ExternalLink, RefreshCw, IndianRupee, ShieldAlert, Package, Calendar, Clock, CreditCard, ChevronDown, ChevronUp, Check, XCircle, Eye, Image as ImageIcon, X, Search, Receipt, FolderDown, FileSpreadsheet, Hash } from "lucide-react";
import { doc, getDoc, updateDoc, writeBatch, collection, deleteDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { generateInvoice } from "@/lib/invoiceGenerator";
import { downloadOrdersExcel } from "@/lib/exportOrders";
import { sendNotification } from "@/lib/notifications";

function StatusBadge({ status }: { status: Order["status"] }) {
  const config = {
    pending: { label: "Pending", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    approved: { label: "Approved", icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
    rejected: { label: "Rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.color} ${c.bg} border ${c.border}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const handleOpenScreenshot = async (order: Order) => {
    setImageError(false);
    setIsZoomed(false);
    setIsLoadingImage(true);
    setPreviewImage("/loading"); // Open modal immediately

    try {
      if (order.paymentScreenshot?.startsWith("data:image/")) {
        setPreviewImage(order.paymentScreenshot);
        setIsLoadingImage(false);
        return;
      }

      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : "";
      const endpoint = `/api/admin/payments/screenshot?orderId=${order.id}${token ? `&token=${token}` : ""}`;
      setPreviewImage(endpoint);
    } catch (err) {
      console.error("Failed to acquire token for screenshot:", err);
      setImageError(true);
    } finally {
      setIsLoadingImage(false);
    }
  };

  const refresh = async () => setOrders(await getAllOrders());

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      const orderList = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as Order))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setOrders(orderList);
    }, (err) => {
      console.warn("[AdminPayments] Firestore notice:", err);
    });

    return () => unsub();
  }, []);

  const handleApprove = async (id: string) => {
    const order = await updateOrderStatus(id, "approved");
    if (order) {
      if (order.orderType === "advance_payment" && order.customRequestId) {
        await updateCustomRequestFields(order.customRequestId, {
          status: "planning",
          advancePayment: { amount: order.amount, status: "verified", utrNumber: order.utrNumber, screenshot: order.paymentScreenshot, verifiedAt: new Date().toISOString() },
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

      if (order.orderType === "final_payment" && order.customRequestId) {
        await updateCustomRequestFields(order.customRequestId, {
          status: "delivered",
          finalPayment: { amount: order.amount, status: "verified", utrNumber: order.utrNumber, screenshot: order.paymentScreenshot, verifiedAt: new Date().toISOString() },
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

      // Unlock referral code feature for THIS buyer whenever ANY order is approved
      try {
        const { unlockUserReferralCode, unlockReferralReward } = await import("@/lib/data/referrals");
        await unlockUserReferralCode(order.userId);

        // Compute actual total project value for reward calculation
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
              console.error("Failed to look up custom request for reward calc:", e);
            }
          }
        }

        unlockReferralReward(order.userId, order.customRequestId || order.projectId, order.id, totalProjectValue);
      } catch (err) {
        console.error("Failed to process referral unlock for user:", err);
      }

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
    refresh();
  };

  const handleReject = async (id: string) => {
    const order = await updateOrderStatus(id, "rejected");
    if (order) {
      if (order.orderType === "advance_payment" && order.customRequestId) {
        await updateCustomRequestFields(order.customRequestId, {
          advancePayment: { amount: order.amount, status: "rejected", utrNumber: order.utrNumber, screenshot: order.paymentScreenshot }
        });
      }
      if (order.orderType === "final_payment" && order.customRequestId) {
        await updateCustomRequestFields(order.customRequestId, {
          finalPayment: { amount: order.amount, status: "rejected", utrNumber: order.utrNumber, screenshot: order.paymentScreenshot }
        });
      }

      sendNotification("payment_rejected", {
        userName: order.userName,
        userEmail: order.userEmail,
        orderId: order.id,
        projectTitle: order.projectTitle,
      });
    }
    refresh();
  };

  const filtered = orders.filter(o => {
    const matchFilter = filter === "all" || o.status === filter;
    const matchSearch = o.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
                        o.userName.toLowerCase().includes(search.toLowerCase()) ||
                        o.id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalRevenue = orders.filter(o => o.status === "approved").reduce((s, o) => s + o.amount, 0);
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const approvedCount = orders.filter(o => o.status === "approved").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Payment Verification</h1>
            <p className="text-gray-500 text-xs">Approve or reject payment screenshots</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadOrdersExcel(orders, "EduNova_User_Orders.xlsx")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-neon-purple)]/10 border border-[var(--color-neon-purple)]/30 text-[var(--color-neon-purple)] text-xs font-bold hover:bg-[var(--color-neon-purple)]/20 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={async () => {
              await clearAllOrders();
              setOrders([]);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Orders
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-[#422509] via-[#2b1705] to-[#160b02] p-5 flex items-center gap-4 shadow-[0_8px_30px_rgba(245,158,11,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-amber-500/20 pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-amber-500/25 border border-amber-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] relative z-10">
            <Clock className="w-6 h-6 text-amber-300" />
          </div>
          <div className="relative z-10">
            <p className="text-amber-200/70 text-xs uppercase tracking-wider font-semibold">Pending Verification</p>
            <p className="text-3xl font-black text-amber-300 tracking-tight">{pendingCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-[#0d402b] via-[#08291b] to-[#04140d] p-5 flex items-center gap-4 shadow-[0_8px_30px_rgba(16,185,129,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-emerald-500/20 pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] relative z-10">
            <CheckCircle className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-200/70 text-xs uppercase tracking-wider font-semibold">Approved Orders</p>
            <p className="text-3xl font-black text-emerald-300 tracking-tight">{approvedCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-purple-500/40 bg-gradient-to-br from-[#2a1347] via-[#1a0c2e] to-[#0e051a] p-5 flex items-center gap-4 shadow-[0_8px_30px_rgba(168,85,247,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-purple-500/20 pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-purple-500/25 border border-purple-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] relative z-10">
            <IndianRupee className="w-6 h-6 text-purple-200" />
          </div>
          <div className="relative z-10">
            <p className="text-purple-200/70 text-xs uppercase tracking-wider font-semibold">Total Revenue</p>
            <p className="text-3xl font-black text-purple-200 tracking-tight">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#101026]/80 to-indigo-950/40 border border-purple-500/30 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/60" />
          <input
            type="text"
            placeholder="Search by project, buyer, or order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-purple-500/20 text-white placeholder-purple-200/40 text-sm focus:outline-none focus:border-purple-400 focus:bg-purple-950/30 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map(f => {
            const activeColors = {
              all: "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border-indigo-400",
              pending: "bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-400",
              approved: "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-400",
              rejected: "bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border-rose-400",
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                  filter === f
                    ? activeColors[f]
                    : "bg-white/[0.04] text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-5">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-purple-500/30 bg-gradient-to-br from-[#1a0e2e]/90 to-[#0c0517]/95 p-12 text-center text-gray-400 shadow-lg">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-purple-400/60" />
              <p className="text-base font-semibold">No {filter === "all" ? "" : filter} payments found.</p>
            </div>
          ) : (
            filtered.map((order, i) => {
              const PAYMENT_CARD_THEMES = [
                // 0: Cyber Violet / Magenta
                {
                  bg: "bg-gradient-to-br from-[#2a1347]/95 via-[#1a0c2e]/95 to-[#0e051a]/98",
                  border: "border-purple-500/45 hover:border-purple-400",
                  shadow: "shadow-[0_12px_35px_rgba(168,85,247,0.16)]",
                  glow: "bg-purple-500/20",
                  priceGradient: "from-purple-300 via-pink-300 to-amber-200",
                },
                // 1: Electric Ocean / Cyan
                {
                  bg: "bg-gradient-to-br from-[#0e2f52]/95 via-[#081e35]/95 to-[#040f1c]/98",
                  border: "border-cyan-500/45 hover:border-cyan-400",
                  shadow: "shadow-[0_12px_35px_rgba(6,182,212,0.16)]",
                  glow: "bg-cyan-500/20",
                  priceGradient: "from-cyan-300 via-sky-300 to-indigo-200",
                },
                // 2: Vivid Emerald / Jade
                {
                  bg: "bg-gradient-to-br from-[#0d402b]/95 via-[#08291b]/95 to-[#04140d]/98",
                  border: "border-emerald-500/45 hover:border-emerald-400",
                  shadow: "shadow-[0_12px_35px_rgba(16,185,129,0.16)]",
                  glow: "bg-emerald-500/20",
                  priceGradient: "from-emerald-300 via-teal-300 to-green-200",
                },
                // 3: Warm Sunset Amber / Bronze
                {
                  bg: "bg-gradient-to-br from-[#422509]/95 via-[#2b1705]/95 to-[#160b02]/98",
                  border: "border-amber-500/45 hover:border-amber-400",
                  shadow: "shadow-[0_12px_35px_rgba(245,158,11,0.16)]",
                  glow: "bg-amber-500/20",
                  priceGradient: "from-amber-300 via-yellow-300 to-orange-200",
                },
              ];
              const theme = PAYMENT_CARD_THEMES[i % PAYMENT_CARD_THEMES.length];

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-2xl border-2 p-6 relative overflow-hidden backdrop-blur-xl transition-all duration-300 hover:scale-[1.008] ${theme.bg} ${theme.border} ${theme.shadow}`}
                >
                  {/* Atmospheric Glow Orb */}
                  <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${theme.glow}`} />

                  {/* Top Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 relative z-10">
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">{order.projectTitle}</h3>
                      <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                        <span className="text-[11px] text-gray-400 font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10">{order.id}</span>
                        <StatusBadge status={order.status} />
                        {order.orderType === "advance_payment" && (
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-500/25 text-purple-200 border border-purple-400/40 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            Advance (25%)
                          </span>
                        )}
                        {order.orderType === "final_payment" && (
                          <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            Final (75%)
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.priceGradient} drop-shadow-md`}>
                      ₹{order.amount.toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 text-xs mb-5 relative z-10">
                    <div className="p-3 rounded-xl bg-black/35 border border-white/10 shadow-inner">
                      <p className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold mb-1">Buyer</p>
                      <p className="text-white font-bold truncate">{order.userName}</p>
                      <p className="text-gray-400 text-[11px] truncate">{order.userEmail}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-inner">
                      <p className="text-amber-300/80 uppercase tracking-wider text-[10px] font-semibold mb-1">UTR Number</p>
                      <p className="text-amber-300 font-mono font-bold text-sm flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" />
                        {order.utrNumber || "N/A"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-black/35 border border-white/10 shadow-inner">
                      <p className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold mb-1">Curated By</p>
                      <p className="text-gray-200 font-medium">EduNova Team</p>
                    </div>
                    <div className="p-3 rounded-xl bg-black/35 border border-white/10 shadow-inner">
                      <p className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold mb-1">Category</p>
                      <p className="text-gray-200 capitalize font-medium">{order.projectCategory}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-black/35 border border-white/10 shadow-inner">
                      <p className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold mb-1">Date & Time</p>
                      <p className="text-gray-200 font-medium whitespace-nowrap">{new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/10 relative z-10">
                    <button
                      onClick={() => handleOpenScreenshot(order)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-bold hover:bg-purple-500/30 transition-all shadow-sm"
                    >
                      <Eye className="w-4 h-4" /> View Screenshot
                    </button>

                    {order.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(order.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-stone-950 text-xs font-black transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(order.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold hover:bg-red-500/30 transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                    {order.status === "approved" && (
                      <>
                        <button
                          onClick={() => generateInvoice(order)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-xs font-bold hover:bg-indigo-500/30 transition-colors"
                        >
                          <Receipt className="w-4 h-4" /> Download Invoice
                        </button>
                        <span className="text-green-400 text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                          <CheckCircle className="w-4 h-4" /> Delivered
                        </span>
                      </>
                    )}
                    {order.status === "rejected" && (
                      <span className="text-red-400 text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                        <XCircle className="w-4 h-4" /> Rejected
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Screenshot Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-hidden"
            onClick={() => { setPreviewImage(null); setIsZoomed(false); setImageError(false); }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className={`relative w-full rounded-2xl border border-white/10 bg-[#0a0a1a] flex flex-col transition-all duration-300 ${isZoomed ? 'max-w-[95vw]' : 'max-w-2xl'}`}
              style={{ maxHeight: '95vh' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-[#0a0a1a] rounded-t-2xl z-10 sticky top-0">
                <h3 className="text-white font-bold">Payment Proof</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsZoomed(!isZoomed)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    {isZoomed ? "Zoom Out" : "Zoom In"}
                  </button>
                  <button onClick={() => {
                    if (previewImage && previewImage !== "/loading") {
                      window.open(previewImage, "_blank");
                    }
                  }} className="text-gray-400 hover:text-[var(--color-neon-blue)] p-1.5 rounded-lg hover:bg-[var(--color-neon-blue)]/10 transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-transparent hover:border-[var(--color-neon-blue)]/30">
                    Open Full
                  </button>
                  <button onClick={() => { setPreviewImage(null); setIsZoomed(false); setImageError(false); }} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className={`p-4 overflow-auto custom-scrollbar flex-1 min-h-0 bg-transparent flex justify-center ${isZoomed ? 'items-start' : 'items-center'}`}>
                {isLoadingImage || previewImage === "/loading" ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                    <p className="text-xs">Loading secure payment proof...</p>
                  </div>
                ) : imageError ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-amber-400" />
                    </div>
                    <p className="text-sm font-bold text-white">Payment Proof Unavailable</p>
                    <p className="text-xs text-gray-400 max-w-sm text-center">Unable to load payment screenshot. Please verify payment using the customer UTR number.</p>
                  </div>
                ) : (
                  <img
                    src={previewImage || ""}
                    alt="Payment Screenshot"
                    onError={() => setImageError(true)}
                    className={`w-full h-auto object-contain rounded-lg transition-transform duration-300 ${isZoomed ? 'max-h-none' : 'max-h-full'}`}
                    onClick={() => setIsZoomed(!isZoomed)}
                    style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
