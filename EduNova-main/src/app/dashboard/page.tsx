"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getOrdersByUser, Order, createOrder, DuplicateUtrError, resubmitOrderPayment } from "@/lib/data/orders";
import { getUserCustomRequests, CustomRequest, CustomRequestStatus, addNegotiationOffer, updateCustomRequestStatus, updateCustomRequestFields } from "@/lib/data/customRequests";
import { generateInvoice } from "@/lib/invoiceGenerator";
import { sendNotification, getUserNotifications } from "@/lib/notifications";
import { compressImage } from "@/lib/imageUtils";
import { getReferralsByUser, Referral } from "@/lib/data/referrals";
import { getUserInquiries, ContactMessage } from "@/lib/data/contact";
import { ProjectTracker, DEFAULT_MILESTONES, BUILD_MILESTONES } from "@/components/ui/ProjectTracker";
import { copyToClipboard } from "@/lib/clipboard";
import { getPlatformSettings, getEffectiveQrCodeUrl } from "@/lib/data/settings";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, FileQuestion, Loader2, MessageSquare, Send, IndianRupee, Rocket, Truck, Upload, Gift, Share2, Copy, Shield,
  RefreshCw, X, Clock, CheckCircle, XCircle, Eye, Package, FolderDown, Download, Receipt, Bell, FileText, ShoppingCart, AlertTriangle, Hash
} from "lucide-react";
import { ProjectDeliverablesSection } from "@/components/ui/ProjectDeliverablesSection";

