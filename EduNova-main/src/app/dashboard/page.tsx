"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getOrdersByUser, Order, createOrder, DuplicateUtrError } from "@/lib/data/orders";
import { getUserCustomRequests, CustomRequest, CustomRequestStatus, addNegotiationOffer, updateCustomRequestStatus, updateCustomRequestFields } from "@/lib/data/customRequests";
import { generateInvoice } from "@/lib/invoiceGenerator";
import { sendNotification } from "@/lib/notifications";
import { compressImage } from "@/lib/imageUtils";
import { getReferralsByUser, Referral } from "@/lib/data/referrals";
import { getUserInquiries, ContactMessage } from "@/lib/data/contact";
import { ProjectTracker, DEFAULT_MILESTONES } from "@/components/ui/ProjectTracker";
import { getPlatformSettings, getEffectiveQrCodeUrl } from "@/lib/data/settings";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Download, FileText, Clock, CheckCircle, XCircle,
  ShoppingCart, AlertTriangle, Receipt, FolderDown, Eye, Hash, Bell,
  FileQuestion, Loader2, MessageSquare, Send, IndianRupee, Rocket, Truck, Upload, Gift, Share2, Copy
} from "lucide-react";

function StatusBadge({ status }: { status: Order["status"] }) {
  const config = {
    pending: { label: "Pending Approval", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    approved: { label: "Approved", icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
    rejected: { label: "Rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  };
  const c = config[status];
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
  const { user } = useAuth();
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

  const stopPolling = useRef(false);

  useEffect(() => {
    if (user && !stopPolling.current) {
      const fetchOrdersAndRequests = async () => {
        setFetchError(null);
        try {
          const o = await getOrdersByUser(user.id);
          setOrders(o);
        } catch(err: any) {
          console.warn("Notice fetching orders:", err?.message || err);
          if (err?.code === 'resource-exhausted' || err?.message?.includes('quota')) {
            console.warn("Quota exceeded, stopping dashboard polling.");
            stopPolling.current = true;
          }
        }

        if (customRequests.length === 0 && !stopPolling.current) setIsLoadingRequests(true);
        if (!stopPolling.current) {
          try {
            const reqs = await getUserCustomRequests(user.id);
            setCustomRequests(reqs);
          } catch (err: any) {
            console.warn("Notice fetching user requests:", err?.message || err);
            if (err?.code === 'resource-exhausted' || err?.message?.includes('quota')) {
              stopPolling.current = true;
            }
          } finally {
            setIsLoadingRequests(false);
          }
          
          try {
            const refs = await getReferralsByUser(user.id);
            setReferrals(refs);
          } catch (err: any) {
            console.warn("Notice fetching referrals:", err?.message || err);
          }
        }
      };
      
      fetchOrdersAndRequests();
    }
  }, [user, refreshKey]);

  // Live poll for user support inquiries and official admin replies
  useEffect(() => {
    if (!user?.email) return;
    const loadInquiries = () => {
      getUserInquiries(user.email).then((msgs) => {
        if (Array.isArray(msgs)) setUserInquiries(msgs);
      });
    };
    loadInquiries();
    const timer = setInterval(loadInquiries, 4000);
    return () => clearInterval(timer);
  }, [user?.email]);

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

  const pendingOrders = orders.filter(o => o.status === "pending");
  const approvedOrders = orders.filter(o => o.status === "approved");
  const totalSpent = approvedOrders.reduce((sum, o) => sum + o.amount, 0);

  // Filter ONLY true custom projects submitted via /requests (keep website catalog orders in Orders)
  const customProjects = customRequests.filter((req) => {
    if (req.source === "catalog_order" || (req as any).requestType === "catalog_order") return false;
    const linkedOrder = orders.find((o) => o.customRequestId === req.id);
    if (linkedOrder && (!linkedOrder.orderType || linkedOrder.orderType === "advance_payment")) {
      return false;
    }
    return true;
  });

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
      const blob = new Blob(
        [`EduNova Project: ${order.projectTitle}\n\nThank you for your purchase!\n\nOrder: ${order.id}\nCategory: ${order.projectCategory}\n\nProject files would be delivered here in production.\nContact team@edunova.com for support.`],
        { type: "text/plain" }
      );
      
      const cleanTitle = order.projectTitle.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
      const filename = `EduNova_Project_${cleanTitle}_${order.id}.zip`;
      
      const { secureApiDownload } = await import("@/lib/downloadUtils");
      secureApiDownload(blob, filename, "zip");

    } catch (error) {
      console.error("Failed to download project:", error);
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
    const advanceAmount = agreedPrice * 0.25;

    try {
      const order = await createOrder(
        user.id,
        user.email,
        user.name,
        { id: selectedReq.id, title: `Advance (25%): ${selectedReq.projectTitle}`, category: "custom_request", sellerName: "EduNova Team", price: advanceAmount },
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
      alert("Advance payment submitted successfully! Awaiting admin verification.");
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
    const baseFinalAmount = agreedPrice * 0.75;

    try {
      const order = await createOrder(
        user.id,
        user.email,
        user.name,
        { id: selectedReq.id, title: `Final (75%): ${selectedReq.projectTitle}`, category: "custom_request", sellerName: "EduNova Team", price: baseFinalAmount },
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
          r => ["completed", "delivered"].includes(r.status) && (!r.finalPayment || r.finalPayment.status === "pending")
        );
        if (!readyForDelivery) return null;
        return (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-emerald-600/20 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_35px_rgba(59,130,246,0.2)]">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/25 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">Action Required</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold border border-emerald-500/30">
                    🎉 Project Finished
                  </span>
                </div>
                <h3 className="text-white text-base font-bold">
                  "{readyForDelivery.projectTitle}" is ready for delivery!
                </h3>
                <p className="text-gray-300 text-xs">
                  Pay the remaining 75% payment to unlock instant download access to your project files and Google Drive resources.
                </p>
              </div>
            </div>
            <Button
              size="md"
              onClick={() => setSelectedReq(readyForDelivery)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.35)]"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Pay 75% &amp; Unlock Files
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
      <Card className={`mb-10 relative overflow-hidden bg-gradient-to-br from-[#1a1506]/95 via-[#101912]/95 to-[#09120e]/95 backdrop-blur-xl border ${user.referralCompleted ? "border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]" : user.referralUnlocked ? "border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]" : "border-amber-500/25 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"}`}>
        <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 ${user.referralCompleted ? "bg-emerald-500/20" : user.referralUnlocked ? "bg-green-500/20" : "bg-amber-500/10"}`}></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-3xl pointer-events-none -ml-12 -mb-12 bg-emerald-500/10"></div>

        {/* STATE 1: Referral NOT unlocked yet */}
        {!user.referralUnlocked && (
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

        {/* STATE 2: Referral COMPLETED — one successful referral done */}
        {user.referralUnlocked && user.referralCompleted && (
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                {user.rewardRedeemed ? "🔒 Referral Reward Redeemed" : "🎉 Referral Reward Unlocked!"}
              </h2>
              <p className="text-emerald-300 text-sm font-semibold mb-2">
                {user.rewardRedeemed 
                  ? "Your referral discount has been successfully applied to your final payment." 
                  : "Referral completed for this order. Your discount has been applied!"}
              </p>
              <p className="text-gray-400 text-xs mb-4">
                {user.rewardRedeemed 
                  ? `Redeemed on ${user.rewardRedeemedAt ? new Date(user.rewardRedeemedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A"}. This coupon cannot be reused.`
                  : "You\u0027ve reached the maximum of 1 successful referral. The earned discount will be automatically deducted from your remaining 75% project payment."}
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-xl text-gray-500 font-mono text-lg tracking-wider">
                  {user.referralCode}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-xl ${user.rewardRedeemed ? "text-gray-400 bg-gray-600/20 border border-gray-500/30" : "text-gray-600 bg-white/5 border border-white/10"}`}>
                  {user.rewardRedeemed ? "🔒 Coupon Used" : "Referral Closed"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
                <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Successful: {referrals.filter(r => r.status === "successful").length}/{user.maxReferralAllowed || 1}
                </div>
                {user.rewardRedeemed ? (
                  <div className="bg-gray-600/10 text-gray-400 px-3 py-1.5 rounded-lg border border-gray-500/20 flex items-center gap-2">
                    🔒 Discount Redeemed — One-time use only
                  </div>
                ) : (user.availableDiscount || 0) > 0 && (
                  <div className="bg-white/5 text-gray-400 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-emerald-400" />
                    {(user.availableDiscount ?? 0) > 150 ? "₹75" : "₹50"} earned per ₹1,000 project value
                  </div>
                )}
              </div>
            </div>

            <div className={`w-full md:w-auto p-6 rounded-2xl flex flex-col items-center justify-center text-center min-w-[250px] shadow-inner ${user.rewardRedeemed ? "bg-black/40 border border-gray-500/30" : "bg-black/40 border border-emerald-500/30"}`}>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-bold">
                {user.rewardRedeemed ? "Discount Used" : "Discount Earned"}
              </p>
              <p className={`text-4xl font-black mb-1 ${user.rewardRedeemed ? "text-gray-500 line-through" : "text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-green-600"}`}>
                ₹{(user.availableDiscount || 0).toLocaleString("en-IN")}
              </p>
              <p className={`text-[10px] font-medium leading-tight max-w-[200px] ${user.rewardRedeemed ? "text-gray-500" : "text-emerald-400/80"}`}>
                {user.rewardRedeemed ? "Successfully applied. No further usage allowed." : "Auto-applied to your next 75% final payment!"}
              </p>
            </div>
          </div>
        )}

        {/* STATE 3: Referral ACTIVE — unlocked but not completed */}
        {user.referralUnlocked && !user.referralCompleted && (
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                <Gift className="w-6 h-6 text-green-400" />
                Refer &amp; Earn a Discount!
              </h2>
              <p className="text-gray-300 text-sm mb-4">
                Invite a friend and earn a discount on your <strong className="text-white">remaining 75% payment</strong>:
              </p>
              <div className="flex flex-wrap gap-3 mb-4 text-xs">
                <div className="bg-green-500/10 border border-green-500/20 text-green-300 px-3 py-1.5 rounded-lg">
                  Projects up to ₹3,000 → <strong className="text-green-400">₹50 per ₹1,000</strong>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg">
                  Projects above ₹3,000 → <strong className="text-emerald-400">₹75 per ₹1,000</strong>
                </div>
              </div>
              <p className="text-yellow-400 text-xs font-bold mb-4">Only 1 successful referral allowed per project.</p>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-xl text-white font-mono text-lg tracking-wider flex items-center gap-3">
                  {user.referralCode}
                  <button onClick={() => {
                    navigator.clipboard.writeText(user.referralCode || "");
                    alert("Referral code copied!");
                  }} className="text-gray-400 hover:text-white transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => {
                  const url = `${window.location.origin}/?ref=${user.referralCode}`;
                  navigator.clipboard.writeText(url);
                  alert("Referral link copied!");
                }} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl transition-colors">
                  <Share2 className="w-4 h-4" />
                  Copy Link
                </button>
              </div>
              <div className="mt-4 flex gap-4 text-xs font-semibold">
                <div className="bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                  Pending: {referrals.filter(r => r.status === "pending").length}
                </div>
                <div className="bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20">
                  Successful: {referrals.filter(r => r.status === "successful").length}/{user.maxReferralAllowed || 1}
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto bg-black/40 border border-green-500/30 p-6 rounded-2xl flex flex-col items-center justify-center text-center min-w-[250px] shadow-inner">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-bold">Discount Balance</p>
              <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600 mb-1">
                ₹{(user.availableDiscount || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-green-400/80 text-[10px] font-medium leading-tight max-w-[200px]">
                Auto-applied to your next 75% final payment!
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
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">{orders.length} total</span>
            </div>

            {orders.length === 0 ? (
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
                  {orders.map((order) => {
                    const isBuildOrder = order.orderType === "advance_payment" || !!order.customRequestId;
                    const linkedReq = customRequests.find((r) => r.id === order.customRequestId);
                    const currentBuildStage = order.buildStage || linkedReq?.status || "planning";

                    return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-gradient-to-r from-indigo-950/20 via-white/[0.04] to-white/[0.02] border border-indigo-500/20 overflow-hidden hover:border-indigo-400/50 hover:shadow-[0_4px_20px_rgba(99,102,241,0.12)] transition-all duration-300"
                    >
                      {/* Main Row */}
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-white">{order.projectTitle}</h3>
                              {isBuildOrder && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  🔨 Build on Order (25% Advance)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500 font-mono">{order.id}</p>
                              {isBuildOrder ? (
                                <BuildStageBadge stage={currentBuildStage} />
                              ) : (
                                <DeliveryBadge status={order.status} />
                              )}
                            </div>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                          <div>
                            <p className="text-gray-500 uppercase tracking-wider">Amount</p>
                            <p className="text-white font-bold">₹{order.amount.toLocaleString("en-IN")}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 uppercase tracking-wider">Category</p>
                            <p className="text-gray-300 capitalize">{order.projectCategory}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 uppercase tracking-wider">Date</p>
                            <p className="text-gray-300">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 uppercase tracking-wider">Payment</p>
                            <p className={`font-semibold ${order.status === "approved" ? "text-green-400" : order.status === "pending" ? "text-yellow-400" : "text-red-400"}`}>
                              {order.status === "approved" ? "Verified ✓" : order.status === "pending" ? "Verifying..." : "Failed"}
                            </p>
                          </div>
                        </div>

                        {/* Live Milestone Tracker for Build-on-Order Projects */}
                        {isBuildOrder && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                            {order.status === "pending" && (
                              <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs font-semibold flex items-center gap-2">
                                <Clock className="w-4 h-4 animate-pulse flex-shrink-0" />
                                <span>25% Advance Payment under verification. Project development will start upon admin approval.</span>
                              </div>
                            )}

                            {order.status === "approved" && (
                              <>
                                {["planning", "building", "development", "testing", "final_review"].includes(currentBuildStage) && (
                                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-2">
                                    <Rocket className="w-4 h-4 flex-shrink-0" />
                                    <span>25% Advance Verified! Team is actively developing your project according to milestones below.</span>
                                  </div>
                                )}

                                {["completed", "delivered"].includes(currentBuildStage) && (!linkedReq?.finalPayment || linkedReq?.finalPayment.status !== "verified") && (
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
                                    {linkedReq && (
                                      <Button
                                        size="sm"
                                        onClick={() => setSelectedReq(linkedReq)}
                                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold shrink-0 shadow-md text-xs"
                                      >
                                        <Download className="w-3.5 h-3.5 mr-1" />
                                        Pay Remaining 75%
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {linkedReq?.finalPayment?.status === "verified" && (
                                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>🎉 Project fully paid and verified! Download your files anytime using the button below.</span>
                                  </div>
                                )}

                                {/* Milestone Tracker UI */}
                                <div className="pt-1">
                                  <ProjectTracker
                                    currentStatus={
                                      ["completed", "delivered"].includes(currentBuildStage) && linkedReq?.finalPayment?.status !== "verified"
                                        ? "completed"
                                        : currentBuildStage
                                    }
                                    trackingHistory={linkedReq?.trackingHistory}
                                    lastUpdated={linkedReq?.updatedAt || order.updatedAt}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
                          <button
                            onClick={() => handleDownloadInvoice(order)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30 text-[var(--color-neon-blue)] text-xs font-bold hover:bg-[var(--color-neon-blue)]/20 transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Download Invoice
                          </button>

                          {/* Regular marketplace order download */}
                          {!isBuildOrder && order.status === "approved" && (
                            <button
                              onClick={() => handleDownloadProject(order)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors"
                            >
                              <FolderDown className="w-3.5 h-3.5" />
                              Download Project
                            </button>
                          )}

                          {/* Build-on-order download when completed & 75% verified */}
                          {isBuildOrder && (linkedReq?.finalPayment?.status === "verified" || currentBuildStage === "delivered") && (
                            <button
                              onClick={() => {
                                const targetUrl = order.driveUrl || linkedReq?.driveUrl;
                                if (targetUrl) {
                                  window.open(targetUrl, "_blank", "noopener,noreferrer");
                                } else {
                                  handleDownloadProject(order);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                            >
                              <FolderDown className="w-3.5 h-3.5" />
                              Download Project
                            </button>
                          )}

                          {/* Build-on-order pay remaining 75% button if ready */}
                          {isBuildOrder && ["completed", "delivered"].includes(currentBuildStage) && (!linkedReq?.finalPayment || linkedReq?.finalPayment.status !== "verified") && linkedReq && (
                            <button
                              onClick={() => setSelectedReq(linkedReq)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Pay 75% to Download
                            </button>
                          )}

                          <button
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold hover:text-white hover:bg-white/10 transition-colors ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {expandedOrder === order.id ? "Hide" : "Details"}
                          </button>

                          {order.status === "pending" && (
                            <p className="text-yellow-400 text-xs animate-pulse ml-2">⏳ Awaiting admin verification...</p>
                          )}
                          {order.status === "rejected" && (
                            <p className="text-red-400 text-xs ml-2">Contact team@edunova.com</p>
                          )}
                        </div>
                      </div>

                      {/* Expanded Detail Panel */}
                      <AnimatePresence>
                        {expandedOrder === order.id && (
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
                                    <p className="text-white font-mono text-sm">INV-{order.id.replace("ORD-", "")}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Buyer</span>
                                    <p className="text-gray-300">{order.userName} ({order.userEmail})</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Payment Method</span>
                                    <p className="text-gray-300">{order.paymentMethod || "UPI"} / Manual Transfer</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">UTR / Transaction No.</span>
                                    <p className="text-[var(--color-neon-blue)] font-mono font-bold flex items-center gap-1">
                                      <Hash className="w-3 h-3" />
                                      {order.utrNumber || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Platform</span>
                                    <p className="text-gray-300">EduNova — Premium Engineering Marketplace</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Curated By</span>
                                    <p className="text-gray-300">EduNova Team</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 uppercase tracking-wider">Transaction Updated</span>
                                    <p className="text-gray-300">{new Date(order.updatedAt).toLocaleString("en-IN")}</p>
                                  </div>
                                </div>
                              </div>
                              {/* Billing summary */}
                              <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-500">Subtotal</span>
                                  <span className="text-white">₹{order.amount.toLocaleString("en-IN")}</span>
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
                                  <span className="text-white">Total Paid</span>
                                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)]">₹{order.amount.toLocaleString("en-IN")}</span>
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
                            {req.status === "accepted" && !req.advancePayment && (
                              <Button size="sm" variant="outline" className="text-orange-400 border-orange-500/50 hover:bg-orange-500/10" onClick={() => setSelectedReq(req)}>
                                Pay 25% Advance
                              </Button>
                            )}
                            {["completed", "delivered"].includes(req.status) && !req.finalPayment && (
                              <Button size="sm" variant="outline" className="text-[var(--color-neon-blue)] border-[var(--color-neon-blue)]/50 hover:bg-[var(--color-neon-blue)]/10" onClick={() => setSelectedReq(req)}>
                                Pay 75% Final
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setSelectedReq(req)}>
                              <Eye className="w-4 h-4 mr-1.5" />
                              View
                            </Button>
                          </div>
                        </div>

                        {/* 25% Advance Payment Status Banners */}
                        {req.status === "accepted" && !req.advancePayment && (
                          <div className="mt-3 p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-[11px] font-bold text-center animate-pulse">
                            ⏸️ Building is paused. Waiting for your 25% Advance Payment.
                          </div>
                        )}
                        {((req.status === "pending" || req.status === "accepted") && req.advancePayment?.status === "pending") && (
                          <div className="mt-3 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-[11px] font-bold text-center">
                            ✅ 25% Advance Paid — Waiting for team verification. Building will start soon!
                          </div>
                        )}
                        {((req.status === "planning" || req.status === "building" || req.status === "development" || req.status === "testing" || req.status === "final_review" || req.status === "accepted") && req.advancePayment?.status === "verified") && (
                          <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-[11px] font-bold text-center">
                            🚀 25% Advance Verified — Team is actively building your project!
                          </div>
                        )}

                        {/* 75% Final Payment Status Banners */}
                        {["completed", "delivered"].includes(req.status) && !req.finalPayment && (
                          <div className="mt-3 p-2.5 bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30 rounded-lg text-[var(--color-neon-blue)] text-[11px] font-bold text-center animate-pulse">
                            ⏸️ Delivery is paused. Waiting for your 75% Final Payment.
                          </div>
                        )}
                        {["completed", "delivered"].includes(req.status) && req.finalPayment?.status === "pending" && (
                          <div className="mt-3 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-[11px] font-bold text-center">
                            ✅ 75% Final Paid — Waiting for team verification. Delivery link coming soon!
                          </div>
                        )}
                        {["completed", "delivered"].includes(req.status) && req.finalPayment?.status === "verified" && (
                          <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-[11px] font-bold text-center">
                            🎉 Fully Paid & Verified — Your project delivery link is unlocked!
                          </div>
                        )}

                        {/* Inline Project Tracker for all requests */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <ProjectTracker
                            currentStatus={
                              // Cap tracker based on payment status
                              ["completed", "delivered"].includes(req.status) && req.finalPayment?.status !== "verified"
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
                                Official Response from {inq.repliedBy || "EduNova Support Team"}
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
            </div>
            {orders.length === 0 && userInquiries.filter(i => i.reply).length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center relative z-10">No notifications</p>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1 relative z-10">
                {userInquiries.filter(i => i.reply).map(inq => (
                  <div key={`inq-${inq.id}`} className="flex items-start gap-3 text-sm p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 transition-all">
                    <MessageSquare className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-100 font-medium text-xs leading-relaxed">
                        💬 <strong className="text-cyan-300">Support Team Replied</strong>: "{inq.subject}"
                      </p>
                      <p className="text-cyan-400/70 font-mono text-[10px] mt-0.5">
                        {new Date(inq.repliedAt || inq.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
                {orders.slice().reverse().map(order => (
                  <div key={order.id} className="flex items-start gap-3 text-sm p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.06] transition-all">
                    {order.status === "pending" && <Clock className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />}
                    {order.status === "approved" && <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />}
                    {order.status === "rejected" && <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                    <div>
                      <p className="text-gray-200 font-medium text-xs leading-relaxed">
                        {order.status === "pending" && `Payment submitted for ${order.projectTitle}`}
                        {order.status === "approved" && `✅ ${order.projectTitle} — Download unlocked!`}
                        {order.status === "rejected" && `❌ ${order.projectTitle} — Payment rejected`}
                      </p>
                      <p className="text-emerald-400/60 font-mono text-[10px] mt-0.5">{new Date(order.updatedAt).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

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
              <p className="text-sky-300/60 text-xs text-center pt-1">Discover premium engineering projects curated by EduNova.</p>
            </div>
          </Card>

          {/* Admin Link */}
          {user.role === "admin" && (
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
                            {offer.sentBy === "user" ? "You" : "EduNova Team"}
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
                      <p className="text-xs text-yellow-500/80">Waiting for EduNova admin to provide final approval to start the project.</p>
                    </div>
                  )}

                  {selectedReq.status === "accepted" && (
                    <div className="p-6 border-t border-green-500/30 bg-green-500/10 flex flex-col items-center justify-center text-green-400 gap-3 text-center shadow-inner relative overflow-hidden">
                      <CheckCircle className="w-8 h-8 shadow-[0_0_20px_rgba(34,197,94,0.4)] rounded-full" />
                      <p className="font-bold text-sm sm:text-base">Project Approved & Price Agreed!</p>
                      
                      {!selectedReq.advancePayment ? (
                        <div className="w-full mt-4 bg-black/40 border border-purple-500/30 p-5 rounded-2xl">
                          <h4 className="text-white font-bold text-lg mb-2">Step 1: 25% Advance Payment</h4>
                          <p className="text-gray-400 text-sm mb-4">
                            Please complete the 25% advance payment (₹{(selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.25}) to start the planning and development phase.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-center p-4 bg-white/5 border border-white/10 rounded-xl">
                            <div className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-center overflow-hidden">
                              <img src={getEffectiveQrCodeUrl((selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.25)} alt="QR Code" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
                            </div>
                            <div className="text-center sm:text-left space-y-1.5">
                              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Scan QR or pay to UPI ID:</p>
                              <div className="bg-black/50 border border-white/10 px-3 py-2 rounded-lg text-white font-mono text-sm tracking-wide select-all">
                                {getPlatformSettings().upiId || "edunova@paytm"}
                              </div>
                              <p className="text-[10px] text-gray-500 font-medium">Name: EduNova Technologies</p>
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
                      ) : selectedReq.advancePayment?.status === "pending" ? (
                        <div className="w-full mt-4 bg-black/40 border border-yellow-500/30 p-5 rounded-2xl text-center">
                          <Clock className="w-10 h-10 mx-auto mb-3 text-yellow-400 animate-pulse" />
                          <h4 className="text-white font-bold text-lg mb-2">25% Advance Payment Submitted</h4>
                          <p className="text-yellow-400 text-sm font-bold mb-1">₹{(selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.25} Paid</p>
                          <p className="text-gray-400 text-xs">Waiting for EduNova team to verify your payment. Building will start once verified!</p>
                        </div>
                      ) : (
                        <div className="w-full mt-4 bg-black/40 border border-green-500/30 p-5 rounded-2xl text-center">
                          <Rocket className="w-10 h-10 mx-auto mb-3 text-green-400" />
                          <h4 className="text-white font-bold text-lg mb-2">25% Advance Verified ✅</h4>
                          <p className="text-green-400 text-sm font-bold mb-1">Our team is actively building your project!</p>
                          <p className="text-gray-400 text-xs">Track the live progress in the Project Tracker below.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {["completed", "delivered"].includes(selectedReq.status) && (
                    <div className="p-6 border-t border-[var(--color-neon-blue)]/30 bg-[var(--color-neon-blue)]/10 flex flex-col items-center justify-center text-[var(--color-neon-blue)] gap-3 text-center shadow-inner relative overflow-hidden">
                      <Package className="w-8 h-8 shadow-[0_0_20px_rgba(0,195,255,0.4)] rounded-full" />
                      <p className="font-bold text-sm sm:text-base">Project Development Completed!</p>
                      
                      {!selectedReq.finalPayment ? (
                        <div className="w-full mt-4 bg-black/40 border border-blue-500/30 p-5 rounded-2xl">
                          <h4 className="text-white font-bold text-lg mb-2">Step 2: 75% Final Payment</h4>
                          <p className="text-gray-400 text-sm mb-4">
                            Please complete the 75% final payment to unlock your Google Drive delivery link.
                          </p>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 text-left max-w-sm mx-auto">
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-gray-400">Base Final Amount (75%)</span>
                              <span className="text-white">₹{((selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.75).toLocaleString("en-IN")}</span>
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
                              <span className="text-[var(--color-neon-blue)]">₹{Math.max(0, ((selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.75) - ((!user.rewardRedeemed && (user.availableDiscount || 0) > 0) ? (user.availableDiscount || 0) : 0)).toLocaleString("en-IN")}</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-center p-4 bg-white/5 border border-white/10 rounded-xl">
                            <div className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-center overflow-hidden">
                              <img src={getEffectiveQrCodeUrl(Math.max(0, ((selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.75) - ((!user.rewardRedeemed && (user.availableDiscount || 0) > 0) ? (user.availableDiscount || 0) : 0)))} alt="QR Code" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
                            </div>
                            <div className="text-center sm:text-left space-y-1.5">
                              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Scan QR or pay to UPI ID:</p>
                              <div className="bg-black/50 border border-white/10 px-3 py-2 rounded-lg text-white font-mono text-sm tracking-wide select-all">
                                {getPlatformSettings().upiId || "edunova@paytm"}
                              </div>
                              <p className="text-[10px] text-gray-500 font-medium">Name: EduNova Technologies</p>
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
                      ) : selectedReq.finalPayment?.status === "pending" ? (
                        <div className="w-full mt-4 bg-black/40 border border-yellow-500/30 p-5 rounded-2xl text-center">
                          <Clock className="w-10 h-10 mx-auto mb-3 text-yellow-400 animate-pulse" />
                          <h4 className="text-white font-bold text-lg mb-2">75% Final Payment Submitted</h4>
                          <p className="text-yellow-400 text-sm font-bold mb-1">₹{(selectedReq.negotiationHistory?.[selectedReq.negotiationHistory.length - 1]?.price || selectedReq.budget) * 0.75} Paid</p>
                          <p className="text-gray-400 text-xs">Waiting for EduNova team to verify your payment. Delivery link will be unlocked once verified!</p>
                        </div>
                      ) : (
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
                      )}
                      
                      {/* Feedback Section (only after delivery) */}
                      {selectedReq.finalPayment?.status === "verified" && (
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

      </div>
    </div>
  );
}
