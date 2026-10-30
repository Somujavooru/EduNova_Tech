"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, User } from "@/context/AuthContext";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";
import { getAllUsers } from "@/lib/data/mockUsers";
import { Order } from "@/lib/data/orders";
import { sendNotification } from "@/lib/notifications";
import { copyToClipboard as safeCopy } from "@/lib/clipboard";
import {
  Search, Users, ShieldBan, ShieldCheck, Trash2,
  Mail, Calendar, ShoppingCart, ShieldAlert, Crown,
  X, Copy, Check, Phone, Eye, Gift, Sparkles, Clock,
  Hash, Shield, CheckCircle, XCircle, Pencil,
  MessageSquare, Send, MessageCircle, ExternalLink, CheckCheck, Loader2
} from "lucide-react";

interface AdminUser extends User {
  status?: "active" | "blocked";
  joinedAt?: string;
  totalPurchases?: number;
  purchasedProjects?: string[];
  [key: string]: any;
}

function StatusBadge({ status }: { status?: "active" | "blocked" }) {
  const currentStatus = status || "active";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
      currentStatus === "active"
        ? "text-green-400 bg-green-500/10 border border-green-500/30"
        : "text-red-400 bg-red-500/10 border border-red-500/30"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${currentStatus === "active" ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
      {currentStatus}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
      isAdmin 
        ? "text-purple-400 bg-purple-500/10 border border-purple-500/30" 
        : "text-gray-400 bg-white/5 border border-white/10"
    }`}>
      {isAdmin && <Crown className="w-2.5 h-2.5 text-purple-400" />}
      {role || "user"}
    </span>
  );
}

function formatDateTime(val?: string) {
  if (!val) return "N/A";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return val;
  }
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blocked" | "admin">("all");
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "block" | "unblock" | "delete" | "promote" | "demote" } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [modalTab, setModalTab] = useState<"profile" | "discussion">("profile");
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Discussion & Chat state
  const [discussionMessages, setDiscussionMessages] = useState<any[]>([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionText, setDiscussionText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [discussionSentSuccess, setDiscussionSentSuccess] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const loadUserDiscussions = async (email: string) => {
    setDiscussionLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/users/discussion?email=${encodeURIComponent(email)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDiscussionMessages(data.messages || []);
      }
    } catch (err) {
      console.warn("Notice loading user discussions:", err);
    } finally {
      setDiscussionLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser?.email) {
      loadUserDiscussions(selectedUser.email);
    } else {
      setDiscussionMessages([]);
      setModalTab("profile");
    }
  }, [selectedUser?.email]);

  useEffect(() => {
    if (modalTab === "discussion") {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [modalTab, discussionMessages]);

  const handleSendDiscussion = async (customMessage?: string) => {
    const textToSend = customMessage || discussionText;
    if (!textToSend.trim() || !selectedUser) return;

    setIsSendingMessage(true);
    setDiscussionSentSuccess(false);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/users/discussion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: selectedUser.email,
          name: selectedUser.name || "User",
          message: textToSend.trim(),
          subject: "Discussion with Admin",
          phone: selectedUser.phoneNumber || selectedUser.phone || "",
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setDiscussionMessages(prev => {
            const idx = prev.findIndex(m => m.id === data.message.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = data.message;
              return copy;
            }
            return [...prev, data.message];
          });
        }
        
        sendNotification("contact_received", {
          userEmail: selectedUser.email,
          userName: selectedUser.name,
          title: `Direct Message from Admin (${currentUser?.name || "EduNova Team"})`,
          message: textToSend.trim(),
        });

        if (!customMessage) setDiscussionText("");
        setDiscussionSentSuccess(true);
        setTimeout(() => setDiscussionSentSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to send discussion message:", err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const userList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser));
      setUsers(userList);
    } catch (err: any) {
      console.warn("[Admin Users] Firestore fetch notice:", err?.code || err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    // Real-time listener: immediately updates the admin list when any new user registers or updates
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const userList = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AdminUser));
        setUsers(userList);
        setIsLoading(false);
      },
      (err) => {
        console.warn("[Admin Users] Realtime snapshot notice:", err?.code || err?.message);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Fetch orders and init phone input when a user is selected
  useEffect(() => {
    if (!selectedUser) {
      setUserOrders([]);
      setIsEditingPhone(false);
      setPhoneInput("");
      return;
    }

    setIsEditingPhone(false);
    setPhoneInput(selectedUser.phoneNumber || selectedUser.phone || selectedUser.mobile || "");

    let isMounted = true;
    setOrdersLoading(true);

    (async () => {
      try {
        const q = query(collection(db, "orders"), where("userId", "==", selectedUser.id));
        const snap = await getDocs(q);
        if (isMounted) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
          setUserOrders(list);
        }
      } catch (err) {
        console.warn("[Admin Users] Could not load user orders:", err);
        if (isMounted) setUserOrders([]);
      } finally {
        if (isMounted) setOrdersLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedUser?.id]);

  const handleSavePhone = async () => {
    if (!selectedUser) return;
    setIsSavingPhone(true);
    try {
      const userRef = doc(db, "users", selectedUser.id);
      const cleanPhone = phoneInput.trim();
      await updateDoc(userRef, { phoneNumber: cleanPhone });
      setSelectedUser(prev => prev ? { ...prev, phoneNumber: cleanPhone } : null);
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, phoneNumber: cleanPhone } : u));
      setIsEditingPhone(false);
    } catch (err) {
      console.error("Failed to update phone number:", err);
    } finally {
      setIsSavingPhone(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    if (!text) return;
    await safeCopy(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAction = async () => {
    if (!confirmAction || !currentUser || currentUser.role !== "admin") return;
    
    try {
      const userRef = doc(db, "users", confirmAction.id);
      
      if (confirmAction.action === "block") await updateDoc(userRef, { status: "blocked" });
      if (confirmAction.action === "unblock") await updateDoc(userRef, { status: "active" });
      if (confirmAction.action === "delete") await deleteDoc(userRef);
      if (confirmAction.action === "promote") await updateDoc(userRef, { role: "admin" });
      if (confirmAction.action === "demote") await updateDoc(userRef, { role: "user" });

      // Update selectedUser modal state if currently viewed
      if (selectedUser && selectedUser.id === confirmAction.id) {
        if (confirmAction.action === "delete") {
          setSelectedUser(null);
        } else if (confirmAction.action === "block") {
          setSelectedUser(prev => prev ? { ...prev, status: "blocked" } : null);
        } else if (confirmAction.action === "unblock") {
          setSelectedUser(prev => prev ? { ...prev, status: "active" } : null);
        } else if (confirmAction.action === "promote") {
          setSelectedUser(prev => prev ? { ...prev, role: "admin" } : null);
        } else if (confirmAction.action === "demote") {
          setSelectedUser(prev => prev ? { ...prev, role: "user" } : null);
        }
      }

      await fetchUsers();
    } catch (err) {
      console.error("Error performing user action:", err);
    }
    setConfirmAction(null);
  };

  const handleClearNonAdminUsers = async () => {
    if (confirm("Are you sure you want to delete all non-admin registered users from the database? This cannot be undone.")) {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        const toDelete = snap.docs.filter(d => {
          const data = d.data();
          return data.role !== "admin" && data.role !== "owner";
        });
        await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
        await fetchUsers();
      } catch (err) {
        console.error("Error clearing users:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    let matchStatus = true;
    if (filterStatus === "active") matchStatus = (u.status || "active") === "active";
    if (filterStatus === "blocked") matchStatus = u.status === "blocked";
    if (filterStatus === "admin") matchStatus = u.role === "admin";
    
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">User Management</h1>
            <p className="text-gray-500 text-xs">Click on any user to view complete profile, orders & referral details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {users.some(u => u.role !== "admin") && (
            <button
              onClick={handleClearNonAdminUsers}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Non-Admin Users
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/[0.03] px-3.5 py-2 rounded-xl border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Total registered: <strong className="text-white">{users.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-[#0e142c]/80 to-purple-950/40 border border-indigo-500/30 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300/60" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-indigo-500/20 text-white placeholder-indigo-200/40 text-sm focus:outline-none focus:border-indigo-400 focus:bg-indigo-950/30 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "blocked", "admin"] as const).map(f => {
            const activeColors = {
              all: "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border-indigo-400",
              active: "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-400",
              blocked: "bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border-rose-400",
              admin: "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border-purple-400",
            };
            return (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                  filterStatus === f
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

      {/* Users Table */}
      <div className="rounded-2xl border-2 border-indigo-500/35 bg-gradient-to-br from-[#121936]/95 via-[#0b1024]/95 to-[#060814]/98 backdrop-blur-xl overflow-hidden shadow-[0_16px_50px_rgba(99,102,241,0.15)] relative">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[900px]">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_140px] gap-4 px-5 py-3.5 border-b border-indigo-500/25 bg-indigo-950/30 text-[10px] text-indigo-300 uppercase tracking-wider font-bold">
              <span>User</span>
              <span>Role</span>
              <span>Last Login</span>
              <span>Provider</span>
              <span>Discount</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {/* User Rows */}
            <AnimatePresence>
              {isLoading ? (
                <div className="p-12 text-center text-gray-600 flex justify-center">
                   <div className="w-8 h-8 rounded-full border-2 border-[var(--color-neon-purple)] border-t-transparent animate-spin mx-auto" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-gray-600">
                  <Users className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                  <p>No users found matching your criteria.</p>
                </div>
              ) : (
                filtered.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelectedUser(u)}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_140px] gap-4 px-5 py-3.5 border-b border-white/5 hover:bg-white/[0.04] transition-all items-center cursor-pointer group"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-neon-purple)]/40 to-[var(--color-neon-blue)]/40 border border-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 group-hover:scale-105 transition-transform shadow-md">
                        {u.profilePicture ? (
                          <img src={u.profilePicture} alt={u.name} className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          u.name?.charAt(0)?.toUpperCase() || "U"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-semibold truncate group-hover:text-[#00d4ff] transition-colors">{u.name}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" /> {u.email}
                        </p>
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <RoleBadge role={u.role} />
                    </div>

                    {/* Last Login / Joined */}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "N/A"}
                    </span>

                    {/* Provider */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 capitalize">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      {u.provider || "email"}
                    </div>

                    {/* Discount */}
                    <div className="text-xs font-bold text-green-400">
                      ₹{(u.availableDiscount || 0).toLocaleString("en-IN")}
                    </div>

                    {/* Status */}
                    <div>
                      <StatusBadge status={u.status} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 justify-end items-center" onClick={e => e.stopPropagation()}>
                      {/* View Button */}
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-[#00d4ff]/15 text-gray-400 hover:text-[#00d4ff] border border-white/10 transition-colors"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {currentUser?.id !== u.id && (
                        <>
                          {/* Promote/Demote */}
                          {u.role === "admin" ? (
                            <button
                               onClick={() => setConfirmAction({ id: u.id, action: "demote" })}
                               className="p-2 rounded-lg hover:bg-gray-500/10 text-gray-500 hover:text-gray-400 transition-colors"
                               title="Demote to User"
                            >
                              <ShieldBan className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                               onClick={() => setConfirmAction({ id: u.id, action: "promote" })}
                               className="p-2 rounded-lg hover:bg-purple-500/15 text-gray-400 hover:text-purple-400 transition-colors"
                               title="Make Admin"
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Block/Unblock */}
                          {u.status === "blocked" ? (
                            <button
                              onClick={() => setConfirmAction({ id: u.id, action: "unblock" })}
                              className="p-2 rounded-lg hover:bg-green-500/15 text-gray-400 hover:text-green-400 transition-colors"
                              title="Unblock User"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmAction({ id: u.id, action: "block" })}
                              className="p-2 rounded-lg hover:bg-red-500/15 text-gray-400 hover:text-red-400 transition-colors"
                              title="Block User"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => setConfirmAction({ id: u.id, action: "delete" })}
                            className="p-2 rounded-lg hover:bg-red-500/15 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* USER DETAIL MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0b0c1b] border border-white/15 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-start justify-between bg-gradient-to-r from-white/[0.03] to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] p-0.5 shadow-lg shadow-[var(--color-neon-purple)]/20">
                    <div className="w-full h-full rounded-[14px] bg-[#0b0c1b] flex items-center justify-center font-black text-xl text-white">
                      {selectedUser.profilePicture ? (
                        <img src={selectedUser.profilePicture} alt={selectedUser.name} className="w-full h-full rounded-[14px] object-cover" />
                      ) : (
                        selectedUser.name?.charAt(0)?.toUpperCase() || "U"
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-white">{selectedUser.name || "Unnamed User"}</h2>
                      <RoleBadge role={selectedUser.role} />
                      <StatusBadge status={selectedUser.status} />
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                      <span>{selectedUser.email}</span>
                      <button
                        onClick={() => copyToClipboard(selectedUser.email, "email")}
                        className="ml-1 text-gray-500 hover:text-white transition-colors"
                        title="Copy email"
                      >
                        {copiedField === "email" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalTab(modalTab === "profile" ? "discussion" : "profile")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      modalTab === "discussion"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>{modalTab === "discussion" ? "View Profile" : "Chat & Discussion"}</span>
                  </button>

                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Tabs Bar */}
              <div className="flex items-center border-b border-white/10 px-6 bg-white/[0.01]">
                <button
                  onClick={() => setModalTab("profile")}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                    modalTab === "profile"
                      ? "border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff]/5"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Account & Orders
                </button>
                <button
                  onClick={() => setModalTab("discussion")}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                    modalTab === "discussion"
                      ? "border-amber-400 text-amber-400 bg-amber-400/5"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat & Discussion
                  {discussionMessages.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                      {discussionMessages.reduce((acc, m) => acc + 1 + (m.replies?.length || 0), 0)}
                    </span>
                  )}
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                {modalTab === "discussion" ? (
                  /* ── TAB 2: CHAT & DISCUSSION WITH USER ── */
                  <div className="space-y-5">
                    {/* Fast External Channels */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Direct Contact Channels
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Reach {selectedUser.name || "the user"} via in-app discussion, WhatsApp, or registered email.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                          const rawPhone = selectedUser.phoneNumber || selectedUser.phone || selectedUser.mobile || "";
                          const cleanDigits = rawPhone.replace(/\D/g, "");
                          const waNumber = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
                          if (cleanDigits) {
                            return (
                              <a
                                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi ${selectedUser.name || ""}, this is EduNova Support Team...`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>WhatsApp ({rawPhone})</span>
                                <ExternalLink className="w-3 h-3 text-emerald-400/70" />
                              </a>
                            );
                          }
                          return null;
                        })()}

                        <a
                          href={`mailto:${selectedUser.email}?subject=${encodeURIComponent("EduNova Support - Discussion with Admin")}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all"
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          <span>Send Email</span>
                        </a>
                      </div>
                    </div>

                    {/* Chat Messages Feed */}
                    <div className="rounded-2xl border border-white/10 bg-[#070712] p-4 min-h-[280px] max-h-[380px] overflow-y-auto custom-scrollbar flex flex-col gap-3">
                      {discussionLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                          <p className="text-xs">Loading conversation history...</p>
                        </div>
                      ) : discussionMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-gray-500">
                          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
                            <MessageSquare className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-xs font-semibold text-gray-300">No prior discussion with {selectedUser.name}</p>
                          <p className="text-[11px] text-gray-500 max-w-xs mt-1">
                            Send a message below. It will be delivered directly to their dashboard and trigger an instant in-app notification.
                          </p>
                        </div>
                      ) : (
                        discussionMessages.map((msg: any) => {
                          const allReplies = Array.isArray(msg.replies) ? msg.replies : [];
                          return (
                            <div key={msg.id} className="space-y-2.5">
                              {/* Initial Inquiry / Message */}
                              <div className="flex gap-2.5 items-start">
                                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-300 flex-shrink-0">
                                  {msg.name?.charAt(0) || "U"}
                                </div>
                                <div className="max-w-[85%] rounded-2xl bg-white/[0.04] border border-white/10 p-3 text-xs">
                                  <div className="flex items-center justify-between gap-3 mb-1">
                                    <span className="font-semibold text-cyan-300">{msg.name || "User"}</span>
                                    <span className="text-[10px] text-gray-500">{formatDateTime(msg.createdAt)}</span>
                                  </div>
                                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                </div>
                              </div>

                              {/* All Admin Replies for this thread */}
                              {allReplies.map((r: any, rIdx: number) => (
                                <div key={r.id || rIdx} className="flex gap-2.5 items-start justify-end">
                                  <div className="max-w-[85%] rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-purple-600/15 border border-amber-500/30 p-3 text-xs shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                        <Crown className="w-3 h-3 text-amber-400" />
                                        {r.repliedBy || "EduNova Support Admin"}
                                      </span>
                                      <span className="text-[10px] text-gray-400">{formatDateTime(r.repliedAt)}</span>
                                    </div>
                                    <p className="text-white leading-relaxed whitespace-pre-wrap">{r.text}</p>
                                  </div>
                                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-300 flex-shrink-0">
                                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Quick Response Templates */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Quick Discussion Prompts:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "👋 Hi! How can we assist with your project order?",
                          "💳 Please verify your UTR number and payment screenshot.",
                          "🚀 Great news! Your custom project build is ready for download.",
                          "🎁 We've applied a referral discount to your account!"
                        ].map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => setDiscussionText(prompt)}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-[11px] text-gray-300 hover:text-white transition-colors"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Input Box */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                      <textarea
                        value={discussionText}
                        onChange={(e) => setDiscussionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendDiscussion();
                          }
                        }}
                        placeholder={`Write a message to ${selectedUser.name || "user"}... (Press Enter to send, Shift+Enter for new line)`}
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 resize-none transition-colors"
                      />

                      <div className="flex items-center justify-between">
                        {discussionSentSuccess ? (
                          <span className="text-xs text-green-400 flex items-center gap-1 font-semibold animate-pulse">
                            <CheckCheck className="w-3.5 h-3.5" /> Sent & notified in real time!
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500">
                            Dispatched with in-app push notification
                          </span>
                        )}

                        <button
                          onClick={() => handleSendDiscussion()}
                          disabled={isSendingMessage || !discussionText.trim()}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all"
                        >
                          {isSendingMessage ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" /> Send Message
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── TAB 1: USER PROFILE & ORDERS (EXISTING CONTENT) ── */
                  <>
                
                {/* Section 1: Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">User Role</p>
                    <p className="text-sm font-bold text-white capitalize mt-1 flex items-center gap-1">
                      {selectedUser.role === "admin" && <Crown className="w-3.5 h-3.5 text-purple-400" />}
                      {selectedUser.role}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Provider</p>
                    <p className="text-sm font-bold text-white capitalize mt-1">{selectedUser.provider || "Email"}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Discount Bal.</p>
                    <p className="text-sm font-bold text-green-400 mt-1">₹{(selectedUser.availableDiscount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Orders</p>
                    <p className="text-sm font-bold text-blue-400 mt-1">{userOrders.length} placed</p>
                  </div>
                </div>

                {/* Section 2: Detailed Account Metadata */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#00d4ff]" /> Account Identification
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Firebase User ID (UID)</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-gray-300 font-mono text-[11px] truncate">{selectedUser.id}</span>
                        <button
                          onClick={() => copyToClipboard(selectedUser.id, "uid")}
                          className="p-1 text-gray-500 hover:text-white transition-colors"
                          title="Copy UID"
                        >
                          {copiedField === "uid" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px]">Phone Number</span>
                      {isEditingPhone ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="text"
                            value={phoneInput}
                            onChange={e => setPhoneInput(e.target.value)}
                            placeholder="+91 9876543210"
                            className="px-2 py-1 text-xs rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#00d4ff] w-36"
                            autoFocus
                          />
                          <button
                            onClick={handleSavePhone}
                            disabled={isSavingPhone}
                            className="px-2 py-1 text-[11px] rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 font-semibold transition-colors"
                          >
                            {isSavingPhone ? "..." : "Save"}
                          </button>
                          <button
                            onClick={() => setIsEditingPhone(false)}
                            className="px-2 py-1 text-[11px] rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-gray-300 flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3 text-gray-500" />
                            {selectedUser.phoneNumber || selectedUser.phone || selectedUser.mobile || "Not provided"}
                          </p>
                          <button
                            onClick={() => {
                              setPhoneInput(selectedUser.phoneNumber || selectedUser.phone || selectedUser.mobile || "");
                              setIsEditingPhone(true);
                            }}
                            className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-[#00d4ff] transition-colors"
                            title="Edit / Add Phone Number"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px]">Account Created</span>
                      <p className="text-gray-300 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        {formatDateTime(selectedUser.createdAt || selectedUser.joinedAt)}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px]">Last Login</span>
                      <p className="text-gray-300 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {formatDateTime(selectedUser.lastLogin)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Referral & Reward Program */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-purple-400" /> Referral & Rewards Program
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Personal Referral Code</span>
                      <p className="text-white font-mono font-bold mt-0.5">
                        {selectedUser.referralCode || "None generated"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Referred By</span>
                      <p className="text-gray-300 font-mono text-[11px] truncate mt-0.5">
                        {selectedUser.referredBy || "Direct (Organic)"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Referral Status</span>
                      <p className={`mt-0.5 font-bold ${selectedUser.referralUnlocked ? "text-green-400" : "text-gray-400"}`}>
                        {selectedUser.referralUnlocked ? "Unlocked (Active)" : "Locked"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-xs text-gray-400">
                    <span>Successful Referrals: <strong className="text-white">{selectedUser.successfulReferralCount || 0}</strong> / {selectedUser.maxReferralAllowed || 1}</span>
                    <span>Reward Redeemed: <strong className={selectedUser.rewardRedeemed ? "text-green-400" : "text-gray-500"}>{selectedUser.rewardRedeemed ? "Yes" : "No"}</strong></span>
                  </div>
                </div>

                {/* Section 4: Orders & Purchases */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-400" /> Orders & Purchased Projects
                  </h3>

                  {ordersLoading ? (
                    <div className="py-6 text-center text-gray-500 flex justify-center">
                      <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                    </div>
                  ) : userOrders.length === 0 ? (
                    <div className="py-6 text-center text-gray-500 text-xs">
                      No orders or project purchases recorded for this user yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                      {userOrders.map(order => (
                        <div key={order.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{order.projectTitle || "Custom Project / Advance"}</p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                              <span>UTR: {order.utrNumber || "N/A"}</span>
                              <span>•</span>
                              <span>{formatDateTime(order.createdAt)}</span>
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-white">₹{order.amount?.toLocaleString("en-IN") || 0}</p>
                            <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded mt-0.5 ${
                              order.status === "approved" ? "text-green-400 bg-green-500/10" :
                              order.status === "pending" ? "text-yellow-400 bg-yellow-500/10" :
                              "text-red-400 bg-red-500/10"
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </>
                )}

              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 border-t border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {currentUser?.id !== selectedUser.id && (
                    <>
                      {/* Promote/Demote */}
                      {selectedUser.role === "admin" ? (
                        <button
                          onClick={() => setConfirmAction({ id: selectedUser.id, action: "demote" })}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <ShieldBan className="w-3.5 h-3.5 text-gray-400" /> Remove Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmAction({ id: selectedUser.id, action: "promote" })}
                          className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Crown className="w-3.5 h-3.5 text-purple-400" /> Make Admin
                        </button>
                      )}

                      {/* Block/Unblock */}
                      {selectedUser.status === "blocked" ? (
                        <button
                          onClick={() => setConfirmAction({ id: selectedUser.id, action: "unblock" })}
                          className="px-3 py-2 rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-300 border border-green-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> Unblock User
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmAction({ id: selectedUser.id, action: "block" })}
                          className="px-3 py-2 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 border border-yellow-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" /> Block User
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setConfirmAction({ id: selectedUser.id, action: "delete" })}
                        className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete
                      </button>
                    </>
                  )}

                  {/* Toggle Discussion Tab Button */}
                  <button
                    onClick={() => setModalTab(modalTab === "profile" ? "discussion" : "profile")}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    {modalTab === "profile" ? "Chat & Discussion" : "View Profile"}
                  </button>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#0c0c1d] border border-white/15 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-white font-bold text-lg mb-2">
                Confirm {confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1)}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to {confirmAction.action} this user? {confirmAction.action === "delete" && "This action cannot be undone."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 font-semibold text-sm hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors ${
                    confirmAction.action === "delete" || confirmAction.action === "block" || confirmAction.action === "demote"
                      ? "bg-red-500/80 hover:bg-red-500"
                      : "bg-green-500/80 hover:bg-green-500"
                  }`}
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