function StatusBadge({ status }: { status: Order["status"] }) {
  const config = {
    pending: { label: "Payment Verification Pending", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    approved: { label: "Payment Approved", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    rejected: { label: "Payment Rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c.color} ${c.bg} border ${c.border}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

function DeliveryBadge({ status }: { status: Order["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/30">
        <CheckCircle className="w-3 h-3" /> Delivered
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/30">
        <Clock className="w-3 h-3" /> Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/30">
      <XCircle className="w-3 h-3" /> Failed
    </span>
  );
}

function BuildStageBadge({ stage }: { stage?: string }) {
  const config: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
    planning: { label: "Planning (25%)", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    building: { label: "Building (50%)", icon: Rocket, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    testing: { label: "Testing (75%)", icon: Eye, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
    completed: { label: "Ready for Delivery", icon: Package, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
    delivered: { label: "Delivered (100%)", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  };
  const c = config[stage || "planning"] || config.planning;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.color} ${c.bg} border ${c.border}`}>
      <Icon className="w-3 h-3" /> {c.label}
    </span>
  );
}

function getReqStatusBadge(status: CustomRequestStatus) {
  switch (status) {
    case "pending": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/30"><Clock className="w-3 h-3" /> Pending</span>;
    case "reviewing": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 border border-blue-500/30"><Eye className="w-3 h-3" /> Reviewing</span>;
    case "offer_sent": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/30"><Bell className="w-3 h-3 animate-bounce" /> Action Required</span>;
    case "counter_offered": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-pink-400 bg-pink-500/10 border border-pink-500/30"><MessageSquare className="w-3 h-3" /> Counter Sent</span>;
    case "negotiating": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/30"><MessageSquare className="w-3 h-3" /> Negotiating</span>;
    case "awaiting_final_approval": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/30"><Clock className="w-3 h-3 animate-pulse" /> Awaiting Final Approval</span>;
    case "accepted": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-green-400 bg-green-500/10 border border-green-500/30"><CheckCircle className="w-3 h-3" /> Accepted</span>;
    case "planning": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 border border-blue-500/30"><FileText className="w-3 h-3" /> Planning</span>;
    case "building": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/25"><Rocket className="w-3 h-3" /> Building</span>;
    case "development": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/25"><Rocket className="w-3 h-3 animate-pulse" /> Development</span>;
    case "testing": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/30"><Eye className="w-3 h-3" /> Testing</span>;
    case "final_review": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 border border-blue-500/30"><Eye className="w-3 h-3" /> Final Review</span>;
    case "in_progress": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/25"><Clock className="w-3 h-3 animate-spin-slow" /> In Progress</span>;
    case "completed": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-teal-400 bg-teal-500/10 border border-teal-500/25"><Package className="w-3 h-3" /> Completed</span>;
    case "delivered": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-green-400 bg-green-500/10 border border-green-500/30"><Truck className="w-3 h-3" /> Delivered</span>;
    case "rejected": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-red-400 bg-red-500/10 border border-red-500/30"><XCircle className="w-3 h-3" /> Rejected</span>;
    default: return null;
  }
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      router.replace("/admin");
    }
  }, [user, loading, router]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [userInquiries, setUserInquiries] = useState<ContactMessage[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Negotiation State
  const [selectedReq, setSelectedReq] = useState<CustomRequest | null>(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [isUpdatingOffer, setIsUpdatingOffer] = useState(false);

  // Payment states
  const [paymentUtr, setPaymentUtr] = useState("");
  const [paymentScreenshotBase64, setPaymentScreenshotBase64] = useState("");
  const [paymentScreenshotName, setPaymentScreenshotName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Live Platform Settings
  const [platformSettings, setPlatformSettings] = useState(getPlatformSettings());

  // Notice & Re-submit Modal States
  const [selectedNoticeModal, setSelectedNoticeModal] = useState<any | null>(null);
  const [resubmitOrderModal, setResubmitOrderModal] = useState<Order | null>(null);
  const [selectedCatalogFinalOrder, setSelectedCatalogFinalOrder] = useState<Order | null>(null);
  const [resubmitUtr, setResubmitUtr] = useState("");
  const [resubmitProof, setResubmitProof] = useState("");
  const [resubmitFileName, setResubmitFileName] = useState("");
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState("");
  const resubmitFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => setPlatformSettings(getPlatformSettings());
    window.addEventListener("edunova_settings_updated", sync);
    return () => window.removeEventListener("edunova_settings_updated", sync);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let unsubOrders = () => {};
    let unsubReqs = () => {};

    const fetchOrdersAndRequests = async () => {
      setFetchError(null);
      try {
        const [o, reqs, refs] = await Promise.all([
          getOrdersByUser(user.id).catch(() => []),
          getUserCustomRequests(user.id).catch(() => []),
          getReferralsByUser(user.id).catch(() => []),
        ]);
        setOrders(o);
        setCustomRequests(reqs);
        setSelectedReq((prev) => (prev ? reqs.find((r) => r.id === prev.id) || prev : null));
        setReferrals(refs);
        setIsLoadingRequests(false);
      } catch (err: any) {
        console.warn("[Dashboard] Notice fetching fresh data:", err?.message || err);
        setIsLoadingRequests(false);
      }
    };

    // Initial fetch
    fetchOrdersAndRequests();

    // 1. Real-time Firestore Listener for User Orders
    try {
      const qOrders = query(collection(db, "orders"), where("userId", "==", user.id));
      unsubOrders = onSnapshot(
        qOrders,
        (snap) => {
          const list = snap.docs
            .map((d) => ({ ...d.data(), id: d.id } as Order))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setOrders(list);
        },
        (err) => {
          console.warn("[Dashboard] Orders live snapshot notice (using live polling):", err?.message);
        }
      );
    } catch (e) {}

    // 2. Real-time Firestore Listener for User Custom Requests
    try {
      const qReqs = query(collection(db, "custom_requests"), where("userId", "==", user.id));
      unsubReqs = onSnapshot(
        qReqs,
        (snap) => {
          const list = snap.docs
            .map((d) => ({ ...d.data(), id: d.id } as CustomRequest))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setCustomRequests(list);
          setSelectedReq((prev) => (prev ? list.find((r) => r.id === prev.id) || prev : null));
          setIsLoadingRequests(false);
        },
        (err) => {
          console.warn("[Dashboard] Requests live snapshot notice (using live polling):", err?.message);
        }
      );
    } catch (e) {}

    // 3. Instant Event Listener (Cross-Component & Cross-Tab)
    const handleSync = () => {
      fetchOrdersAndRequests();
    };
    window.addEventListener("edunova_orders_updated", handleSync);
    window.addEventListener("edunova_requests_updated", handleSync);
    window.addEventListener("storage", handleSync);

    // 4. Fast 3-second live polling heartbeat for guaranteed instant freshness across devices
    const liveTimer = setInterval(fetchOrdersAndRequests, 3000);

    return () => {
      unsubOrders();
      unsubReqs();
      clearInterval(liveTimer);
      window.removeEventListener("edunova_orders_updated", handleSync);
      window.removeEventListener("edunova_requests_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [user?.id, refreshKey]);

  // Re-render when admin updates UPI ID or QR code in settings
  const [, setSettingsTick] = useState(0);
  useEffect(() => {
    const handleSettingsUpdate = () => setSettingsTick((t) => t + 1);
    window.addEventListener("edunova_settings_updated", handleSettingsUpdate);
    return () => window.removeEventListener("edunova_settings_updated", handleSettingsUpdate);
  }, []);

  // Live poll for user support inquiries and official admin replies
  useEffect(() => {
    if (!user?.email) return;
    const loadInquiries = () => {
      getUserInquiries(user.email).then((msgs) => {
        if (Array.isArray(msgs)) setUserInquiries(msgs);
      });
    };
    loadInquiries();

    window.addEventListener("edunova_inquiries_updated", loadInquiries);
    window.addEventListener("storage", loadInquiries);

    const timer = setInterval(loadInquiries, 3000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("edunova_inquiries_updated", loadInquiries);
      window.removeEventListener("storage", loadInquiries);
    };
  }, [user?.email]);

  const pendingOrders = orders.filter(o => o.status === "pending");
  const approvedOrders = orders.filter(o => o.status === "approved");
  const totalSpent = approvedOrders.reduce((sum, o) => sum + o.amount, 0);

  // Filter ONLY true custom projects submitted via /requests (keep website catalog orders in Orders)
  const rawCustomProjects = customRequests.filter((req) => {
    return req.source !== "catalog_order" && (req as any).requestType !== "catalog_order";
  });
  // Deduplicate by ID to prevent duplicate custom project cards
  const customProjects = Array.from(new Map(rawCustomProjects.map((cp) => [cp.id, cp])).values());

  const isReqFinalPaymentVerified = (req: CustomRequest | null | undefined): boolean => {
    if (!req) return false;
    // CRITICAL: A status of "delivered" alone does NOT grant file access if 75% final payment was never verified!
    if (req.finalPayment?.status === "verified") return true;
    return orders.some(
      (o) =>
        (o.customRequestId === req.id || o.projectId === req.id) &&
        ((o.orderType === "final_payment" && o.status === "approved") || o.finalPayment?.status === "approved")
    );
  };

  const isReqFinalPaymentPending = (req: CustomRequest | null | undefined): boolean => {
    if (!req) return false;
    if (isReqFinalPaymentVerified(req)) return false;
    if (req.finalPayment?.status === "pending") return true;
    return orders.some(
      (o) =>
        (o.customRequestId === req.id || o.projectId === req.id) &&
        (o.orderType === "final_payment" || o.finalPayment?.status === "pending") &&
        (o.status === "pending" || o.finalPayment?.status === "pending")
    );
  };

  const isReqAdvancePaymentVerified = (req: CustomRequest | null | undefined): boolean => {
    if (!req) return false;
    if (["planning", "building", "development", "testing", "final_review", "completed", "delivered"].includes(req.status)) return true;
    if (req.advancePayment?.status === "verified") return true;
    return orders.some(o => (o.customRequestId === req.id || o.projectId === req.id) && (!o.orderType || o.orderType === "advance_payment") && o.status === "approved");
  };

  const isReqAdvancePaymentPending = (req: CustomRequest | null | undefined): boolean => {
    if (!req) return false;
    if (isReqAdvancePaymentVerified(req)) return false;
    if (req.advancePayment?.status === "pending") return true;
    return orders.some(o => (o.customRequestId === req.id || o.projectId === req.id) && (!o.orderType || o.orderType === "advance_payment") && o.status === "pending");
  };

  // 5th Requirement: Referral code unlocks automatically when 25% payment of custom order or catalog order is approved/done
  const hasApprovedCatalogOrder = approvedOrders.length > 0;
  const hasVerifiedCustomAdvance = customProjects.some(
    (r) =>
      isReqAdvancePaymentVerified(r) ||
      isReqFinalPaymentVerified(r) ||
      r.advancePayment?.status === "verified" ||
      r.finalPayment?.status === "verified" ||
      ["planning", "building", "development", "testing", "final_review", "completed", "delivered"].includes(r.status) ||
      orders.some((o) => (o.customRequestId === r.id || o.projectId === r.id) && o.status === "approved")
  );

  const isReferralUnlocked = Boolean(
    user?.referralUnlocked || hasApprovedCatalogOrder || hasVerifiedCustomAdvance
  );
  const effectiveReferralCode = user?.referralCode || (user?.id ? "REF" + user.id.slice(-6).toUpperCase() : "EDUNOVA");

  // Auto-persist referral unlock via secure server API when buyer completes/approves any purchase or 25% advance
  useEffect(() => {
    if (user?.id && !user.referralUnlocked && (hasApprovedCatalogOrder || hasVerifiedCustomAdvance)) {
      import("@/lib/data/referrals")
        .then(({ unlockUserReferralCode }) => {
          unlockUserReferralCode(user.id);
        })
        .catch(() => {});
    }
  }, [user?.id, user?.referralUnlocked, hasApprovedCatalogOrder, hasVerifiedCustomAdvance]);

  // Unified chronological notifications feed
  const allNotifications = useMemo(() => {
    type UnifiedNotif = {
      id: string;
      title: string;
      message: string;
      timestamp: string;
      type: "order_approved" | "order_pending" | "order_rejected" | "custom_offer" | "custom_stage" | "inquiry_replied" | "inquiry_pending" | "general";
      badgeText: string;
      badgeColor: string;
    };

    const list: UnifiedNotif[] = [];

    // 1. Orders
    orders.forEach(order => {
      if (order.status === "approved") {
        list.push({
          id: `order-app-${order.id}`,
          title: `Order Approved: ${order.projectTitle}`,
          message: order.orderType === "advance_payment"
            ? `25% advance verified! Development has started for ${order.projectTitle}.`
            : order.orderType === "final_payment"
            ? `75% final balance verified! Google Drive links & deliverables unlocked.`
            : `Payment approved! Files unlocked for download in your dashboard.`,
          timestamp: order.updatedAt || order.createdAt,
          type: "order_approved",
          badgeText: "Payment Approved",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        });
      } else if (order.status === "rejected") {
        list.push({
          id: `order-rej-${order.id}`,
          title: `Payment Rejected: ${order.projectTitle}`,
          message: order.rejectionReason
            ? `Payment verification was not approved: "${order.rejectionReason}". Please review and resubmit your payment proof.`
            : `Your payment verification was not approved. Please review UTR & re-submit.`,
          timestamp: order.updatedAt || order.createdAt,
          type: "order_rejected",
          badgeText: "Payment Rejected",
          badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
        });
      } else {
        list.push({
          id: `order-pend-${order.id}`,
          title: `Payment Verification Pending: ${order.projectTitle}`,
          message: `Payment of ₹${order.amount.toLocaleString("en-IN")} is under admin review.`,
          timestamp: order.createdAt,
          type: "order_pending",
          badgeText: "Verification Pending",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        });
      }
    });

    // 2. Custom Requests (admin offers, status transitions, deliveries)
    customRequests.forEach(req => {
      const history = req.negotiationHistory || [];
      const lastOffer = history.length > 0 ? history[history.length - 1] : null;
      if (lastOffer && lastOffer.sentBy === "admin") {
        list.push({
          id: `req-offer-${req.id}-${lastOffer.price}`,
          title: `Price Proposal for "${req.projectTitle}"`,
          message: `EduNova Forge team offered ₹${lastOffer.price.toLocaleString("en-IN")}. ${lastOffer.message ? `"${lastOffer.message}"` : "Please review and accept or counter."}`,
          timestamp: lastOffer.createdAt,
          type: "custom_offer",
          badgeText: "Offer Sent",
          badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        });
      }

      if (isReqFinalPaymentVerified(req)) {
        list.push({
          id: `req-del-${req.id}`,
          title: `Project Delivered: ${req.projectTitle}`,
          message: `Your project deliverables and Google Drive links are fully unlocked!`,
          timestamp: req.finalPayment?.verifiedAt || req.updatedAt,
          type: "custom_stage",
          badgeText: "Delivered",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        });
      } else if (req.status === "delivered" || req.status === "completed") {
        list.push({
          id: `req-comp-${req.id}`,
          title: `Build Ready: ${req.projectTitle}`,
          message: `Project development is finished! Complete the remaining 75% payment to unlock your files and download link.`,
          timestamp: req.updatedAt,
          type: "custom_stage",
          badgeText: "Payment Required",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        });
      } else if (req.status === "building" || req.status === "development") {
        list.push({
          id: `req-bld-${req.id}`,
          title: `Build in Progress: ${req.projectTitle}`,
          message: `EduNova Forge engineering team is actively coding and building your project!`,
          timestamp: req.updatedAt,
          type: "custom_stage",
          badgeText: "Building",
          badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        });
      } else if (req.status === "testing" || (req.status as any) === "final_review") {
        list.push({
          id: `req-tst-${req.id}`,
          title: `Testing & QA: ${req.projectTitle}`,
          message: `Your project is undergoing rigorous testing and quality assurance checks.`,
          timestamp: req.updatedAt,
          type: "custom_stage",
          badgeText: "Testing",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        });
      } else if (req.status === "accepted") {
        list.push({
          id: `req-acc-${req.id}`,
          title: `Request Accepted: ${req.projectTitle}`,
          message: `EduNova Forge accepted your project! Pay 25% advance to initiate architecture & development.`,
          timestamp: req.updatedAt,
          type: "custom_stage",
          badgeText: "Accepted",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        });
      } else if (req.status === "rejected") {
        list.push({
          id: `req-rej-${req.id}`,
          title: `Request Declined: ${req.projectTitle}`,
          message: `Your custom request could not be accepted. Please review requirements or submit a new inquiry.`,
          timestamp: req.updatedAt,
          type: "custom_stage",
          badgeText: "Declined",
          badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
        });
      } else if (req.status === "pending") {
        list.push({
          id: `req-pnd-${req.id}`,
          title: `Request Under Review: ${req.projectTitle}`,
          message: `Your project requirement has been submitted and is currently being evaluated by our team.`,
          timestamp: req.createdAt || req.updatedAt,
          type: "custom_stage",
          badgeText: "Under Review",
          badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        });
      }
    });

    // 3. Inquiries
    userInquiries.forEach(inq => {
      if (inq.reply) {
        list.push({
          id: `inq-reply-${inq.id}`,
          title: `Support Reply: ${inq.subject || "Inquiry"}`,
          message: `Admin reply: "${inq.reply}"`,
          timestamp: inq.repliedAt || inq.createdAt,
          type: "inquiry_replied",
          badgeText: "Replied",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        });
      } else {
        list.push({
          id: `inq-pend-${inq.id}`,
          title: `Inquiry Submitted: ${inq.subject || "General Support"}`,
          message: `Your inquiry has been received by support and is in review.`,
          timestamp: inq.createdAt,
          type: "inquiry_pending",
          badgeText: "Under Review",
          badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        });
      }
    });

    // 4. Stored user notifications
    if (user?.email) {
      const stored = getUserNotifications(user.email);
      stored.forEach(sn => {
        list.push({
          id: `sn-${sn.id}`,
          title: sn.title,
          message: sn.message,
          timestamp: sn.timestamp,
          type: "general",
          badgeText: "Update",
          badgeColor: "bg-gray-500/20 text-gray-300 border-gray-500/30",
        });
      });
    }

    const seen = new Set<string>();
    return list
      .filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders, customRequests, userInquiries, user?.email]);

  // Deduplicate and unify 25% advance + 75% final payment orders for the same project into ONE unified tracking card
  const unifiedOrders = useMemo(() => {
    const list: Array<{
      id: string;
      cleanTitle: string;
      projectCategory: string;
      createdAt: string;
      isBuildOrder: boolean;
      currentBuildStage: string;
      totalAmount: number;
      advanceAmount?: number;
      finalAmount?: number;
      overallStatus: Order["status"];
      advanceOrder?: Order;
      finalOrder?: Order;
      primaryOrder: Order;
      linkedReq?: CustomRequest;
    }> = [];

    const processedOrderIds = new Set<string>();

    orders.forEach((order) => {
      if (processedOrderIds.has(order.id)) return;

      // EXCLUDE orders belonging to true custom requests that are rendered under "Custom Projects"
      // to avoid showing custom projects twice (once in My Orders and once in Custom Projects).
      const isTrueCustomProjectOrder = Boolean(
        (order.customRequestId && customProjects.some((cp) => cp.id === order.customRequestId)) ||
        order.projectCategory === "custom_request" ||
        customProjects.some((cp) => cp.id === order.projectId)
      );

      if (isTrueCustomProjectOrder) {
        processedOrderIds.add(order.id);
        return;
      }

      const isCustom = !!order.customRequestId;
      const isBuild =
        order.orderType === "advance_payment" ||
        order.orderType === "final_payment" ||
        isCustom ||
        !!order.buildStage;

      let advanceOrder: Order | undefined;
      let finalOrder: Order | undefined;

      if (order.orderType === "final_payment") {
        finalOrder = order;
        advanceOrder = orders.find(
          (o) =>
            o.id !== order.id &&
            ((isCustom && o.customRequestId === order.customRequestId) ||
              (!isCustom &&
                o.projectId &&
                o.projectId === order.projectId &&
                (o.orderType === "advance_payment" || !o.orderType)))
        );
      } else if (order.orderType === "advance_payment" || isCustom) {
        advanceOrder = order;
        finalOrder = orders.find(
          (o) =>
            o.id !== order.id &&
            o.orderType === "final_payment" &&
            ((isCustom && o.customRequestId === order.customRequestId) ||
              (!isCustom && o.projectId && o.projectId === order.projectId))
        );
      }

      if (advanceOrder) processedOrderIds.add(advanceOrder.id);
      if (finalOrder) processedOrderIds.add(finalOrder.id);
      processedOrderIds.add(order.id);

      const primaryOrder = advanceOrder || finalOrder || order;
      const linkedReq = customRequests.find(
        (r) => r.id === (primaryOrder.customRequestId || finalOrder?.customRequestId)
      );

      // Clean title: remove "Advance (75%):" or "Final (25%):" or "Balance (25%):"
      const cleanTitle = (linkedReq?.projectTitle || primaryOrder.projectTitle)
        .replace(/^(Advance|Balance|Final)\s*\(\s*(25%|75%)\s*\)\s*:\s*/i, "")
        .replace(/^Advance\s*:\s*/i, "")
        .replace(/^Final\s*:\s*/i, "")
        .replace(/^Balance\s*:\s*/i, "")
        .trim();

      const advanceAmt = advanceOrder
        ? advanceOrder.amount
        : order.orderType === "advance_payment"
        ? order.amount
        : undefined;
      const finalAmt = finalOrder
        ? finalOrder.amount
        : order.orderType === "final_payment"
        ? order.amount
        : undefined;

      const linkedReqAny = linkedReq as any;
      let totalAmt = primaryOrder.amount;
      if (advanceAmt && finalAmt) {
        totalAmt = advanceAmt + finalAmt;
      } else if (linkedReqAny?.finalPrice) {
        totalAmt = linkedReqAny.finalPrice;
      } else if (advanceAmt && !finalAmt && isBuild) {
        totalAmt = advanceAmt * 4;
      }

      // Check final payment verification or submission status
      const isFinalVerified =
        (finalOrder && finalOrder.status === "approved") ||
        (order.orderType === "final_payment" && order.status === "approved") ||
        (primaryOrder as any).finalPayment?.status === "approved" ||
        isReqFinalPaymentVerified(linkedReq);

      const isFinalPending =
        (finalOrder && finalOrder.status === "pending") ||
        (order.orderType === "final_payment" && order.status === "pending") ||
        (primaryOrder as any).finalPayment?.status === "pending" ||
        isReqFinalPaymentPending(linkedReq);

      let currentBuildStage = "planning";
      if (isFinalVerified) {
        currentBuildStage = "delivered";
      } else if (isFinalPending) {
        currentBuildStage = "completed";
      } else if (finalOrder?.buildStage) {
        currentBuildStage = finalOrder.buildStage;
      } else if (advanceOrder?.buildStage) {
        currentBuildStage = advanceOrder.buildStage;
      } else if (primaryOrder.buildStage) {
        currentBuildStage = primaryOrder.buildStage;
      } else if (linkedReq?.status && linkedReq.status !== "pending") {
        currentBuildStage = linkedReq.status;
      } else if (advanceOrder && advanceOrder.status === "approved") {
        currentBuildStage = "planning";
      } else if (primaryOrder.status === "approved") {
        currentBuildStage = "planning";
      } else {
        currentBuildStage = "order_placed";
      }

      // Normalize common status alias strings
      if (["ready_for_delivery", "ready", "awaiting_final_payment", "final_payment_pending"].includes(currentBuildStage)) {
        currentBuildStage = "completed";
      }

      let overallStatus: Order["status"] = primaryOrder.status;
      if (finalOrder && finalOrder.status === "approved") {
        overallStatus = "approved";
      } else if (advanceOrder && advanceOrder.status === "approved") {
        overallStatus = "approved";
      } else if (finalOrder && finalOrder.status === "pending") {
        overallStatus = advanceOrder?.status === "approved" ? "approved" : "pending";
      }

      list.push({
        id: primaryOrder.id,
        cleanTitle,
        projectCategory: linkedReqAny?.category || primaryOrder.projectCategory || "Custom Request",
        createdAt: primaryOrder.createdAt,
        isBuildOrder: isBuild,
        currentBuildStage,
        totalAmount: totalAmt,
        advanceAmount: advanceAmt,
        finalAmount: finalAmt,
        overallStatus,
        advanceOrder,
        finalOrder,
        primaryOrder,
        linkedReq,
      });
    });

    return Array.from(new Map(list.map(item => [item.id, item])).values());
  }, [orders, customRequests, customProjects]);

  const handleCloseModal = () => {
    setSelectedReq(null);
    setPaymentUtr("");
    setPaymentScreenshotBase64("");
    setPaymentScreenshotName("");
    setPaymentError("");
    setCounterPrice("");
    setCounterMessage("");
    setFeedbackRating(5);
    setFeedbackComment("");
  };

  const handleDownloadInvoice = (order: Order) => {
    if (!user) {
      alert("Please login to download your invoice.");
      return;
    }
    if (order.userId !== user.id && user.role !== "admin") {
      alert("Unauthorized: You can only download invoices for your own orders.");
      return;
    }
    generateInvoice(order);
  };

  const handleDownloadProject = async (order: Order) => {
    try {
      const isBuildOrder = order.orderType === "advance_payment" || order.customRequestId;
      if (isBuildOrder) {
        const linked = customRequests.find(r => r.id === order.customRequestId);
        if (!isReqFinalPaymentVerified(linked)) {
          alert("🔒 Download Locked: Please complete the remaining 75% payment to unlock and download this project.");
          if (linked) setSelectedReq(linked);
          return;
        }
      }

      const { downloadCompleteProjectZip } = await import("@/lib/projectZipGenerator");
      await downloadCompleteProjectZip({
        project: {
          id: order.projectId,
          title: order.projectTitle,
          category: order.projectCategory,
          price: order.amount,
        },
        orderId: order.id,
        customerName: order.userName || user?.name,
      });

    } catch (error) {
      console.error("Failed to download complete project ZIP:", error);
      alert("Failed to package the complete project ZIP. Please try again or reach out to support.");
    }
  };

  const handleAcceptOffer = async (req: CustomRequest) => {
    setIsUpdatingOffer(true);
    try {
      const updated = await updateCustomRequestStatus(req.id, "awaiting_final_approval");
      if (updated) {
        setCustomRequests(customRequests.map(r => r.id === req.id ? updated : r));
        setSelectedReq(updated);
        sendNotification("awaiting_final_approval", {
          userEmail: updated.userEmail,
          userName: updated.userName,
          projectTitle: updated.projectTitle,
        });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to accept offer.");
    } finally {
      setIsUpdatingOffer(false);
    }
  };

  const handleSendCounterOffer = async () => {
    if (!selectedReq || !counterPrice || !counterMessage) return;
    setIsUpdatingOffer(true);
    try {
      const updated = await addNegotiationOffer(
        selectedReq.id,
        {
          price: Number(counterPrice),
          message: counterMessage,
          sentBy: "user",
        },
        "counter_offered"
      );
      if (updated) {
        setCustomRequests(customRequests.map(r => r.id === updated.id ? updated : r));
        setSelectedReq(updated);
        setCounterPrice("");
        setCounterMessage("");
        sendNotification("counter_offered", {
          userEmail: "admin@edunova.com",
          userName: "Admin",
          projectTitle: updated.projectTitle,
        });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to send counter offer.");
    } finally {
      setIsUpdatingOffer(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setPaymentError("File size must be less than 1MB");
        return;
      }
      setPaymentError("");
      setPaymentScreenshotName(file.name);
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImage(reader.result);
          setPaymentScreenshotBase64(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setPaymentError("File size must be less than 1MB");
        return;
      }
      setPaymentError("");
      setPaymentScreenshotName(file.name);
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImage(reader.result);
          setPaymentScreenshotBase64(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResubmitFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setResubmitError("Image size must be less than 5MB");
        return;
      }
      setResubmitFileName(file.name);
      setResubmitError("");
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === "string") {
          const compressed = await compressImage(reader.result);
          setResubmitProof(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitOrderModal) return;
    const trimmedUtr = resubmitUtr.trim();
    if (!trimmedUtr) {
      setResubmitError("Please enter the UTR or Transaction ID.");
      return;
    }
    if (!/^[a-zA-Z0-9_\-]{4,50}$/.test(trimmedUtr)) {
      setResubmitError("UTR should be 4 to 50 alphanumeric characters.");
      return;
    }
    if (!resubmitProof) {
      setResubmitError("Please upload the payment screenshot proof.");
      return;
    }

    setIsResubmitting(true);
    setResubmitError("");

    try {
      const updated = await resubmitOrderPayment(
        resubmitOrderModal.id,
        trimmedUtr,
        resubmitProof
      );
      if (updated) {
        sendNotification("payment_submitted", {
          userName: user?.name || "Customer",
          userEmail: user?.email || "customer@edunova.com",
          orderId: updated.id,
          projectTitle: updated.projectTitle,
          utrNumber: updated.utrNumber,
          amount: updated.amount,
        });
        alert("Payment proof resubmitted successfully! Your order is now under Payment Verification Pending.");
        setResubmitOrderModal(null);
        setResubmitUtr("");
        setResubmitProof("");
        setResubmitFileName("");
      }
    } catch (err: any) {
      setResubmitError(err?.message || "Failed to resubmit payment. Please try again.");
    } finally {
      setIsResubmitting(false);
    }
  };

  const handleSubmitAdvancePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !paymentUtr || !user) return;
    if (!paymentScreenshotBase64) {
      alert("Please upload a payment screenshot before submitting.");
      return;
    }
    setIsPaying(true);
    
    const latestOffer = selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1];
    const agreedPrice = latestOffer ? latestOffer.price : selectedReq.budget;
    const advanceAmount = Math.round(agreedPrice * 0.25);

    try {
      const order = await createOrder(
        user.id,
        user.email,
        user.name,
        { id: selectedReq.id, title: `Advance (25%): ${selectedReq.projectTitle}`, category: "custom_request", sellerName: "EduNova Forge Team", price: advanceAmount },
        paymentScreenshotBase64,
        paymentUtr,
        "UPI",
        "advance_payment",
        selectedReq.id
      );

      const updated = await updateCustomRequestFields(selectedReq.id, {
        advancePayment: {
          amount: order.amount,
          status: "pending",
          utrNumber: paymentUtr,
          screenshot: order.paymentScreenshot,
          submittedAt: new Date().toISOString(),
        }
      });
      
      if (updated) {
        setCustomRequests(customRequests.map(r => r.id === updated.id ? updated : r));
        setSelectedReq(updated);
      } else {
        const reqs = await getUserCustomRequests(user.id);
        setCustomRequests(reqs);
        const current = reqs.find(r => r.id === selectedReq.id);
        if (current) setSelectedReq(current);
      }

      const o = await getOrdersByUser(user.id);
      setOrders(o);
      alert("25% Advance payment submitted successfully! Awaiting admin verification.");
      setPaymentUtr("");
      setPaymentScreenshotBase64("");
      setPaymentScreenshotName("");
    } catch (err: any) {
      console.error("[Dashboard] Advance payment failed:", err);
      if (err instanceof DuplicateUtrError) {
        alert(err.message);
      } else {
        alert(`Failed to submit payment: ${err?.message || "Please try again."}`);
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handleSubmitFinalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !paymentUtr || !user) return;
    if (!paymentScreenshotBase64) {
      alert("Please upload a payment screenshot before submitting.");
      return;
    }
    setIsPaying(true);
    
    const latestOffer = selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1];
    const agreedPrice = latestOffer ? latestOffer.price : selectedReq.budget;
    const advanceAmount = Math.round(agreedPrice * 0.25);
    const baseFinalAmount = Math.max(0, agreedPrice - advanceAmount);

    try {
      const order = await createOrder(
        user.id,
        user.email,
        user.name,
        { id: selectedReq.id, title: `Final Balance (75%): ${selectedReq.projectTitle}`, category: "custom_request", sellerName: "EduNova Forge Team", price: baseFinalAmount },
        paymentScreenshotBase64,
        paymentUtr,
        "UPI",
        "final_payment",
        selectedReq.id
      );

      const serverAmount = order.amount;
      const discountApplied = order.discountApplied ?? (baseFinalAmount > serverAmount ? baseFinalAmount - serverAmount : 0);

      const updated = await updateCustomRequestFields(selectedReq.id, {
        finalPayment: {
          amount: serverAmount,
          status: "pending",
          utrNumber: paymentUtr,
          screenshot: order.paymentScreenshot,
          discountApplied,
        }
      });
      
      if (updated) {
        setCustomRequests(customRequests.map(r => r.id === updated.id ? updated : r));
        setSelectedReq(updated);
      } else {
        const reqs = await getUserCustomRequests(user.id);
        setCustomRequests(reqs);
        const current = reqs.find(r => r.id === selectedReq.id);
        if (current) setSelectedReq(current);
      }

      const o = await getOrdersByUser(user.id);
      setOrders(o);
      alert(discountApplied > 0 
        ? `Final payment submitted! ₹${discountApplied} referral discount applied. Awaiting admin verification.`
        : "Final payment submitted successfully! Awaiting admin verification to unlock files."
      );
      setPaymentUtr("");
      setPaymentScreenshotBase64("");
      setPaymentScreenshotName("");
    } catch (err: any) {
      console.error("[Payment] Error:", err);
      if (err instanceof DuplicateUtrError) {
        alert(err.message);
      } else {
        alert(`Failed to submit payment: ${err?.message || "Please try again."}`);
      }
    } finally {
      setIsPaying(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 py-24 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/8 border border-amber-500/20 flex items-center justify-center" style={{backgroundColor:'rgba(217,119,6,0.08)'}}>
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Login Required</h1>
        <p className="text-gray-400 mb-8">Please login to access your dashboard.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/login"><Button size="lg" as="div">Login</Button></Link>
          <Link href="/signup"><Button variant="secondary" size="lg" as="div">Sign Up</Button></Link>
        </div>
      </div>
    );
  }

  if (user.role === "admin") {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8 xl:px-12 py-24 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          <Shield className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Admin Account Detected</h1>
        <p className="text-stone-400 mb-8 max-w-lg mx-auto">
          As an administrator, all management features (orders, custom requests, catalog, payments, and 3D analytics) are located in the Admin Control Center.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/admin">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)]" as="div">
              Open Admin Panel
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="secondary" size="lg" as="div">
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#140e2b] via-[#0d091c] to-[#07040f] -mt-20 pt-28 pb-16 relative overflow-hidden">
      {/* Background ambient lighting for depth and contrast */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-48 right-10 w-[550px] h-[550px] bg-emerald-600/12 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-[550px] h-[550px] bg-cyan-600/12 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 relative z-10">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#130f24]/80 to-cyan-950/40 border border-purple-500/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div>
          <h1 className="text-3xl font-extrabold mb-1.5 text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300">My Dashboard</h1>
          <p className="text-gray-400 text-sm">Welcome back, <span className="text-white font-semibold">{user.name}</span> • <span className="text-gray-400 font-mono text-xs">{user.email}</span></p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/marketplace">
            <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400/50">
              <ShoppingCart className="w-4 h-4 mr-1.5 text-amber-400" />
              Explore Marketplace
            </Button>
          </Link>
          <Link href="/requests">
            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-md border border-purple-400/30">
              <FileQuestion className="w-4 h-4 mr-1.5" />
              Custom Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-semibold">{fetchError}</p>
          </div>
          <button
            onClick={() => { setFetchError(null); setRefreshKey(k => k + 1); }}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 75% Final Payment Action Banner for Ready-to-Deliver Projects */}
      {(() => {
        const readyForDelivery = customRequests.find(
          r => ["completed", "delivered"].includes(r.status) && !isReqFinalPaymentVerified(r)
        );
        if (!readyForDelivery) return null;
        const isFinalPending = isReqFinalPaymentPending(readyForDelivery);
        return (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-emerald-600/20 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_35px_rgba(59,130,246,0.2)]">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/25 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                {isFinalPending ? <Clock className="w-6 h-6 text-yellow-400 animate-pulse" /> : <Package className="w-6 h-6 text-blue-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    isFinalPending
                      ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                      : "text-blue-400 bg-blue-500/10 border-blue-500/30"
                  }`}>
                    {isFinalPending ? "Under Verification" : "Action Required"}
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold border border-emerald-500/30">
                    🎉 Project Finished
                  </span>
                </div>
                <h3 className="text-white text-base font-bold">
                  "{readyForDelivery.projectTitle}" is ready for delivery!
                </h3>
                <p className="text-gray-300 text-xs">
                  {isFinalPending
                    ? "75% final payment submitted and under verification by EduNova Forge team. Google Drive links will unlock once verified."
                    : "Pay the remaining 75% payment to unlock instant download access to your project files and Google Drive resources."}
                </p>
              </div>
            </div>
            <Button
              size="md"
              onClick={() => setSelectedReq(readyForDelivery)}
              className={isFinalPending ? "bg-yellow-600 hover:bg-yellow-700 text-white font-bold shrink-0 shadow-md" : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.35)]"}
            >
              {isFinalPending ? (
                <>
                  <Clock className="w-4 h-4 mr-1.5" />
                  View Payment Status
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1.5" />
                  Pay 75% &amp; Unlock Files
                </>
              )}
            </Button>
          </div>
        );
      })()}

      {/* Stats Cards - each with distinct aesthetic background */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Card
          glowOnHover
          className="relative overflow-hidden bg-gradient-to-br from-[#1e1335]/95 via-[#150d26]/95 to-[#0f081c]/95 border border-purple-500/30 hover:border-purple-400/60 shadow-[0_6px_25px_rgba(168,85,247,0.12)] hover:shadow-[0_10px_35px_rgba(168,85,247,0.25)]"
        >
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <ShoppingCart className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <p className="text-purple-200/70 text-xs uppercase tracking-wider font-semibold">Total Orders</p>
              <p className="text-2xl font-black text-white tracking-tight">{orders.length}</p>
            </div>
          </div>
        </Card>

        <Card
          glowOnHover
          className="relative overflow-hidden bg-gradient-to-br from-[#2b1b09]/95 via-[#1f1306]/95 to-[#150c03]/95 border border-amber-500/35 hover:border-amber-400/60 shadow-[0_6px_25px_rgba(245,158,11,0.12)] hover:shadow-[0_10px_35px_rgba(245,158,11,0.25)]"
        >
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <Clock className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <p className="text-amber-200/70 text-xs uppercase tracking-wider font-semibold">Pending</p>
              <p className="text-2xl font-black text-white tracking-tight">{pendingOrders.length}</p>
            </div>
          </div>
        </Card>

        <Card
          glowOnHover
          className="relative overflow-hidden bg-gradient-to-br from-[#0b291d]/95 via-[#071d14]/95 to-[#04130d]/95 border border-emerald-500/35 hover:border-emerald-400/60 shadow-[0_6px_25px_rgba(16,185,129,0.12)] hover:shadow-[0_10px_35px_rgba(16,185,129,0.25)]"
        >
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Download className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-emerald-200/70 text-xs uppercase tracking-wider font-semibold">Downloads Ready</p>
              <p className="text-2xl font-black text-white tracking-tight">{approvedOrders.length}</p>
            </div>
          </div>
        </Card>

        <Card
          glowOnHover
          className="relative overflow-hidden bg-gradient-to-br from-[#0b233a]/95 via-[#071929]/95 to-[#04101c]/95 border border-cyan-500/35 hover:border-cyan-400/60 shadow-[0_6px_25px_rgba(6,182,212,0.12)] hover:shadow-[0_10px_35px_rgba(6,182,212,0.25)]"
        >
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Receipt className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <p className="text-cyan-200/70 text-xs uppercase tracking-wider font-semibold">Total Spent</p>
              <p className="text-xl font-black text-white tracking-tight">₹{totalSpent.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Referral System */}
      <Card className={`mb-10 relative overflow-hidden bg-gradient-to-br from-[#1a1506]/95 via-[#101912]/95 to-[#09120e]/95 backdrop-blur-xl border ${user.referralCompleted ? "border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]" : isReferralUnlocked ? "border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]" : "border-amber-500/25 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"}`}>
        <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 ${user.referralCompleted ? "bg-emerald-500/20" : isReferralUnlocked ? "bg-green-500/20" : "bg-amber-500/10"}`}></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-3xl pointer-events-none -ml-12 -mb-12 bg-emerald-500/10"></div>

        {/* STATE 1: Referral NOT unlocked yet */}
        {!isReferralUnlocked && (
          <div className="flex flex-col items-center text-center py-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
              <Gift className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Referral Rewards</h2>
            <p className="text-gray-400 text-sm max-w-md mb-3">
              Your referral code will be <strong className="text-white">unlocked automatically</strong> once your project order or 25% custom project payment is verified by the admin.
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Complete &amp; verify any project purchase to unlock
            </div>
          </div>
        )}

        {/* UNLIMITED REFERRAL REWARDS PROGRAM */}
        {isReferralUnlocked && (
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-6 h-6 text-emerald-400" />
                <h2 className="text-2xl font-bold text-white">
                  Refer &amp; Earn Discounts — Unlimited Referrals!
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  NO LIMIT
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Invite friends with your unique code. Every time a friend builds a project, you earn stacked discounts on your remaining 75% payment!
              </p>
              <div className="flex flex-wrap gap-2.5 mb-4 text-xs">
                <div className="bg-green-500/10 border border-green-500/20 text-green-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Projects up to ₹3,000 → <strong className="text-green-400">₹50 per ₹1,000</strong>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Projects above ₹3,000 → <strong className="text-emerald-400">₹75 per ₹1,000</strong>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-xl text-white font-mono text-lg tracking-wider flex items-center gap-3">
                  {effectiveReferralCode}
                  <button onClick={async () => {
                    const ok = await copyToClipboard(effectiveReferralCode);
                    if (ok) alert("Referral code copied!");
                  }} className="text-gray-400 hover:text-white transition-colors" title="Copy Referral Code">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={async () => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const url = `${origin}/?ref=${effectiveReferralCode}`;
                  const ok = await copyToClipboard(url);
                  if (ok) alert("Referral link copied!");
                }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl transition-colors shadow-md">
                  <Share2 className="w-4 h-4" />
                  Share Link
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
                <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Successful: {referrals.filter(r => r.status === "successful").length} referrals (Unlimited)
                </div>
                <div className="bg-white/5 text-gray-400 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5 text-emerald-400" />
                  Discounts automatically apply to your next 75% final payment
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto p-6 bg-black/40 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center text-center min-w-[250px] shadow-inner">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-bold">Total Discount Earned</p>
              <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-green-500 mb-1">
                ₹{(user.availableDiscount || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-emerald-400/80 text-[10px] font-medium leading-tight max-w-[200px]">
                Stackable discount ready to apply on your 75% balance!
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Orders Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-b from-[#111626]/95 via-[#0c101d]/95 to-[#070b14]/95 border border-indigo-500/25 shadow-[0_12px_45px_rgba(99,102,241,0.08)] backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between mb-6 border-b border-indigo-500/20 pb-4 relative z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                  <Package className="w-4 h-4 text-indigo-400" />
                </div>
                My Orders
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">{unifiedOrders.length} total</span>
            </div>

            {unifiedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center relative z-10">
                <Package className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400 mb-2">No orders yet</p>
                <p className="text-gray-600 text-sm mb-6">Browse the marketplace and purchase your first project!</p>
                <Link href="/marketplace">
                  <Button size="md">
                    <ShoppingCart className="w-4 h-4" />
                    Explore Marketplace
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4 relative z-10">
                <AnimatePresence>
                  {unifiedOrders.map((item) => {
                    return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-gradient-to-r from-indigo-950/20 via-white/[0.04] to-white/[0.02] border border-indigo-500/20 overflow-hidden hover:border-indigo-400/50 hover:shadow-[0_4px_20px_rgba(99,102,241,0.12)] transition-all duration-300"
                    >
                      {/* Main Row */}
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-white">{item.cleanTitle}</h3>
                              {item.isBuildOrder && (
                                isReqFinalPaymentVerified(item.linkedReq) || (item.finalOrder && item.finalOrder.status === "approved") ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    ✅ Fully Paid &amp; Delivered (100%)
                                  </span>
                                ) : isReqFinalPaymentPending(item.linkedReq) || (item.finalOrder && item.finalOrder.status === "pending") ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    ⏳ 75% Balance Payment Verifying
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    🔨 Build on Order (25% Advance Paid)
                                  </span>
                                )
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500 font-mono">{item.id}</p>
                              {item.isBuildOrder ? (
                                <BuildStageBadge stage={item.currentBuildStage} />
                              ) : (
                                <DeliveryBadge status={item.overallStatus} />
                              )}
                            </div>
                          </div>
                          <StatusBadge status={item.overallStatus} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                          <div>
                            <p className="text-gray-500 uppercase tracking-wider">Amount</p>
                            <p className="text-white font-bold">₹{item.totalAmount.toLocaleString("en-IN")}</p>
                            {item.isBuildOrder && item.advanceAmount && item.finalAmount && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                (₹{item.advanceAmount.toLocaleString("en-IN")} Adv + ₹{item.finalAmount.toLocaleString("en-IN")} Final)
                              </p>
                            )}
                            {item.isBuildOrder && item.advanceAmount && !item.finalAmount && (
                              <p className="text-[10px] text-amber-400/90 mt-0.5">
                                (25% Adv: ₹{item.advanceAmount.toLocaleString("en-IN")})
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-500 uppercase tracking-wider">Category</p>
                            <p className="text-gray-300 capitalize">{item.projectCategory}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 uppercase tracking-wider">Date</p>
                            <p className="text-gray-300">{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 uppercase tracking-wider">Payment</p>
                            <p className={`font-semibold ${item.overallStatus === "approved" ? "text-green-400" : item.overallStatus === "pending" ? "text-yellow-400" : "text-red-400"}`}>
                              {item.overallStatus === "approved" ? "Verified ✓" : item.overallStatus === "pending" ? "Verifying..." : "Failed"}
                            </p>
                          </div>
                        </div>

                        {/* Live Milestone Tracker for Build-on-Order Projects */}
                        {item.isBuildOrder && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                            {item.overallStatus === "pending" && !item.advanceOrder && (
                              <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs font-semibold flex items-center gap-2">
                                <Clock className="w-4 h-4 animate-pulse flex-shrink-0" />
                                <span>25% Advance Payment under verification. Project development will start upon admin approval.</span>
                              </div>
                            )}

                            {item.advanceOrder && item.advanceOrder.status === "pending" && (
                              <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs font-semibold flex items-center gap-2">
                                <Clock className="w-4 h-4 animate-pulse flex-shrink-0" />
                                <span>25% Advance Payment under verification. Project development will start upon admin approval.</span>
                              </div>
                            )}

                            {((item.advanceOrder && item.advanceOrder.status === "approved") || (!item.advanceOrder && item.overallStatus === "approved")) && (
                              <>
                                {["planning", "building", "development", "testing", "final_review"].includes(item.currentBuildStage) && (
                                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-2">
                                    <Rocket className="w-4 h-4 flex-shrink-0" />
                                    <span>25% Advance Verified! Team is actively developing your project according to milestones below.</span>
                                  </div>
                                )}

                                {["completed", "delivered"].includes(item.currentBuildStage) && !isReqFinalPaymentVerified(item.linkedReq) && !isReqFinalPaymentPending(item.linkedReq) && (!item.finalOrder || item.finalOrder.status !== "pending") && (
                                  <div className="p-3 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 border border-blue-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                    <div>
                                      <p className="text-white text-xs font-bold flex items-center gap-1.5">
                                        <Package className="w-4 h-4 text-cyan-400" />
                                        🎉 Project Development Finished &amp; Ready for Delivery!
                                      </p>
                                      <p className="text-gray-300 text-[11px] mt-0.5">
                                        Pay the remaining 75% balance to unlock your project files and Google Drive links.
                                      </p>
                                    </div>
                                    {item.linkedReq && (
                                      <Button
                                        size="sm"
                                        onClick={() => setSelectedReq(item.linkedReq!)}
                                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold shrink-0 shadow-md text-xs"
                                      >
                                        <Download className="w-3.5 h-3.5 mr-1" />
                                        Pay Remaining 75% Balance
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {["completed", "delivered"].includes(item.currentBuildStage) && (isReqFinalPaymentPending(item.linkedReq) || (item.finalOrder && item.finalOrder.status === "pending")) && !isReqFinalPaymentVerified(item.linkedReq) && (
                                  <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4 flex-shrink-0 animate-pulse" />
                                    <span>75% Balance Payment submitted &amp; under verification. Your deliverables will unlock shortly!</span>
                                  </div>
                                )}

                                {(isReqFinalPaymentVerified(item.linkedReq) || (item.finalOrder && item.finalOrder.status === "approved")) && (
                                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>🎉 Project fully paid and verified! Download your files anytime using the button below.</span>
                                  </div>
                                )}

                                {/* Milestone Tracker UI - Single Tracker per Project */}
                                <div className="pt-1">
                                  <ProjectTracker
                                    isBuildOrder={item.isBuildOrder}
                                    currentStatus={
                                      (item.finalOrder && item.finalOrder.status === "approved") || (item.primaryOrder as any).finalPayment?.status === "approved" || isReqFinalPaymentVerified(item.linkedReq)
                                        ? "delivered"
                                        : (item.finalOrder && item.finalOrder.status === "pending") || (item.primaryOrder as any).finalPayment?.status === "pending" || isReqFinalPaymentPending(item.linkedReq)
                                        ? "completed"
                                        : item.currentBuildStage
                                    }
                                    trackingHistory={item.linkedReq?.trackingHistory}
                                    lastUpdated={item.linkedReq?.updatedAt || item.primaryOrder.updatedAt}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
                          {/* Invoice download buttons */}
                          {item.advanceOrder && (
                            <button
                              onClick={() => handleDownloadInvoice(item.advanceOrder!)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30 text-[var(--color-neon-blue)] text-xs font-bold hover:bg-[var(--color-neon-blue)]/20 transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Advance Invoice (25%)
                            </button>
                          )}

                          {(item.finalOrder || isReqFinalPaymentVerified(item.linkedReq) || (item.primaryOrder as any).finalPayment?.status === "approved" || item.primaryOrder.deliveryStatus === "delivered") && (
                            <button
                              onClick={() => {
                                const finDiscount = (item.primaryOrder as any).finalPayment?.discountApplied ||
                                  (item.linkedReq?.finalPayment as any)?.discountApplied ||
                                  item.finalOrder?.discountApplied ||
                                  item.primaryOrder.discountApplied || 0;

                                if (item.finalOrder) {
                                  handleDownloadInvoice({
                                    ...item.finalOrder,
                                    discountApplied: finDiscount,
                                    totalProjectPrice: item.finalOrder.totalProjectPrice || item.primaryOrder.totalProjectPrice,
                                    advanceAmount: item.finalOrder.advanceAmount || item.primaryOrder.advanceAmount || item.primaryOrder.amount,
                                  });
                                } else {
                                  const finAmt = (item.primaryOrder as any).finalPayment?.amount ||
                                    (item.linkedReq?.finalPayment as any)?.amount ||
                                    Math.round((item.primaryOrder.amount || 0) * 3);
                                  const finUtr = (item.primaryOrder as any).finalPayment?.utrNumber ||
                                    (item.primaryOrder as any).finalUtrNumber ||
                                    (item.linkedReq?.finalPayment as any)?.utrNumber ||
                                    item.primaryOrder.utrNumber;
                                  const finCreatedAt = (item.primaryOrder as any).finalPayment?.verifiedAt ||
                                    (item.primaryOrder as any).finalPayment?.submittedAt ||
                                    (item.linkedReq?.finalPayment as any)?.verifiedAt ||
                                    item.primaryOrder.updatedAt ||
                                    item.primaryOrder.createdAt;

                                  const synthFinalOrder: Order = {
                                    ...item.primaryOrder,
                                    id: `${item.primaryOrder.id}-FINAL`,
                                    invoiceId: `EDN-INV-${item.primaryOrder.id.replace("ORD-", "").slice(0, 7)}-FINAL`,
                                    orderType: "final_payment",
                                    amount: finAmt,
                                    totalProjectPrice: item.primaryOrder.totalProjectPrice || (item.primaryOrder.amount + finAmt + finDiscount),
                                    advanceAmount: item.primaryOrder.advanceAmount || item.primaryOrder.amount,
                                    discountApplied: finDiscount,
                                    utrNumber: finUtr,
                                    status: "approved",
                                    createdAt: finCreatedAt,
                                  };
                                  handleDownloadInvoice(synthFinalOrder);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-colors shadow-sm"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Final Invoice (75%)
                            </button>
                          )}

                          {!item.advanceOrder && !item.finalOrder && !(isReqFinalPaymentVerified(item.linkedReq) || (item.primaryOrder as any).finalPayment?.status === "approved" || item.primaryOrder.deliveryStatus === "delivered") && (
                            <button
                              onClick={() => handleDownloadInvoice(item.primaryOrder)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30 text-[var(--color-neon-blue)] text-xs font-bold hover:bg-[var(--color-neon-blue)]/20 transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Download Invoice
                            </button>
                          )}

                          {/* Regular marketplace 100% upfront purchase download */}
                          {!item.isBuildOrder && item.overallStatus === "approved" && (
                            <button
                              onClick={() => handleDownloadProject(item.primaryOrder)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                            >
                              <FolderDown className="w-3.5 h-3.5" />
                              Download Project
                            </button>
                          )}

                          {/* Build-on-order download: STRICTLY UNLOCKED ONLY AFTER 75% PAYMENT IS APPROVED */}
                          {item.isBuildOrder && Boolean(
                            (item.finalOrder && item.finalOrder.status === "approved") ||
                            ((item.primaryOrder as any).finalPayment?.status === "approved") ||
                            (item.linkedReq && isReqFinalPaymentVerified(item.linkedReq))
                          ) && (
                            <button
                              onClick={() => {
                                const targetUrl = item.finalOrder?.driveUrl || item.primaryOrder.driveUrl || item.linkedReq?.driveUrl;
                                if (targetUrl) {
                                  window.open(targetUrl, "_blank", "noopener,noreferrer");
                                } else {
                                  handleDownloadProject(item.finalOrder || item.primaryOrder);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                            >
                              <FolderDown className="w-3.5 h-3.5" />
                              Download Project
                            </button>
                          )}

                          {/* Build-on-order: Prompt user to complete 75% payment if not verified (EVEN IF ADMIN CLICKED DELIVERED) */}
                          {item.isBuildOrder && !Boolean(
                            (item.finalOrder && item.finalOrder.status === "approved") ||
                            ((item.primaryOrder as any).finalPayment?.status === "approved") ||
                            (item.linkedReq && isReqFinalPaymentVerified(item.linkedReq))
                          ) && !Boolean(
                            (item.finalOrder && item.finalOrder.status === "pending") ||
                            ((item.primaryOrder as any).finalPayment?.status === "pending") ||
                            (item.linkedReq && isReqFinalPaymentPending(item.linkedReq))
                          ) && (
                            <button
                              onClick={() => {
                                if (item.linkedReq) {
                                  setSelectedReq(item.linkedReq);
                                } else {
                                  setSelectedCatalogFinalOrder(item.primaryOrder);
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all transform hover:scale-[1.02] active:scale-[0.98] animate-pulse cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-slate-950" />
                              Complete 75% Payment to Download
                            </button>
                          )}

                          {/* 75% Payment pending verification notice */}
                          {item.isBuildOrder && !Boolean(
                            (item.finalOrder && item.finalOrder.status === "approved") ||
                            ((item.primaryOrder as any).finalPayment?.status === "approved") ||
                            (item.linkedReq && isReqFinalPaymentVerified(item.linkedReq))
                          ) && Boolean(
                            (item.finalOrder && item.finalOrder.status === "pending") ||
                            ((item.primaryOrder as any).finalPayment?.status === "pending") ||
                            (item.linkedReq && isReqFinalPaymentPending(item.linkedReq))
                          ) && (
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              75% Payment Under Verification
                            </div>
                          )}

                          <button
                            onClick={() => setExpandedOrder(expandedOrder === item.id ? null : item.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold hover:text-white hover:bg-white/10 transition-colors ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {expandedOrder === item.id ? "Hide" : "Details"}
                          </button>

                          {item.overallStatus === "pending" && (
                            <p className="text-yellow-400 text-xs animate-pulse ml-2">⏳ Awaiting admin verification...</p>
                          )}
                          {item.overallStatus === "rejected" && (
                            <div className="w-full mt-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-left space-y-1.5">
                              <div className="flex items-center gap-2 text-red-400 font-bold">
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span>Payment Verification Rejected</span>
                              </div>
                              <p className="text-gray-300">
                                Reason: <strong className="text-red-300">{item.primaryOrder.rejectionReason || "Payment details or screenshot could not be verified by admin."}</strong>
                              </p>
                              <p className="text-gray-400 text-[11px]">
                                Please verify your UTR and upload the correct payment screenshot to restart your project.
                              </p>
                              <div className="pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setResubmitOrderModal(item.primaryOrder);
                                    setResubmitUtr(item.primaryOrder.utrNumber || "");
                                    setResubmitProof("");
                                    setResubmitFileName("");
                                    setResubmitError("");
                                  }}
                                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Resubmit Payment Proof
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Unlocked Deliverables & Documents System for Approved Orders */}
                        {(item.overallStatus === "approved" || (item.advanceOrder && item.advanceOrder.status === "approved")) && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <ProjectDeliverablesSection
                              project={{
                                id: item.primaryOrder.projectId,
                                title: item.cleanTitle,
                                category: (item.projectCategory || "web") as any,
                                price: item.totalAmount,
                                driveUrl: item.primaryOrder.driveUrl,
                                rating: 5,
                                reviewsCount: 1,
                                thumbnail: "/images/projects/default.png",
                                description: item.cleanTitle,
                                sellerName: item.primaryOrder.sellerName || "EduNova Forge Team",
                                techStack: ["Engineering Project Package"],
                                createdAt: item.createdAt,
                                status: "approved",
                                featured: "none"
                              }}
                              isPurchasedAndApproved={true}
                              titleVariant="what_you_receive"
                              showFolderTree={true}
                            />
                          </div>
                        )}
                      </div>

                      {/* Expanded Detail Panel */}
                      <AnimatePresence>
                        {expandedOrder === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 bg-white/[0.02] border-t border-white/5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Invoice ID</span>
                                    <p className="text-white font-mono text-sm">INV-{item.id.replace("ORD-", "")}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Buyer</span>
                                    <p className="text-gray-300">{item.primaryOrder.userName} ({item.primaryOrder.userEmail})</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Payment Method</span>
                                    <p className="text-gray-300">{item.primaryOrder.paymentMethod || "UPI"} / Manual Transfer</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">UTR / Transaction No.</span>
                                    <p className="text-[var(--color-neon-blue)] font-mono font-bold flex items-center gap-1">
                                      <Hash className="w-3 h-3" />
                                      {item.advanceOrder && item.finalOrder
                                        ? `Adv: ${item.advanceOrder.utrNumber || "N/A"} | Final: ${item.finalOrder.utrNumber || "N/A"}`
                                        : item.primaryOrder.utrNumber || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Platform</span>
                                    <p className="text-gray-300">EduNova Forge — Premium Engineering Marketplace</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Curated By</span>
                                    <p className="text-gray-300">EduNova Forge Team</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Transaction Updated</span>
                                    <p className="text-gray-300">{new Date(item.primaryOrder.updatedAt).toLocaleString("en-IN")}</p>
                                  </div>
                                </div>
                              </div>
                              {/* Billing summary */}
                              <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-500">Subtotal</span>
                                  <span className="text-white">₹{item.totalAmount.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-500">Platform Fee</span>
                                  <span className="text-green-400">₹0.00</span>
                                </div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-500">Tax (GST)</span>
                                  <span className="text-white">Included</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 mt-2">
                                  <span className="text-white">Total Amount</span>
                                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)]">₹{item.totalAmount.toLocaleString("en-IN")}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            )}
          </Card>

          {/* Custom Projects Section */}
          <div className="mt-8">
            <Card className="bg-gradient-to-b from-[#1b0f2a]/95 via-[#13081e]/95 to-[#0b0413]/95 border border-purple-500/25 shadow-[0_12px_45px_rgba(168,85,247,0.08)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between mb-6 border-b border-purple-500/20 pb-4 relative z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                    <Rocket className="w-4 h-4 text-purple-400" />
                  </div>
                  Custom Projects
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">{customProjects.length} total</span>
              </div>

              {isLoadingRequests ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 relative z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-3" />
                  <p className="animate-pulse text-sm text-purple-300">Loading your custom projects...</p>
                </div>
              ) : customProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
                  <FileQuestion className="w-10 h-10 text-gray-600 mb-4" />
                  <p className="text-gray-400 mb-2">No custom projects requested yet</p>
                  <p className="text-gray-500 text-xs mb-4 max-w-sm">
                    Have a unique project idea or specific requirements? Submit a custom project request.
                  </p>
                  <Link href="/requests">
                    <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">Request a Project</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4 relative z-10">
                  <AnimatePresence>
                    {customProjects.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-xl bg-gradient-to-r from-purple-500/[0.07] via-white/[0.03] to-white/[0.02] border p-4 transition-all duration-300 ${req.status === "offer_sent" ? "border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.2)] bg-orange-500/[0.06]" : "border-purple-500/20 hover:border-purple-400/50 hover:shadow-[0_4px_20px_rgba(168,85,247,0.12)]"}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div>
                            <h3 className="text-base font-bold text-white leading-tight">{req.projectTitle}</h3>
                            <p className="text-xs text-gray-500 font-mono mt-1">{req.id}</p>
                          </div>
                          {getReqStatusBadge(req.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-white/10">
                          <div>
                            <span className="text-gray-500 uppercase tracking-wider block mb-0.5">Budget</span>
                            {req.negotiationHistory && req.negotiationHistory.length > 0 ? (
                               <span className="flex flex-wrap items-center gap-2">
                                 <span className="line-through text-gray-500 opacity-50">₹{req.budget.toLocaleString("en-IN")}</span>
                                 <span className="text-green-400 font-bold text-sm">₹{req.negotiationHistory[req.negotiationHistory.length - 1].price.toLocaleString("en-IN")}</span>
                               </span>
                            ) : (
                              <span className="text-green-400 font-bold">₹{req.budget.toLocaleString("en-IN")}</span>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row items-end justify-end gap-2">
                            {req.status === "accepted" && !isReqAdvancePaymentVerified(req) && !isReqAdvancePaymentPending(req) && (
                              <Button size="sm" variant="outline" className="text-orange-400 border-orange-500/50 hover:bg-orange-500/10" onClick={() => setSelectedReq(req)}>
                                Pay 25% Advance
                              </Button>
                            )}
                            {["completed", "delivered"].includes(req.status) && !isReqFinalPaymentVerified(req) && !isReqFinalPaymentPending(req) && (
                              <Button size="sm" variant="outline" className="text-[var(--color-neon-blue)] border-[var(--color-neon-blue)]/50 hover:bg-[var(--color-neon-blue)]/10" onClick={() => setSelectedReq(req)}>
                                Pay 75% Balance
                              </Button>
                            )}
                            {["completed", "delivered"].includes(req.status) && isReqFinalPaymentPending(req) && (
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 font-semibold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 animate-pulse" /> 75% Under Review
                              </span>
                            )}
                            {isReqFinalPaymentVerified(req) && (
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Fully Paid &amp; Unlocked
                              </span>
                            )}
                            {/* Download Invoice Buttons for Custom Projects */}
                            {(() => {
                              const advOrder = orders.find(
                                (o) => (o.customRequestId === req.id || o.projectId === req.id) &&
                                  (o.orderType === "advance_payment" || (!o.orderType && isReqAdvancePaymentVerified(req)))
                              );
                              const finOrder = orders.find(
                                (o) => (o.customRequestId === req.id || o.projectId === req.id) && o.orderType === "final_payment"
                              );
                              return (
                                <>
                                  {advOrder && isReqAdvancePaymentVerified(req) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-amber-300 border-amber-500/40 hover:bg-amber-500/15 text-xs flex items-center gap-1"
                                      onClick={() => handleDownloadInvoice(advOrder)}
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      Advance Bill (25%)
                                    </Button>
                                  )}
                                  {isReqFinalPaymentVerified(req) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-purple-300 border-purple-500/40 hover:bg-purple-500/15 text-xs flex items-center gap-1"
                                      onClick={() => {
                                        const reqDiscount = req.finalPayment?.discountApplied || (req as any).discountApplied || (finOrder as any)?.discountApplied || 0;
                                        const agreedTotal = (req as any).agreedPrice || req.budget || (req.finalPayment?.amount ? Math.round((req.finalPayment.amount + reqDiscount) / 0.75) : 5000);
                                        const advAmt = Math.round(agreedTotal * 0.25);

                                        if (finOrder) {
                                          handleDownloadInvoice({
                                            ...finOrder,
                                            discountApplied: reqDiscount,
                                            totalProjectPrice: finOrder.totalProjectPrice || agreedTotal,
                                            advanceAmount: finOrder.advanceAmount || advAmt,
                                          });
                                        } else {
                                          const synthOrder: Order = {
                                            id: `${req.id}-FINAL`,
                                            invoiceId: `EDN-INV-${req.id.slice(0, 7)}-FINAL`,
                                            userId: req.userId,
                                            userName: req.userName,
                                            userEmail: req.userEmail,
                                            projectId: req.id,
                                            projectTitle: req.projectTitle,
                                            projectCategory: (req as any).domain || (req as any).category || "Custom Engineering Project",
                                            sellerName: "EduNova Forge Team",
                                            orderType: "final_payment",
                                            amount: req.finalPayment?.amount || Math.max(0, Math.round(agreedTotal * 0.75) - reqDiscount),
                                            totalProjectPrice: agreedTotal,
                                            advanceAmount: advAmt,
                                            discountApplied: reqDiscount,
                                            utrNumber: req.finalPayment?.utrNumber || (req as any).utrNumber || "VERIFIED_GATEWAY",
                                            status: "approved",
                                            createdAt: req.finalPayment?.verifiedAt || req.updatedAt || new Date().toISOString(),
                                            paymentMethod: "Online UPI / IMPS Transfer",
                                            paymentScreenshot: req.finalPayment?.screenshot || "",
                                            deliveryStatus: "delivered",
                                            deliveredAt: req.updatedAt || new Date().toISOString(),
                                            deadlineDate: req.deadline || "",
                                            updatedAt: new Date().toISOString(),
                                          };
                                          handleDownloadInvoice(synthOrder);
                                        }
                                      }}
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      Final Bill (75%)
                                    </Button>
                                  )}
                                </>
                              );
                            })()}
                            <Button size="sm" variant="outline" onClick={() => setSelectedReq(req)}>
                              <Eye className="w-4 h-4 mr-1.5" />
                              View
                            </Button>
                          </div>
                        </div>

                        {/* 75% Advance Payment Status Banners */}
                        {req.status === "accepted" && !isReqAdvancePaymentVerified(req) && !isReqAdvancePaymentPending(req) && (
                          <div className="mt-3 p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-[11px] font-bold text-center animate-pulse">
                            ⏸️ Building is paused. Waiting for your 25% Advance Payment.
                          </div>
                        )}
                        {isReqAdvancePaymentPending(req) && (
                          <div className="mt-3 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-[11px] font-bold text-center">
                            ✅ 25% Advance Paid — Waiting for team verification. Building will start soon!
                          </div>
                        )}
                        {isReqAdvancePaymentVerified(req) && !["completed", "delivered"].includes(req.status) && (
                          <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-[11px] font-bold text-center">
                            🚀 25% Advance Verified — Team is actively building your project!
                          </div>
                        )}

                        {/* 25% Final Payment Status Banners */}
                        {["completed", "delivered"].includes(req.status) && !isReqFinalPaymentVerified(req) && !isReqFinalPaymentPending(req) && (
                          <div className="mt-3 p-2.5 bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30 rounded-lg text-[var(--color-neon-blue)] text-[11px] font-bold text-center animate-pulse">
                            ⏸️ Delivery is paused. Waiting for your 75% Final Balance Payment.
                          </div>
                        )}
                        {["completed", "delivered"].includes(req.status) && isReqFinalPaymentPending(req) && (
                          <div className="mt-3 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-[11px] font-bold text-center">
                            ✅ 75% Balance Paid — Waiting for team verification. Delivery link coming soon!
                          </div>
                        )}
                        {isReqFinalPaymentVerified(req) && (
                          <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-[11px] font-bold text-center">
                            🎉 Fully Paid &amp; Verified — Your project delivery link is unlocked!
                          </div>
                        )}

                        {/* Inline Project Tracker for all requests */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <ProjectTracker
                            currentStatus={
                              // Cap tracker based on payment status
                              ["completed", "delivered"].includes(req.status) && !isReqFinalPaymentVerified(req)
                                ? "completed"  // Don't show "Delivered" until 75% is verified
                                : req.status
                            }
                            trackingHistory={req.trackingHistory}
                            lastUpdated={req.updatedAt}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </Card>
          </div>

          {/* Support Inquiries & Official Admin Replies Section */}
          <div className="mt-8">
            <Card className="bg-gradient-to-b from-[#0a1e28]/95 via-[#06141c]/95 to-[#040c12]/95 border border-cyan-500/25 shadow-[0_12px_45px_rgba(6,182,212,0.08)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between mb-6 border-b border-cyan-500/20 pb-4 relative z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                  </div>
                  Support Inquiries &amp; Team Replies
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                    {userInquiries.length} {userInquiries.length === 1 ? "inquiry" : "inquiries"}
                  </span>
                  <Link href="/contact">
                    <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-xs">
                      + New Inquiry
                    </Button>
                  </Link>
                </div>
              </div>

              {userInquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
                  <MessageSquare className="w-10 h-10 text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm mb-1 font-semibold">No inquiries submitted yet</p>
                  <p className="text-gray-500 text-xs mb-4 max-w-sm">
                    Have questions about project delivery, customization, or code? Contact our support team.
                  </p>
                  <Link href="/contact">
                    <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10">
                      Contact Support Team
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4 relative z-10">
                  {userInquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className={`rounded-xl border p-5 transition-all ${
                        inq.reply 
                          ? "bg-gradient-to-r from-emerald-950/20 via-white/[0.03] to-white/[0.02] border-emerald-500/30 shadow-[0_4px_25px_rgba(16,185,129,0.1)]"
                          : "bg-white/[0.02] border-white/10 hover:border-cyan-500/30"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div>
                          <h3 className="text-base font-bold text-white leading-tight">{inq.subject}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gray-500 font-mono">{inq.id}</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-[11px] text-gray-400">
                              {new Date(inq.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                        {inq.reply ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                            <CheckCircle className="w-3.5 h-3.5" /> Team Replied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Awaiting Team Reply
                          </span>
                        )}
                      </div>

                      {/* User's Original Message */}
                      <div className="bg-black/40 border border-white/5 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                        <span className="text-gray-500 font-semibold block mb-1">Your Question:</span>
                        {inq.message}
                      </div>

                      {/* Admin's Official Response (Highlighted) */}
                      {inq.reply ? (
                        <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-emerald-950/50 via-emerald-900/30 to-black/60 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                                Official Response from {inq.repliedBy || "EduNova Forge Support Team"}
                              </span>
                            </div>
                            <span className="text-[11px] text-emerald-400/70 font-mono">
                              {inq.repliedAt ? new Date(inq.repliedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap pl-8 font-medium">
                            {inq.reply}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-yellow-400/80 italic flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> The support team is reviewing your message. Their reply will appear right here.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Notifications */}
          <Card className="bg-gradient-to-b from-[#0c221a]/95 via-[#081812]/95 to-[#050f0c]/95 border border-emerald-500/25 shadow-[0_12px_35px_rgba(16,185,129,0.08)] backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4 border-b border-emerald-500/20 pb-3 relative z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                Notifications
              </h2>
              {allNotifications.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {allNotifications.length} updates
                </span>
              )}
            </div>
            {allNotifications.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center relative z-10">No notifications</p>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1 relative z-10 custom-scrollbar">
                {allNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => setSelectedNoticeModal(notif)}
                    className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all cursor-pointer group"
                    title="Click to view complete notice"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {notif.type.includes("approved") && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {notif.type.includes("pending") && <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                        {notif.type.includes("rejected") && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                        {notif.type === "custom_offer" && <IndianRupee className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                        {notif.type === "custom_stage" && <Rocket className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        {notif.type.startsWith("inquiry") && <MessageSquare className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        {notif.type === "general" && <Bell className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                        <span className="text-white font-bold text-xs truncate max-w-[190px]">{notif.title}</span>
                      </div>
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${notif.badgeColor}`}>
                        {notif.badgeText}
                      </span>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-emerald-400/80 group-hover:underline">
                        View Notice &rarr;
                      </span>
                      <p className="text-emerald-400/60 font-mono text-[9px]">
                        {new Date(notif.timestamp).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Complete Notice Viewer Modal ────────────────────────────────────── */}
          <AnimatePresence>
            {selectedNoticeModal && (
              <div
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-left"
                onClick={() => setSelectedNoticeModal(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-[#0e1424] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-400">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white leading-tight">
                          {selectedNoticeModal.title}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(selectedNoticeModal.timestamp).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedNoticeModal(null)}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-sm text-gray-200 leading-relaxed mb-6 whitespace-pre-wrap select-text">
                    {selectedNoticeModal.message}
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                    <Button
                      size="sm"
                      onClick={() => setSelectedNoticeModal(null)}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs"
                    >
                      Close Notice
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Quick Actions */}
          <Card className="bg-gradient-to-b from-[#0e1e35]/95 via-[#091526]/95 to-[#050c18]/95 border border-sky-500/25 shadow-[0_12px_35px_rgba(14,165,233,0.08)] backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4 border-b border-sky-500/20 pb-3 relative z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(14,165,233,0.2)]">
                  <Rocket className="w-3.5 h-3.5 text-sky-400" />
                </div>
                Quick Actions
              </h2>
            </div>
            <div className="flex flex-col gap-3 relative z-10">
              <Link href="/marketplace">
                <Button variant="secondary" fullWidth size="md" className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-400/50 text-amber-200">
                  <ShoppingCart className="w-4 h-4" />
                  Browse Marketplace
                </Button>
              </Link>
              <Link href="/requests">
                <Button variant="outline" fullWidth size="md" className="border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:border-purple-400/50">
                  <FileText className="w-4 h-4" />
                  Request Custom Project
                </Button>
              </Link>
              {approvedOrders.length > 0 && (
                <button
                  onClick={() => approvedOrders.forEach(o => handleDownloadInvoice(o))}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 text-sm font-bold hover:bg-cyan-500/25 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                >
                  <Receipt className="w-4 h-4" />
                  Download All Invoices
                </button>
              )}
              <p className="text-sky-300/60 text-xs text-center pt-1">Discover premium engineering projects curated by EduNova Forge.</p>
            </div>
          </Card>

          {/* Admin Link */}
          {(user.role as string) === "admin" && (
            <Link href="/admin">
              <Button fullWidth variant="outline" size="md" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                Open Admin Panel
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* User Negotiation Modal */}
      <AnimatePresence>
        {selectedReq && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden" onClick={handleCloseModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0b0c10] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col relative"
              style={{ maxHeight: '90vh', height: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* FIXED HEADER */}
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#0b0c10] flex-shrink-0 rounded-t-2xl z-10 sticky top-0">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-neon-blue)]" />
                    Negotiation: {selectedReq.projectTitle}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-1">ID: {selectedReq.id}</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors flex-shrink-0 ml-4"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* SCROLLABLE CONTENT AREA */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 custom-scrollbar min-h-0 bg-transparent">
                
                {/* 1. Project Specs Banner */}
                <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-gray-500 uppercase tracking-wider text-xs font-bold block mb-1">Your Initial Budget</span>
                    <span className="text-green-400 text-lg font-black">₹{selectedReq.budget.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="hidden sm:block w-px h-10 bg-white/10"></div>
                  <div className="sm:text-right">
                    <span className="text-gray-500 uppercase tracking-wider text-xs font-bold block mb-1">Target Deadline</span>
                    <span className="text-white font-semibold text-sm">{new Date(selectedReq.deadline).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* 2. Chat History */}
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20">
                  <div className="p-4 sm:p-6 space-y-6">
                    {/* Initial Budget Bubble */}
                    <div className="flex flex-col items-start">
                      <div className="bg-[var(--color-neon-blue)]/20 border border-[var(--color-neon-blue)]/30 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] sm:max-w-[80%] shadow-md">
                        <div className="text-xs text-[var(--color-neon-blue)] font-bold mb-1">You (Initial Request)</div>
                        <div className="text-sm text-gray-200">
                          Requested budget: <span className="font-bold text-green-400">₹{selectedReq.budget.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1.5 ml-1 font-medium">{new Date(selectedReq.createdAt).toLocaleString("en-IN", { hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' })}</div>
                    </div>

                    {/* Offer History */}
                    {selectedReq.negotiationHistory && selectedReq.negotiationHistory.map((offer) => (
                      <div key={offer.id} className={`flex flex-col ${offer.sentBy === "user" ? "items-start" : "items-end"}`}>
                        <div className={`rounded-2xl px-4 py-3 max-w-[90%] sm:max-w-[80%] shadow-md ${
                          offer.sentBy === "user" 
                            ? "bg-[var(--color-neon-blue)]/20 border border-[var(--color-neon-blue)]/30 rounded-tl-sm" 
                            : "bg-[var(--color-neon-purple)]/20 border border-[var(--color-neon-purple)]/30 rounded-tr-sm"
                        }`}>
                          <div className={`text-xs font-bold mb-1.5 ${offer.sentBy === "user" ? "text-[var(--color-neon-blue)]" : "text-[var(--color-neon-purple)]"}`}>
                            {offer.sentBy === "user" ? "You" : "EduNova Forge Team"}
                          </div>
                          <div className="text-sm text-gray-200 mb-3 whitespace-pre-wrap leading-relaxed">
                            {offer.message}
                          </div>
                          <div className="text-sm font-bold text-green-400 bg-black/30 border border-green-500/20 inline-block px-3 py-1.5 rounded-lg shadow-inner">
                            Proposed Price: ₹{offer.price.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className={`text-[10px] text-gray-500 mt-1.5 font-medium ${offer.sentBy === "user" ? "ml-1" : "mr-1"}`}>
                          {new Date(offer.createdAt).toLocaleString("en-IN", { hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3. Action Area / Form */}
                  {selectedReq.status === "offer_sent" && (
                    <div className="p-4 sm:p-6 border-t border-[var(--color-neon-purple)]/30 bg-[var(--color-neon-purple)]/5">
                      <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <p className="text-sm text-orange-400 font-bold bg-orange-500/10 px-4 py-2 rounded-lg border border-orange-500/20 w-full sm:w-auto">
                          Admin has proposed a new price.
                        </p>
                        <Button 
                          onClick={() => handleAcceptOffer(selectedReq)}
                          disabled={isUpdatingOffer}
                          className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-[0_0_15px_rgba(34,197,94,0.3)] w-full sm:w-auto"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Accept Offer
                        </Button>
                      </div>
                      
                      <div className="pt-5 border-t border-white/10">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">Or send a counter offer:</p>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-full sm:w-1/3">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <input
                                type="number"
                                placeholder="Counter Price (₹)"
                                value={counterPrice}
                                onChange={(e) => setCounterPrice(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)] transition-colors"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                            <textarea
                              placeholder="Explain why you are countering..."
                              value={counterMessage}
                              onChange={(e) => setCounterMessage(e.target.value)}
                              rows={2}
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)] resize-none transition-colors"
                            />
                            <Button 
                              variant="secondary"
                              onClick={handleSendCounterOffer}
                              disabled={!counterPrice || !counterMessage || isUpdatingOffer}
                              className="h-[46px] px-6 rounded-xl w-full sm:w-auto"
                            >
                              {isUpdatingOffer ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                              <span className="sm:hidden ml-2">Send Counter</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedReq.status === "awaiting_final_approval" && (
                    <div className="p-6 border-t border-yellow-500/30 bg-yellow-500/10 flex flex-col items-center justify-center text-yellow-400 gap-3 text-center shadow-inner">
                      <Clock className="w-8 h-8 animate-pulse" />
                      <p className="font-bold text-sm sm:text-base">Your offer acceptance has been submitted.</p>
                      <p className="text-xs text-yellow-500/80">Waiting for EduNova Forge admin to provide final approval to start the project.</p>
                    </div>
                  )}

                  {selectedReq.status === "accepted" && (
                    <div className="p-6 border-t border-green-500/30 bg-green-500/10 flex flex-col items-center justify-center text-green-400 gap-3 text-center shadow-inner relative overflow-hidden">
                      <CheckCircle className="w-8 h-8 shadow-[0_0_20px_rgba(34,197,94,0.4)] rounded-full" />
                      <p className="font-bold text-sm sm:text-base">Project Approved & Price Agreed!</p>
                      
                      {(() => {
                        const isAdvVerified = isReqAdvancePaymentVerified(selectedReq);
                        const isAdvPending = isReqAdvancePaymentPending(selectedReq);

                        if (!isAdvVerified && !isAdvPending) {
                          return (
                            <div className="w-full mt-4 bg-black/40 border border-purple-500/30 p-5 rounded-2xl">
                              <h4 className="text-white font-bold text-lg mb-2">Step 1: 25% Advance Payment</h4>
                              <p className="text-gray-400 text-sm mb-4">
                                Please complete the 25% advance payment (₹{Math.round((selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.25).toLocaleString("en-IN")}) to start the planning and development phase.
                              </p>

                              <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-center p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-center overflow-hidden">
                                  <img src={getEffectiveQrCodeUrl(Math.round((selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.25), platformSettings)} alt="QR Code" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
                                </div>
                                <div className="text-center sm:text-left space-y-1.5">
                                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Scan QR or pay to UPI ID:</p>
                                  <div className="bg-black/50 border border-white/10 px-3 py-2 rounded-lg text-white font-mono text-sm tracking-wide select-all">
                                    {platformSettings.upiId || "edunova@paytm"}
                                  </div>
                                  <p className="text-[10px] text-gray-500 font-medium">Name: EduNova Forge Technologies</p>
                                </div>
                              </div>

                              <form onSubmit={handleSubmitAdvancePayment} className="flex flex-col gap-3 max-w-md mx-auto">
                                <input
                                  type="text"
                                  placeholder="Enter UTR / Transaction ID"
                                  value={paymentUtr}
                                  onChange={(e) => setPaymentUtr(e.target.value)}
                                  required
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleFileSelect}
                                />
                                {paymentScreenshotBase64 ? (
                                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                                    <span className="text-xs text-green-400 flex items-center gap-1.5 truncate pr-2">
                                      <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                      {paymentScreenshotName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => { setPaymentScreenshotBase64(""); setPaymentScreenshotName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                      className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-wider font-bold"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center ${
                                      isDragging ? "border-purple-500 bg-purple-500/10" : "border-white/20 hover:border-purple-500/50 bg-black/20"
                                    }`}
                                  >
                                    <Upload className={`w-5 h-5 mx-auto mb-1 ${isDragging ? "text-purple-400" : "text-gray-400"}`} />
                                    <p className={`text-xs ${isDragging ? "text-purple-400" : "text-gray-400"}`}>
                                      {isDragging ? "Drop image here" : "Upload Payment Screenshot (Max 1MB)"}
                                    </p>
                                  </div>
                                )}
                                {paymentError && <p className="text-xs text-red-400 text-left">{paymentError}</p>}
                                
                                <Button type="submit" disabled={isPaying || !paymentUtr || !paymentScreenshotBase64} className="bg-purple-500 hover:bg-purple-600 text-white w-full">
                                  {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Payment"}
                                </Button>
                              </form>
                            </div>
                          );
                        } else if (isAdvPending) {
                          return (
                            <div className="w-full mt-4 bg-black/40 border border-yellow-500/30 p-5 rounded-2xl text-center">
                              <Clock className="w-10 h-10 mx-auto mb-3 text-yellow-400 animate-pulse" />
                              <h4 className="text-white font-bold text-lg mb-2">25% Advance Payment Submitted</h4>
                              <p className="text-yellow-400 text-sm font-bold mb-1">₹{Math.round((selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.25).toLocaleString("en-IN")} Paid</p>
                              <p className="text-gray-400 text-xs">Waiting for EduNova Forge team to verify your payment. Building will start once verified!</p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="w-full mt-4 bg-black/40 border border-green-500/30 p-5 rounded-2xl text-center">
                              <Rocket className="w-10 h-10 mx-auto mb-3 text-green-400" />
                              <h4 className="text-white font-bold text-lg mb-2">25% Advance Verified ✅</h4>
                              <p className="text-green-400 text-sm font-bold mb-1">Our team is actively building your project!</p>
                              <p className="text-gray-400 text-xs">Track the live progress in the Project Tracker below.</p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}

                  {["completed", "delivered"].includes(selectedReq.status) && (
                    <div className="p-6 border-t border-[var(--color-neon-blue)]/30 bg-[var(--color-neon-blue)]/10 flex flex-col items-center justify-center text-[var(--color-neon-blue)] gap-3 text-center shadow-inner relative overflow-hidden">
                      <Package className="w-8 h-8 shadow-[0_0_20px_rgba(0,195,255,0.4)] rounded-full" />
                      <p className="font-bold text-sm sm:text-base">Project Development Completed!</p>
                      
                      {(() => {
                        const isFinalVerified = isReqFinalPaymentVerified(selectedReq);
                        const isFinalPending = isReqFinalPaymentPending(selectedReq);

                        if (!isFinalVerified && !isFinalPending) {
                          const agreedTotal = Number(selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget);
                          const advTotal = Math.round(agreedTotal * 0.25);
                          const baseFinalAmount = Math.max(0, agreedTotal - advTotal);
                          const discountToApply = (!user.rewardRedeemed && (user.availableDiscount || 0) > 0) ? (user.availableDiscount || 0) : 0;
                          const finalTotalToPay = Math.max(0, baseFinalAmount - discountToApply);

                          return (
                            <div className="w-full mt-4 bg-black/40 border border-blue-500/30 p-5 rounded-2xl">
                              <h4 className="text-white font-bold text-lg mb-2">Step 2: 75% Final Balance Payment</h4>
                              <p className="text-gray-400 text-sm mb-4">
                                Please complete the 75% balance payment to unlock your project deliverables and Google Drive delivery link.
                              </p>
                              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 text-left max-w-sm mx-auto">
                                <div className="flex justify-between text-xs mb-2">
                                  <span className="text-gray-400">Total Project Price</span>
                                  <span className="text-white">₹{agreedTotal.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex justify-between text-xs mb-2">
                                  <span className="text-gray-400">25% Advance Paid</span>
                                  <span className="text-emerald-400">₹{advTotal.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex justify-between text-xs mb-2">
                                  <span className="text-gray-400">Base Final Amount (75%)</span>
                                  <span className="text-white font-bold">₹{baseFinalAmount.toLocaleString("en-IN")}</span>
                                </div>
                                {user.rewardRedeemed ? (
                                  <div className="flex justify-between text-xs mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-gray-500 line-through">Referral Discount</span>
                                      <span className="text-[9px] bg-gray-600/30 text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">🔒 Redeemed</span>
                                    </div>
                                    <span className="text-gray-500 line-through">₹0</span>
                                  </div>
                                ) : (user.availableDiscount || 0) > 0 && (
                                  <div className="flex justify-between text-xs mb-2">
                                    <div className="flex flex-col">
                                      <span className="text-green-400">Referral Discount</span>
                                      <span className="text-[9px] text-green-500/70 italic">
                                        ({(user.availableDiscount ?? 0) > 150 ? "₹75" : "₹50"} earned per ₹1,000 project value)
                                      </span>
                                    </div>
                                    <span className="text-green-400">-₹{(user.availableDiscount || 0).toLocaleString("en-IN")}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 mt-2">
                                  <span className="text-[var(--color-neon-blue)]">Total to Pay</span>
                                  <span className="text-[var(--color-neon-blue)]">₹{finalTotalToPay.toLocaleString("en-IN")}</span>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-center p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-center overflow-hidden">
                                  <img src={getEffectiveQrCodeUrl(finalTotalToPay, platformSettings)} alt="QR Code" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
                                </div>
                                <div className="text-center sm:text-left space-y-1.5">
                                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Scan QR or pay to UPI ID:</p>
                                  <div className="bg-black/50 border border-white/10 px-3 py-2 rounded-lg text-white font-mono text-sm tracking-wide select-all">
                                    {platformSettings.upiId || "edunova@paytm"}
                                  </div>
                                  <p className="text-[10px] text-gray-500 font-medium">Name: EduNova Forge Technologies</p>
                                </div>
                              </div>

                              <form onSubmit={handleSubmitFinalPayment} className="flex flex-col gap-3 max-w-md mx-auto">
                                <input
                                  type="text"
                                  placeholder="Enter UTR / Transaction ID"
                                  value={paymentUtr}
                                  onChange={(e) => setPaymentUtr(e.target.value)}
                                  required
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />

                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleFileSelect}
                                />
                                {paymentScreenshotBase64 ? (
                                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                                    <span className="text-xs text-green-400 flex items-center gap-1.5 truncate pr-2">
                                      <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                      {paymentScreenshotName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => { setPaymentScreenshotBase64(""); setPaymentScreenshotName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                      className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-wider font-bold"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center ${
                                      isDragging ? "border-blue-500 bg-blue-500/10" : "border-white/20 hover:border-blue-500/50 bg-black/20"
                                    }`}
                                  >
                                    <Upload className={`w-5 h-5 mx-auto mb-1 ${isDragging ? "text-blue-400" : "text-gray-400"}`} />
                                    <p className={`text-xs ${isDragging ? "text-blue-400" : "text-gray-400"}`}>
                                      {isDragging ? "Drop image here" : "Upload Payment Screenshot (Max 1MB)"}
                                    </p>
                                  </div>
                                )}
                                {paymentError && <p className="text-xs text-red-400 text-left">{paymentError}</p>}

                                <Button type="submit" disabled={isPaying || !paymentUtr || !paymentScreenshotBase64} className="bg-blue-500 hover:bg-blue-600 text-white w-full">
                                  {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Final Payment"}
                                </Button>
                              </form>
                            </div>
                          );
                        } else if (isFinalPending) {
                          const agreedTotal = Number(selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget);
                          const advTotal = Math.round(agreedTotal * 0.25);
                          const baseFinalAmount = Math.max(0, agreedTotal - advTotal);
                          return (
                            <div className="w-full mt-4 bg-black/40 border border-yellow-500/30 p-5 rounded-2xl text-center">
                              <Clock className="w-10 h-10 mx-auto mb-3 text-yellow-400 animate-pulse" />
                              <h4 className="text-white font-bold text-lg mb-2">75% Final Balance Payment Submitted</h4>
                              <p className="text-yellow-400 text-sm font-bold mb-1">₹{baseFinalAmount.toLocaleString("en-IN")} Paid</p>
                              <p className="text-gray-400 text-xs">Waiting for EduNova Forge team to verify your payment. Delivery link will be unlocked once verified!</p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="w-full mt-4 bg-green-500/10 border border-green-500/30 p-5 rounded-2xl text-center">
                              <Package className="w-10 h-10 mx-auto mb-3 text-green-400" />
                              <h4 className="text-green-400 font-bold text-lg mb-2">✅ Final Payment Verified</h4>
                              <p className="text-gray-300 text-sm mb-4">
                                Your project files and resources are now available.
                              </p>
                              <div className="flex flex-col gap-3">
                                {selectedReq.driveUrl ? (
                                  <a
                                    href={selectedReq.driveUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(0,195,255,0.3)] hover:scale-[1.02] transition-transform"
                                  >
                                    <FolderDown className="w-5 h-5" />
                                    Access Project Files (Google Drive)
                                  </a>
                                ) : (
                                  <p className="text-yellow-400 text-sm">Waiting for admin to upload the project delivery link...</p>
                                )}
                                {selectedReq.demoVideoUrl ? (
                                  <a
                                    href={selectedReq.demoVideoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--color-neon-purple)] to-pink-500 text-white font-bold py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02] transition-transform"
                                  >
                                    <Eye className="w-5 h-5" />
                                    Watch Demo Video
                                  </a>
                                ) : (
                                  <p className="text-gray-500 text-xs">Demo video not yet uploaded by the team.</p>
                                )}
                              </div>
                            </div>
                          );
                        }
                      })()}
                      
                      {/* Feedback Section (only after delivery) */}
                      {isReqFinalPaymentVerified(selectedReq) && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                          {selectedReq.feedback ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                              <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                                <span className="text-yellow-400">★</span> Your Feedback
                              </h4>
                              <div className="flex mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span key={star} className={`text-lg ${star <= selectedReq.feedback!.rating ? "text-yellow-400" : "text-gray-600"}`}>
                                    ★
                                  </span>
                                ))}
                              </div>
                              <p className="text-sm text-gray-300 italic">"{selectedReq.feedback.comment}"</p>
                              <p className="text-xs text-gray-500 mt-2">{new Date(selectedReq.feedback.createdAt).toLocaleDateString()}</p>
                            </div>
                          ) : (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                              <h4 className="text-white font-bold mb-3">Rate your experience</h4>
                              <p className="text-xs text-gray-400 mb-4">How was the project delivery and our overall service?</p>
                              
                              <div className="flex mb-4 gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => setFeedbackRating(star)}
                                    className={`text-2xl transition-colors ${star <= feedbackRating ? "text-yellow-400 hover:text-yellow-300" : "text-gray-600 hover:text-gray-400"}`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                              
                              <textarea
                                value={feedbackComment}
                                onChange={(e) => setFeedbackComment(e.target.value)}
                                placeholder="Share your feedback about the project and our service..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-neon-purple)] transition-colors min-h-[100px] mb-4"
                              />
                              
                              <Button
                                onClick={async () => {
                                  if (!feedbackComment.trim()) return alert("Please enter a comment");
                                  setIsSubmittingFeedback(true);
                                  try {
                                    const { updateCustomRequestFields } = await import("@/lib/data/customRequests");
                                    const feedbackData = {
                                      rating: feedbackRating,
                                      comment: feedbackComment,
                                      createdAt: new Date().toISOString()
                                    };
                                    const updated = await updateCustomRequestFields(
                                      selectedReq.id,
                                      { feedback: feedbackData }
                                    );
                                    if (updated) {
                                      setCustomRequests(customRequests.map(r => r.id === updated.id ? updated : r));
                                      setSelectedReq(updated);
                                      alert("Thank you for your feedback!");
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    alert("Failed to submit feedback. Try again.");
                                  } finally {
                                    setIsSubmittingFeedback(false);
                                  }
                                }}
                                disabled={isSubmittingFeedback || !feedbackComment.trim()}
                                className="w-full bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] text-white font-bold"
                              >
                                {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Resubmit Payment Proof Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {resubmitOrderModal && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-left overflow-y-auto"
            onClick={() => setResubmitOrderModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0e1424] border border-red-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      Resubmit Payment Proof
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                      Order #{resubmitOrderModal.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setResubmitOrderModal(null)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Admin Rejection Reason Alert */}
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 mb-4 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-red-400">
                  <XCircle className="w-4 h-4 shrink-0" />
                  Admin Rejection Reason:
                </p>
                <p className="font-semibold text-white pl-5.5">
                  &ldquo;{resubmitOrderModal.rejectionReason || "Payment screenshot or UTR could not be verified."}&rdquo;
                </p>
                <p className="text-[11px] text-gray-400 pl-5.5 pt-0.5">
                  Please verify your transaction in your banking/UPI app, ensure the amount matches the required advance, and provide a clear screenshot.
                </p>
              </div>

              {/* Order Financial Breakdown */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 space-y-1.5 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Project:</span>
                  <span className="text-white font-semibold truncate max-w-[240px]">{resubmitOrderModal.projectTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Project Price:</span>
                  <span className="text-white font-bold">₹{(resubmitOrderModal.totalProjectPrice || resubmitOrderModal.amount).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400">Required 25% Advance:</span>
                  <span className="text-amber-300 font-bold">₹{(resubmitOrderModal.advanceAmount || resubmitOrderModal.amount).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Remaining 75% Balance:</span>
                  <span className="text-gray-300">₹{(resubmitOrderModal.balanceAmount ?? Math.max(0, (resubmitOrderModal.totalProjectPrice || resubmitOrderModal.amount) - (resubmitOrderModal.advanceAmount || resubmitOrderModal.amount))).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* UPI & QR Code Reference */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center justify-center p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="bg-white p-1.5 rounded-lg shadow flex items-center justify-center shrink-0">
                  <img
                    src={getEffectiveQrCodeUrl(resubmitOrderModal.advanceAmount || resubmitOrderModal.amount, platformSettings)}
                    alt="UPI QR Code"
                    className="w-20 h-20 object-contain"
                  />
                </div>
                <div className="text-center sm:text-left text-xs space-y-1">
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Pay 25% Advance To:</p>
                  <p className="font-mono text-cyan-300 font-bold bg-black/40 px-2 py-1 rounded select-all border border-white/10 text-[11px]">
                    {platformSettings.upiId || "edunova@paytm"}
                  </p>
                  <p className="text-[10px] text-gray-500">EduNova Forge Technologies</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleResubmitPayment} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    UTR / Transaction ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 12-digit UTR or Transaction ID"
                    value={resubmitUtr}
                    onChange={(e) => setResubmitUtr(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Correct Payment Screenshot <span className="text-red-400">*</span>
                  </label>
                  <input
                    ref={resubmitFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleResubmitFileSelect}
                  />

                  {resubmitProof ? (
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                      <span className="text-xs text-green-400 flex items-center gap-1.5 truncate pr-2">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {resubmitFileName || "New Payment Screenshot"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setResubmitProof("");
                          setResubmitFileName("");
                          if (resubmitFileRef.current) resubmitFileRef.current.value = "";
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-wider font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => resubmitFileRef.current?.click()}
                      className="w-full p-4 border-2 border-dashed border-white/20 hover:border-cyan-400/50 rounded-xl cursor-pointer transition-colors text-center bg-black/20"
                    >
                      <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                      <p className="text-xs text-gray-300 font-medium">Click to upload corrected payment screenshot</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">PNG, JPG, or WEBP (max 5MB)</p>
                    </div>
                  )}
                </div>

                {resubmitError && (
                  <p className="text-xs text-red-400 font-semibold">{resubmitError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResubmitOrderModal(null)}
                    disabled={isResubmitting}
                    className="border-white/10 text-gray-300 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isResubmitting || !resubmitUtr.trim() || !resubmitProof}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs"
                  >
                    {isResubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Resubmitting...
                      </>
                    ) : (
                      "Submit for Verification"
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>

      {/* ── 75% Final Balance Payment Modal for Catalog Build Orders ─────────── */}
      {selectedCatalogFinalOrder && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => setSelectedCatalogFinalOrder(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-amber-500/40 bg-[#0c0d1e] p-6 text-left shadow-[0_0_50px_rgba(245,158,11,0.25)] my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Complete 75% Final Payment</h3>
              </div>
              <button
                onClick={() => setSelectedCatalogFinalOrder(null)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const total = selectedCatalogFinalOrder.totalProjectPrice || (selectedCatalogFinalOrder.orderType === "advance_payment" ? Math.round(selectedCatalogFinalOrder.amount * 4) : selectedCatalogFinalOrder.amount);
              const advance = selectedCatalogFinalOrder.advanceAmount || (selectedCatalogFinalOrder.orderType === "advance_payment" ? selectedCatalogFinalOrder.amount : Math.round(total * 0.25));
              const baseFinal = Math.max(0, total - advance);
              const discount = (!user?.rewardRedeemed && (user?.availableDiscount || 0) > 0) ? (user?.availableDiscount || 0) : 0;
              const toPay = Math.max(0, baseFinal - discount);

              return (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
                    <p className="font-bold text-sm text-white">{selectedCatalogFinalOrder.projectTitle}</p>
                    <div className="flex justify-between text-gray-400">
                      <span>Total Project Price:</span>
                      <span className="text-gray-200 font-semibold">₹{total.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>25% Advance Paid:</span>
                      <span className="text-emerald-400 font-semibold">₹{advance.toLocaleString("en-IN")}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Referral Discount:</span>
                        <span>- ₹{discount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 text-amber-400">
                      <span>75% Final Amount Due:</span>
                      <span>₹{toPay.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* QR Code and UPI Details */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center p-3.5 bg-white/5 border border-white/10 rounded-xl">
                    <div className="bg-white p-2 rounded-xl shadow-lg shrink-0">
                      <img
                        src={getEffectiveQrCodeUrl(toPay, platformSettings)}
                        alt="QR Code"
                        className="w-24 h-24 object-contain"
                      />
                    </div>
                    <div className="space-y-1 text-center sm:text-left text-xs">
                      <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Scan QR or pay UPI ID:</p>
                      <p className="font-mono text-white text-sm bg-black/40 px-2 py-1 rounded border border-white/10 select-all font-bold">
                        {platformSettings.upiId || "edunova@paytm"}
                      </p>
                      <p className="text-[10px] text-gray-400">Name: EduNova Forge Technologies</p>
                    </div>
                  </div>

                  {/* Payment Proof Submission */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!paymentUtr.trim()) {
                        alert("Please enter the UTR / Transaction ID");
                        return;
                      }
                      if (!paymentScreenshotBase64) {
                        alert("Please upload payment screenshot proof");
                        return;
                      }
                      setIsPaying(true);
                      try {
                        const order = await createOrder(
                          user!.id,
                          user!.email,
                          user!.name,
                          {
                            id: selectedCatalogFinalOrder.projectId,
                            title: `Final Balance (75%): ${selectedCatalogFinalOrder.projectTitle}`,
                            category: selectedCatalogFinalOrder.projectCategory || "project",
                            sellerName: selectedCatalogFinalOrder.sellerName || "EduNova Forge Team",
                            price: baseFinal,
                          },
                          paymentScreenshotBase64,
                          paymentUtr,
                          "UPI",
                          "final_payment"
                        );

                        try {
                          const { updateDoc, doc } = await import("firebase/firestore");
                          const { db } = await import("@/lib/firebase");
                          const now = new Date().toISOString();
                          await updateDoc(doc(db, "orders", selectedCatalogFinalOrder.id), {
                            finalPayment: {
                              amount: order.amount,
                              utrNumber: paymentUtr.trim(),
                              screenshot: order.paymentScreenshot,
                              discountApplied: order.discountApplied || 0,
                              status: "pending",
                              submittedAt: now,
                            },
                            updatedAt: now,
                          });
                        } catch (docErr) {
                          console.warn("Updated catalog order doc warning:", docErr);
                        }

                        sendNotification("payment_submitted", {
                          userEmail: user!.email,
                          userName: user!.name,
                          orderId: selectedCatalogFinalOrder.id,
                          projectTitle: selectedCatalogFinalOrder.projectTitle,
                          amount: order.amount,
                          utrNumber: paymentUtr.trim(),
                        });

                        const o = await getOrdersByUser(user!.id);
                        setOrders(o);
                        setSelectedCatalogFinalOrder(null);
                        setPaymentUtr("");
                        setPaymentScreenshotBase64("");
                        setPaymentScreenshotName("");
                        alert("75% Final payment submitted successfully! Files will unlock once verified by admin.");
                      } catch (err: any) {
                        console.error("Payment submission error:", err);
                        if (err instanceof DuplicateUtrError) {
                          alert(err.message);
                        } else {
                          alert("Failed to submit payment: " + (err?.message || err));
                        }
                      } finally {
                        setIsPaying(false);
                      }
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                        Bank Transaction / UTR Number
                      </label>
                      <input
                        type="text"
                        placeholder="12-digit UPI / Bank UTR Number"
                        value={paymentUtr}
                        onChange={(e) => setPaymentUtr(e.target.value)}
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    {paymentScreenshotBase64 ? (
                      <div className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-xl">
                        <span className="text-xs text-green-400 flex items-center gap-1.5 truncate pr-2">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {paymentScreenshotName}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setPaymentScreenshotBase64(""); setPaymentScreenshotName(""); }}
                          className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-4 border border-dashed border-white/20 hover:border-amber-400/50 rounded-xl cursor-pointer text-center bg-black/20"
                      >
                        <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                        <p className="text-xs text-gray-400">Click to upload 75% payment screenshot</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isPaying || !paymentUtr || !paymentScreenshotBase64}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-2.5 text-xs uppercase tracking-wider"
                    >
                      {isPaying ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : "Submit 75% Payment Proof"}
                    </Button>
                  </form>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
