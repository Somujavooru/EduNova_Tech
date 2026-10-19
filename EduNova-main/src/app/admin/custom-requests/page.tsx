"use client";
import { useRouter } from "next/navigation";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getAllCustomRequests, updateCustomRequestStatus, addNegotiationOffer, updateProjectTracking, deleteCustomRequest, clearAllCustomRequests, CustomRequest, CustomRequestStatus, NegotiationOffer } from "@/lib/data/customRequests";
import { sendNotification } from "@/lib/notifications";
import { convertRequestToMarketplaceProject } from "@/lib/data/projectIntegration";
import { ProjectTracker, DEFAULT_MILESTONES } from "@/components/ui/ProjectTracker";
import {
  FileQuestion, Clock, CheckCircle, XCircle, Search, Eye,
  Calendar, IndianRupee, Code, FileText, User, Mail, Link as LinkIcon, Loader2, MessageSquare, Send, Rocket, Truck, ShoppingBag, Shield, Trash2
} from "lucide-react";

export default function AdminCustomRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomRequest | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Negotiation state
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [demoVideoUrlInput, setDemoVideoUrlInput] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const PURGE_FLAG = "edunova_initial_requests_purged_flag_v1";
      if (typeof window !== "undefined" && !sessionStorage.getItem(PURGE_FLAG)) {
        await clearAllCustomRequests();
        sessionStorage.setItem(PURGE_FLAG, "true");
        setRequests([]);
      } else {
        const data = await getAllCustomRequests();
        setRequests(data);
      }
    } catch (err: any) {
      console.error("Admin fetch requests failed:", err);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: CustomRequestStatus) => {
    setIsUpdating(true);
    try {
      const updated = await updateCustomRequestStatus(id, newStatus);
      if (updated) {
        setRequests(requests.map(r => r.id === id ? updated : r));
        setSelectedRequest(updated);
        
        let notifType = null;
        if (newStatus === "accepted") notifType = "negotiation_accepted";
        else if (newStatus === "rejected") notifType = "request_rejected";
        else if (newStatus === "in_progress") notifType = "project_started";
        else if (newStatus === "completed") notifType = "project_completed";

        if (notifType) {
          sendNotification(notifType as any, {
            userEmail: updated.userEmail,
            userName: updated.userName,
            projectTitle: updated.projectTitle,
          });
        }
      } else {
        alert("Failed to update status. Please try again.");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("An error occurred while updating status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendOffer = async () => {
    if (!selectedRequest || !offerPrice || !offerMessage) return;

    setIsUpdating(true);
    try {
      const updated = await addNegotiationOffer(
        selectedRequest.id,
        {
          price: Number(offerPrice),
          message: offerMessage,
          sentBy: "admin",
        },
        "offer_sent"
      );

      if (updated) {
        setRequests(requests.map(r => r.id === updated.id ? updated : r));
        setSelectedRequest(updated);
        setOfferPrice("");
        setOfferMessage("");

        sendNotification("offer_sent", {
          userEmail: updated.userEmail,
          userName: updated.userName,
          projectTitle: updated.projectTitle,
          proposedPrice: Number(offerPrice),
        });
      } else {
        alert("Failed to send offer. Please try again.");
      }
    } catch (err) {
      console.error("Failed to send offer:", err);
      alert("An error occurred while sending offer.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this custom request?")) {
      setIsUpdating(true);
      try {
        const ok = await deleteCustomRequest(id);
        if (ok) {
          setRequests(prev => prev.filter(r => r.id !== id));
          if (selectedRequest?.id === id) setSelectedRequest(null);
        } else {
          alert("Failed to delete request.");
        }
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleClearAllRequests = async () => {
    if (confirm("Are you sure you want to permanently delete ALL custom requests from the database? This action cannot be undone.")) {
      setIsUpdating(true);
      try {
        const ok = await clearAllCustomRequests();
        if (ok) {
          setRequests([]);
          setSelectedRequest(null);
        } else {
          alert("Failed to clear requests.");
        }
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const filteredRequests = requests.filter(req =>
    req.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
    req.userName.toLowerCase().includes(search.toLowerCase()) ||
    req.id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: CustomRequestStatus) => {
    switch (status) {
      case "pending": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/30">Pending Review</span>;
      case "reviewing": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 border border-blue-500/30">Reviewing</span>;
      case "negotiating": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/30">Negotiating</span>;
      case "offer_sent": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/30">Offer Sent</span>;
      case "counter_offered": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-pink-400 bg-pink-500/10 border border-pink-500/30">Counter Offered</span>;
      case "awaiting_final_approval": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/30">Awaiting Final Approval</span>;
      case "accepted": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-green-400 bg-green-500/10 border border-green-500/30">Approved</span>;
      case "planning": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 border border-blue-500/30">Planning</span>;
      case "building": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-[var(--color-neon-purple)] bg-[var(--color-neon-purple)]/10 border border-[var(--color-neon-purple)]/30">Building</span>;
      case "development": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-[var(--color-neon-purple)] bg-[var(--color-neon-purple)]/10 border border-[var(--color-neon-purple)]/30">Development</span>;
      case "testing": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/30">Testing</span>;
      case "final_review": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 border border-blue-500/30">Final Review</span>;
      case "in_progress": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-[var(--color-neon-purple)] bg-[var(--color-neon-purple)]/10 border border-[var(--color-neon-purple)]/30">Project Started</span>;
      case "completed": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-[var(--color-neon-blue)] bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30">Completed</span>;
      case "delivered": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-green-400 bg-green-500/10 border border-green-500/30">Delivered</span>;
      case "rejected": return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase text-red-400 bg-red-500/10 border border-red-500/30">Rejected</span>;
      default: return null;
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileQuestion className="w-8 h-8 text-[var(--color-neon-purple)]" />
            Custom Requests
          </h1>
          <p className="text-gray-400 mt-1">Manage user-submitted custom project requests and negotiations.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {requests.length > 0 && (
            <button
              onClick={handleClearAllRequests}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Requests
            </button>
          )}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-neon-purple)] transition-colors"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
          <XCircle className="w-6 h-6 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <Button size="sm" variant="outline" className="ml-auto" onClick={fetchRequests}>Retry</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-[var(--color-neon-purple)]" />
          <p className="animate-pulse">Loading custom requests from database...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredRequests.map((req, i) => {
                const REQ_THEMES = [
                  {
                    bg: "bg-gradient-to-br from-[#2a1347]/95 via-[#1a0c2e]/95 to-[#0e051a]/98",
                    border: "border-purple-500/40 hover:border-purple-400",
                    shadow: "shadow-[0_12px_35px_rgba(168,85,247,0.16)]",
                    glow: "bg-purple-500/20",
                  },
                  {
                    bg: "bg-gradient-to-br from-[#0e2f52]/95 via-[#081e35]/95 to-[#040f1c]/98",
                    border: "border-cyan-500/40 hover:border-cyan-400",
                    shadow: "shadow-[0_12px_35px_rgba(6,182,212,0.16)]",
                    glow: "bg-cyan-500/20",
                  },
                  {
                    bg: "bg-gradient-to-br from-[#0d402b]/95 via-[#08291b]/95 to-[#04140d]/98",
                    border: "border-emerald-500/40 hover:border-emerald-400",
                    shadow: "shadow-[0_12px_35px_rgba(16,185,129,0.16)]",
                    glow: "bg-emerald-500/20",
                  },
                  {
                    bg: "bg-gradient-to-br from-[#422509]/95 via-[#2b1705]/95 to-[#160b02]/98",
                    border: "border-amber-500/40 hover:border-amber-400",
                    shadow: "shadow-[0_12px_35px_rgba(245,158,11,0.16)]",
                    glow: "bg-amber-500/20",
                  },
                ];
                const theme = REQ_THEMES[i % REQ_THEMES.length];

                return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  layout
                >
                  <Card glowOnHover className={`h-full flex flex-col relative overflow-hidden backdrop-blur-xl border-2 p-5.5 rounded-2xl transition-all duration-300 hover:scale-[1.01] ${theme.bg} ${theme.border} ${theme.shadow}`}>
                    <div className={`absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl pointer-events-none ${theme.glow}`} />
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight mb-1">{req.projectTitle}</h3>
                        <p className="text-xs text-gray-400 font-mono">{req.id}</p>
                      </div>
                      {getStatusBadge(
                        req.status === "delivered" && req.finalPayment?.status !== "verified"
                          ? "completed"
                          : req.status
                      )}
                    </div>

                    <div className="space-y-3 mb-6 flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <User className="w-4 h-4 text-[var(--color-neon-purple)]" />
                        {req.userName}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <IndianRupee className="w-4 h-4 text-green-400" />
                        {req.negotiationHistory && req.negotiationHistory.length > 0 ? (
                           <span className="flex items-center gap-2">
                             <span className="line-through text-gray-500 opacity-50 text-xs">₹{req.budget.toLocaleString("en-IN")}</span>
                             <span className="text-green-400 font-bold">
                               ₹{req.negotiationHistory[req.negotiationHistory.length - 1].price.toLocaleString("en-IN")}
                             </span>
                           </span>
                        ) : (
                          `₹${req.budget.toLocaleString("en-IN")}`
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        Deadline: {new Date(req.deadline).toLocaleDateString("en-IN")}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        Submitted: {new Date(req.createdAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>

                    {/* Payment Notification Badges */}
                    {req.advancePayment?.status === "pending" && (
                      <div className="mb-3 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-between gap-2">
                        <span className="text-yellow-400 text-[11px] font-bold animate-pulse">💰 User paid 25% Advance — Verify now!</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push("/admin/payments"); }}
                          className="text-[10px] px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors font-bold uppercase tracking-wider whitespace-nowrap"
                        >
                          Verify
                        </button>
                      </div>
                    )}
                    {req.advancePayment?.status === "verified" && (
                      <div className="mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-[11px] font-bold text-center">
                        ✅ 25% Advance Verified
                      </div>
                    )}
                    {req.finalPayment?.status === "pending" && (
                      <div className="mb-3 p-2.5 bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30 rounded-lg flex items-center justify-between gap-2">
                        <span className="text-[var(--color-neon-blue)] text-[11px] font-bold animate-pulse">💰 User paid 75% Final — Verify now!</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push("/admin/payments"); }}
                          className="text-[10px] px-2 py-1 rounded-md bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] border border-[var(--color-neon-blue)]/30 hover:bg-[var(--color-neon-blue)]/30 transition-colors font-bold uppercase tracking-wider whitespace-nowrap"
                        >
                          Verify
                        </button>
                      </div>
                    )}
                    {req.finalPayment?.status === "verified" && (
                      <div className="mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-[11px] font-bold text-center">
                        ✅ 75% Final Verified — Full payment complete
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button 
                        fullWidth 
                        variant="outline" 
                        onClick={() => setSelectedRequest(req)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRequest(req.id);
                        }}
                        className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
                        title="Delete Request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {!error && filteredRequests.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No custom requests found.</p>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden" onClick={() => setSelectedRequest(null)}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-[#0b0c10] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col relative"
              style={{ maxHeight: '90vh', height: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* FIXED HEADER */}
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-[#0b0c10] rounded-t-2xl z-10 sticky top-0">
                 <div>
                   <div className="flex flex-wrap items-center gap-3 mb-1">
                     <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{selectedRequest.projectTitle}</h2>
                     {getStatusBadge(
                       selectedRequest.status === "delivered" && selectedRequest.finalPayment?.status !== "verified"
                         ? "completed"
                         : selectedRequest.status
                     )}
                   </div>
                   <p className="text-xs text-gray-400 font-mono mt-1">ID: {selectedRequest.id}</p>
                 </div>
                 <button
                    onClick={() => setSelectedRequest(null)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors flex-shrink-0 ml-4"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
              </div>

              {/* SCROLLABLE CONTENT AREA */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 sm:space-y-8 bg-transparent min-h-0">
                 
                 {/* 1. Project Specs */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-3">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client Details</h3>
                      <div className="flex items-center gap-3 text-gray-300 text-sm">
                        <User className="w-4 h-4 text-[var(--color-neon-purple)]" />
                        <span className="font-semibold text-white">{selectedRequest.userName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300 text-sm">
                        <Mail className="w-4 h-4 text-[var(--color-neon-blue)]" />
                        <a href={`mailto:${selectedRequest.userEmail}`} className="hover:underline">{selectedRequest.userEmail}</a>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col justify-center gap-4">
                       <div className="flex items-center justify-between">
                         <span className="text-gray-500 uppercase tracking-wider text-xs font-bold">Initial Budget</span>
                         <span className="text-green-400 text-lg font-black">₹{selectedRequest.budget.toLocaleString("en-IN")}</span>
                       </div>
                       <div className="h-px bg-white/10 w-full"></div>
                       <div className="flex items-center justify-between">
                         <span className="text-gray-500 uppercase tracking-wider text-xs font-bold">Deadline</span>
                         <span className="text-white font-semibold text-sm">{new Date(selectedRequest.deadline).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                       </div>
                    </div>
                 </div>

                 {/* 2. Project Description & Tech */}
                 <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Description
                      </h3>
                      <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                         {selectedRequest.description}
                      </div>
                    </div>
                    
                    {selectedRequest.requiredTech && (
                      <div className="pt-4 border-t border-white/5">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Code className="w-4 h-4" /> Required Technologies
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.requiredTech.split(",").map((tech, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-lg bg-black/40 text-gray-300 text-xs font-medium border border-white/10">
                              {tech.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>

                 {/* 3. Negotiation History Container */}
                 <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02] shadow-inner">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                       <h3 className="text-lg font-bold text-white flex items-center gap-2">
                         <MessageSquare className="w-5 h-5 text-[var(--color-neon-blue)]" />
                         Negotiation History
                       </h3>
                    </div>
                    
                    {/* Chat Bubbles */}
                    <div className="p-4 sm:p-6 space-y-6">
                       {/* Initial Bubble */}
                       <div className="flex flex-col items-start">
                         <div className="bg-white/10 border border-white/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] sm:max-w-[80%] shadow-md">
                           <div className="text-xs text-[var(--color-neon-blue)] font-bold mb-1">User (Initial Request)</div>
                           <div className="text-sm text-gray-200">
                             Requested budget: <span className="font-bold text-green-400">₹{selectedRequest.budget.toLocaleString("en-IN")}</span>
                           </div>
                         </div>
                         <div className="text-[10px] text-gray-500 mt-1.5 ml-1 font-medium">{new Date(selectedRequest.createdAt).toLocaleString("en-IN", { hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' })}</div>
                       </div>

                       {/* History Bubbles */}
                       {selectedRequest.negotiationHistory && selectedRequest.negotiationHistory.map((offer) => (
                         <div key={offer.id} className={`flex flex-col ${offer.sentBy === "admin" ? "items-end" : "items-start"}`}>
                           <div className={`rounded-2xl px-4 py-3 max-w-[90%] sm:max-w-[80%] shadow-md ${
                             offer.sentBy === "admin" 
                               ? "bg-[var(--color-neon-purple)]/20 border border-[var(--color-neon-purple)]/30 rounded-tr-sm" 
                               : "bg-white/10 border border-white/20 rounded-tl-sm"
                           }`}>
                             <div className={`text-xs font-bold mb-1.5 ${offer.sentBy === "admin" ? "text-[var(--color-neon-purple)]" : "text-[var(--color-neon-blue)]"}`}>
                               {offer.sentBy === "admin" ? "You (Admin)" : "User"}
                             </div>
                             <div className="text-sm text-gray-200 mb-3 whitespace-pre-wrap leading-relaxed">
                               {offer.message}
                             </div>
                             <div className="text-sm font-bold text-green-400 bg-black/30 border border-green-500/20 inline-block px-3 py-1.5 rounded-lg shadow-inner">
                               Proposed Price: ₹{offer.price.toLocaleString("en-IN")}
                             </div>
                           </div>
                           <div className={`text-[10px] text-gray-500 mt-1.5 font-medium ${offer.sentBy === "admin" ? "mr-1" : "ml-1"}`}>
                             {new Date(offer.createdAt).toLocaleString("en-IN", { hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' })}
                           </div>
                         </div>
                       ))}

                       {/* Awaiting Final Approval Banner */}
                       {selectedRequest.status === "awaiting_final_approval" && (
                         <div className="pt-4 flex flex-col items-center gap-4">
                           <div className="w-full flex flex-col items-start">
                             <div className="bg-green-500/20 border border-green-500/30 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] sm:max-w-[80%] shadow-md">
                               <div className="text-xs text-green-400 font-bold mb-1">User ({selectedRequest.userName})</div>
                               <div className="text-sm text-gray-200">
                                 ✅ Accepted your proposed price of{" "}
                                 <span className="font-bold text-green-400">
                                   ₹{selectedRequest.negotiationHistory && selectedRequest.negotiationHistory.length > 0
                                     ? selectedRequest.negotiationHistory[selectedRequest.negotiationHistory.length - 1].price.toLocaleString("en-IN")
                                     : selectedRequest.budget.toLocaleString("en-IN")}
                                 </span>
                               </div>
                             </div>
                           </div>
                           <div className="bg-yellow-500/20 text-yellow-400 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full border border-yellow-500/30 flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                             <Clock className="w-4 h-4" />
                             User accepted the offer — Waiting for your final approval
                           </div>
                         </div>
                       )}

                       {/* Accepted Banner */}
                       {selectedRequest.status === "accepted" && (
                         <div className="flex justify-center mt-6">
                           <div className="bg-green-500/20 text-green-400 text-sm font-bold px-5 py-2.5 rounded-full border border-green-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                             <CheckCircle className="w-5 h-5" />
                             Price Agreed & Project Approved
                           </div>
                         </div>
                       )}
                    </div>
                    
                    {/* Send Offer Form */}
                    <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative w-full sm:w-48">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="number"
                            placeholder="Proposed Price"
                            value={offerPrice}
                            onChange={(e) => setOfferPrice(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-purple)] transition-colors"
                          />
                        </div>
                        <div className="flex flex-1 gap-3 items-end">
                          <textarea
                            placeholder="Negotiation message..."
                            value={offerMessage}
                            onChange={(e) => setOfferMessage(e.target.value)}
                            rows={1}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-purple)] resize-none transition-colors min-h-[46px]"
                          />
                          <Button 
                            onClick={handleSendOffer}
                            disabled={!offerPrice || !offerMessage || isUpdating || selectedRequest.status === "accepted" || selectedRequest.status === "rejected" || selectedRequest.status === "awaiting_final_approval"}
                            className="h-[46px] px-6 rounded-xl"
                          >
                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                 </div>

                 {/* 4. Tracking Timeline (if active) */}
                 {["accepted", "planning", "building", "development", "testing", "final_review", "completed", "delivered"].includes(selectedRequest.status) && (
                   <div className="p-5 sm:p-6 bg-white/[0.02] border border-white/10 rounded-2xl shadow-inner relative overflow-hidden">
                      {selectedRequest.advancePayment?.status !== "verified" && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                          <Clock className="w-10 h-10 text-yellow-400 mb-3" />
                          <h4 className="text-white font-bold text-lg mb-2">Awaiting 25% Advance Payment</h4>
                          <p className="text-gray-400 text-sm max-w-sm">
                            Project tracking is locked. The user must complete the 25% advance payment and you must verify it before the project can enter the planning phase.
                          </p>
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                        <Rocket className="w-5 h-5 text-green-400" />
                        Project Tracking Timeline
                      </h3>
                      <ProjectTracker
                        currentStatus={
                          ["completed", "delivered"].includes(selectedRequest.status) && selectedRequest.finalPayment?.status !== "verified"
                            ? "completed"
                            : selectedRequest.status
                        }
                        trackingHistory={selectedRequest.trackingHistory}
                        adminMode={true}
                        lastUpdated={selectedRequest.updatedAt}
                        onAdvanceStage={async (stage) => {
                          const milestone = DEFAULT_MILESTONES.find(m => m.stage === stage);
                          if (milestone) {
                            const updated = await updateProjectTracking(selectedRequest.id, stage, milestone.label, milestone.progressPercent);
                            if (updated) {
                              setRequests(requests.map(r => r.id === updated.id ? updated : r));
                              setSelectedRequest(updated);
                              sendNotification("project_started" as any, {
                                userEmail: updated.userEmail,
                                userName: updated.userName,
                                projectTitle: updated.projectTitle,
                              });
                            }
                          }
                        }}
                      />
                   </div>
                 )}

                 {/* 5. Admin Control Actions */}
                 <div className="p-5 sm:p-6 bg-black/40 border border-[var(--color-neon-purple)]/20 rounded-2xl shadow-[0_0_30px_rgba(180,0,255,0.05)]">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[var(--color-neon-purple)]" />
                      Admin Controls
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="sm" variant={selectedRequest.status === "accepted" ? "primary" : "outline"} className={selectedRequest.status !== "accepted" ? "border-green-500/50 text-green-400 hover:bg-green-500/10" : "bg-green-500 text-white hover:bg-green-600"} onClick={() => handleStatusChange(selectedRequest.id, "accepted")} disabled={isUpdating}>Final Approve</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        const m = DEFAULT_MILESTONES.find(m => m.stage === "planning");
                        if (m) { const u = await updateProjectTracking(selectedRequest.id, "planning", m.label, m.progressPercent); if (u) { setRequests(requests.map(r => r.id === u.id ? u : r)); setSelectedRequest(u); } }
                      }} disabled={isUpdating || selectedRequest.advancePayment?.status !== "verified"}>Start Planning</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedRequest.id, "completed")} disabled={isUpdating}>Complete</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedRequest.id, "delivered")} disabled={isUpdating}><Truck className="w-4 h-4 mr-2" />Deliver</Button>
                      <Button size="sm" variant={selectedRequest.status === "rejected" ? "primary" : "outline"} className={selectedRequest.status !== "rejected" ? "border-red-500/50 text-red-400 hover:bg-red-500/10" : "bg-red-500 text-white hover:bg-red-600"} onClick={() => handleStatusChange(selectedRequest.id, "rejected")} disabled={isUpdating}>Reject</Button>
                      <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/20 sm:ml-auto" onClick={() => handleDeleteRequest(selectedRequest.id)} disabled={isUpdating}><Trash2 className="w-4 h-4 mr-1.5" />Delete Request</Button>
                    </div>

                    {/* Google Drive Delivery Section */}
                    {["completed", "delivered"].includes(selectedRequest.status) && (
                      <div className="mt-6 pt-5 border-t border-white/10">
                        <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-[var(--color-neon-blue)]" />
                          Secure Project Delivery Link (Google Drive)
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                          <input
                            type="text"
                            placeholder="https://drive.google.com/..."
                            value={driveUrlInput || selectedRequest.driveUrl || ""}
                            onChange={(e) => setDriveUrlInput(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)] transition-colors"
                          />
                          <Button
                            onClick={async () => {
                              setIsUpdating(true);
                              try {
                                const { updateCustomRequestFields } = await import("@/lib/data/customRequests");
                                const url = driveUrlInput.trim();
                                const u = await updateCustomRequestFields(selectedRequest.id, { driveUrl: url });
                                if (u) {
                                  setRequests(requests.map(r => r.id === u.id ? u : r));
                                  setSelectedRequest(u);
                                  alert("Project link saved!");
                                }
                              } finally {
                                setIsUpdating(false);
                              }
                            }}
                            disabled={isUpdating || !driveUrlInput}
                            className="bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] border border-[var(--color-neon-blue)]/50 hover:bg-[var(--color-neon-blue)]/30"
                          >
                            Save Link
                          </Button>
                        </div>

                        <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-[var(--color-neon-purple)]" />
                          Demo Video Link (YouTube / Google Drive)
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                            value={demoVideoUrlInput || selectedRequest.demoVideoUrl || ""}
                            onChange={(e) => setDemoVideoUrlInput(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-purple)] transition-colors"
                          />
                          <Button
                            onClick={async () => {
                              setIsUpdating(true);
                              try {
                                const { updateCustomRequestFields } = await import("@/lib/data/customRequests");
                                const url = demoVideoUrlInput.trim();
                                const u = await updateCustomRequestFields(selectedRequest.id, { demoVideoUrl: url });
                                if (u) {
                                  setRequests(requests.map(r => r.id === u.id ? u : r));
                                  setSelectedRequest(u);
                                  alert("Demo video link saved!");
                                }
                              } finally {
                                setIsUpdating(false);
                              }
                            }}
                            disabled={isUpdating || !demoVideoUrlInput}
                            className="bg-[var(--color-neon-purple)]/20 text-[var(--color-neon-purple)] border border-[var(--color-neon-purple)]/50 hover:bg-[var(--color-neon-purple)]/30"
                          >
                            Save Link
                          </Button>
                        </div>
                        {selectedRequest.driveUrl && (
                          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-green-400 text-xs font-bold uppercase mb-1">Final Payment Status</p>
                                <p className="text-sm text-gray-300">
                                  {selectedRequest.finalPayment?.status === "verified" 
                                    ? "✅ 75% Final Payment Verified. User has access." 
                                    : "⏳ Awaiting 75% Final Payment. Link is locked."}
                                </p>
                              </div>
                              {selectedRequest.finalPayment?.status !== "verified" ? (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    // Strictly check if final payment is actually verified in the DB/state
                                    // But since the UI state says it's not verified, we show an error.
                                    alert("User payment is not fully approved yet. Please wait for the user to make the 75% final payment, and approve it in the Admin Payments dashboard.");
                                  }}
                                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 whitespace-nowrap"
                                >
                                  Verify Payment & Give Access
                                </Button>
                              ) : (
                                <div className="text-green-400 text-sm font-bold flex items-center gap-1.5">
                                  <CheckCircle className="w-4 h-4" />
                                  Access Granted
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add to Marketplace */}
                    {(selectedRequest.status === "completed" || selectedRequest.status === "delivered") && (
                      <div className="pt-5 mt-5 border-t border-white/10">
                        <Button
                          fullWidth
                          size="lg"
                          onClick={() => {
                            const params = new URLSearchParams();
                            params.append("title", encodeURIComponent(selectedRequest.projectTitle));
                            
                            // If it's negotiated, we use that. Else standard budget estimate.
                            const finalPrice = selectedRequest.negotiationHistory && selectedRequest.negotiationHistory.length > 0 
                                               ? selectedRequest.negotiationHistory[selectedRequest.negotiationHistory.length - 1].price
                                               : selectedRequest.budget;
                            if (finalPrice) params.append("price", finalPrice.toString());
                            
                            if (selectedRequest.requiredTech) {
                              params.append("techStack", encodeURIComponent(selectedRequest.requiredTech));
                            }
                            
                            if (selectedRequest.driveUrl) {
                              params.append("driveUrl", encodeURIComponent(selectedRequest.driveUrl));
                            }
                            
                            router.push(`/admin/add-project?${params.toString()}`);
                          }}
                          disabled={isUpdating}
                          className="bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] text-white border-0 hover:opacity-90 shadow-lg"
                        >
                          <ShoppingBag className="w-5 h-5 mr-2" />
                          Publish to Public Marketplace
                        </Button>
                      </div>
                    )}
                 </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
