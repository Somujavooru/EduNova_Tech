"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Mail, Phone, Calendar, Trash2, CheckCircle, AlertTriangle, Eye, X, Filter, Search, Reply, Send, Loader2, CheckCircle2 } from "lucide-react";
import { getContactMessages, subscribeContactMessages, updateContactMessageStatus, deleteContactMessage, clearAllContactMessages, replyToContactMessage, ContactMessage } from "@/lib/data/contact";
import { Button } from "@/components/ui/Button";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<ContactMessage["status"] | "all">("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  // In-app reply state
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("edunova_contact_messages");
    }
    const unsubscribe = subscribeContactMessages((incoming) => {
      setMessages([...incoming].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    return {
      total: messages.length,
      new: messages.filter(m => m.status === "new").length,
      resolved: messages.filter(m => m.status === "resolved").length,
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            m.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || m.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [messages, searchTerm, filterStatus]);

  const handleStatusChange = async (id: string, status: ContactMessage["status"]) => {
    await updateContactMessageStatus(id, status);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    if (selectedMessage?.id === id) {
      setSelectedMessage({ ...selectedMessage, status });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this message?")) {
      await deleteContactMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
    }
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to permanently delete ALL contact messages? This cannot be undone.")) {
      await clearAllContactMessages();
      setMessages([]);
      setSelectedMessage(null);
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setIsSendingReply(true);
    try {
      const updated = await replyToContactMessage(selectedMessage.id, replyText);
      if (updated) {
        setSelectedMessage(updated);
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        setReplySuccess(true);
        setReplyText("");
        setTimeout(() => setReplySuccess(false), 4000);
      }
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[var(--color-neon-blue)]" />
            Contact Messages
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage inquiries and support requests from users.</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-red-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Messages
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-[#1b1c4b] via-[#121338] to-[#0a0a20] border-2 border-indigo-500/40 rounded-2xl p-5 shadow-[0_8px_30px_rgba(99,102,241,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-indigo-500/20 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-indigo-200/70 text-xs font-semibold uppercase tracking-wider">Total Messages</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
              <Mail className="w-4 h-4 text-indigo-300" />
            </div>
          </div>
          <p className="text-3xl font-black text-indigo-200 relative z-10">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-[#422509] via-[#2b1705] to-[#160b02] border-2 border-amber-500/40 rounded-2xl p-5 shadow-[0_8px_30px_rgba(245,158,11,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-amber-500/20 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-amber-200/70 text-xs font-semibold uppercase tracking-wider">New / Unread</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-200 relative z-10">{stats.new}</p>
        </div>

        <div className="bg-gradient-to-br from-[#0c3d28] via-[#07291a] to-[#04140d] border-2 border-emerald-500/40 rounded-2xl p-5 shadow-[0_8px_30px_rgba(16,185,129,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-emerald-500/20 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-emerald-200/70 text-xs font-semibold uppercase tracking-wider">Resolved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-200 relative z-10">{stats.resolved}</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-cyan-500/35 bg-gradient-to-br from-[#0c223b]/95 via-[#071626]/95 to-[#030b14]/98 shadow-[0_16px_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar List */}
        <div className={`w-full md:w-1/3 border-r border-white/10 flex flex-col ${selectedMessage ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/10 bg-black/20 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--color-neon-blue)] flex-1"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="resolved">Resolved</option>
                <option value="spam">Spam</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No messages found.
              </div>
            ) : (
              filteredMessages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (msg.status === "new") handleStatusChange(msg.id, "read");
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all border ${
                    selectedMessage?.id === msg.id 
                      ? 'bg-[var(--color-neon-blue)]/10 border-[var(--color-neon-blue)]/30' 
                      : 'bg-transparent border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-semibold truncate pr-2 ${msg.status === 'new' ? 'text-white' : 'text-gray-300'}`}>
                      {msg.name}
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={`text-xs truncate mb-2 ${msg.status === 'new' ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                    {msg.subject}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                      msg.status === 'new' ? 'bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)]' :
                      msg.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                      msg.status === 'spam' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {msg.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Detail View */}
        <div className={`w-full md:w-2/3 flex flex-col bg-black/10 ${!selectedMessage ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {!selectedMessage ? (
            <div className="text-center text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Select a message to view details</p>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-white/10 bg-black/20 flex flex-wrap gap-4 justify-between items-start">
                <div className="flex gap-4">
                  <button onClick={() => setSelectedMessage(null)} className="md:hidden text-gray-400 hover:text-white mt-1">
                    <X className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{selectedMessage.subject}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-white font-medium">{selectedMessage.name}</span>
                      <span>&lt;{selectedMessage.email}&gt;</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(selectedMessage.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Message Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedMessage.phone && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Phone</p>
                        <p className="text-sm text-white">{selectedMessage.phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedMessage.projectRef && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-neon-purple)]/10 flex items-center justify-center">
                        <Eye className="w-4 h-4 text-[var(--color-neon-purple)]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Project Ref</p>
                        <p className="text-sm text-[var(--color-neon-purple)]">{selectedMessage.projectRef}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 shadow-inner whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                  <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-2">User's Message:</p>
                  {selectedMessage.message}
                </div>

                {/* Sent Admin Reply Display (if exists) */}
                {selectedMessage.reply && (
                  <div className="bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-black/40 border-2 border-emerald-500/40 rounded-xl p-5 shadow-[0_0_25px_rgba(16,185,129,0.15)] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                            {selectedMessage.repliedBy || "EduNova Support Admin"} (Replied to User)
                          </span>
                          <span className="text-[10px] text-gray-400">Delivered &amp; Visible on User's Dashboard</span>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-400/80 font-mono">
                        {selectedMessage.repliedAt ? new Date(selectedMessage.repliedAt).toLocaleString("en-IN") : ""}
                      </span>
                    </div>
                    <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-3 text-sm text-gray-100 whitespace-pre-wrap leading-relaxed mt-2">
                      {selectedMessage.reply}
                    </div>
                  </div>
                )}

                {/* In-App Reply Box (Reflects in User Dashboard) */}
                <div className="bg-gradient-to-br from-indigo-950/30 via-cyan-950/20 to-black/40 border border-cyan-500/35 rounded-xl p-5 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      <Reply className="w-4 h-4 text-cyan-400" />
                      {selectedMessage.reply ? "Update or Send Another Reply" : "Send Reply to User"}
                    </span>
                    <span className="text-[11px] text-cyan-400/70 font-medium">Reflects immediately on user dashboard</span>
                  </div>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Type your reply to ${selectedMessage.name}... This response will be visible on their user dashboard.`}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-400 leading-relaxed placeholder:text-gray-500 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    {replySuccess ? (
                      <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                        <CheckCircle className="w-4 h-4" /> Reply sent! User can view this on their dashboard.
                      </p>
                    ) : <div />}
                    <button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyText.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] disabled:opacity-50 ml-auto cursor-pointer"
                    >
                      {isSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Reply to User Dashboard
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-white/10 bg-black/40 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2">
                  {selectedMessage.status !== "resolved" && (
                    <button 
                      onClick={() => handleStatusChange(selectedMessage.id, "resolved")}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/20 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Resolved
                    </button>
                  )}
                  {selectedMessage.status !== "spam" && (
                    <button 
                      onClick={() => handleStatusChange(selectedMessage.id, "spam")}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-semibold hover:bg-orange-500/20 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Spam
                    </button>
                  )}
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                    title="Send via External Mail App"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs font-medium hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Mail App
                  </a>
                </div>
                <button 
                  onClick={() => handleDelete(selectedMessage.id)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
