"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag, AlertTriangle, ShieldAlert, Bug, UserX,
  CheckCircle, XCircle, Eye, MessageSquare, Clock
} from "lucide-react";

import { Report, getAllReports, updateReportStatus } from "@/lib/data/reports";

function TypeBadge({ type }: { type: Report["type"] }) {
  const config: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Flag }> = {
    plagiarism: { label: "Plagiarism", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: AlertTriangle },
    spam: { label: "Spam", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: Bug },
    inappropriate: { label: "Inappropriate", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: ShieldAlert },
    fake_account: { label: "Fake Account", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", icon: UserX },
    other: { label: "Other", color: "text-gray-400", bg: "bg-white/5", border: "border-white/10", icon: Flag },
  };
  const c = config[type];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.color} ${c.bg} border ${c.border}`}>
      <Icon className="w-3 h-3" /> {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: Report["status"] }) {
  const config = {
    open: { label: "Open", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    resolved: { label: "Resolved", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
    dismissed: { label: "Dismissed", color: "text-gray-400", bg: "bg-white/5", border: "border-white/10" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.color} ${c.bg} border ${c.border}`}>
      {c.label}
    </span>
  );
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState(getAllReports());
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "dismissed">("all");

  const handleResolve = (id: string) => {
    updateReportStatus(id, "resolved");
    setReports(getAllReports());
  };

  const handleDismiss = (id: string) => {
    updateReportStatus(id, "dismissed");
    setReports(getAllReports());
  };

  const filtered = filter === "all" ? reports : reports.filter(r => r.status === filter);

  const openCount = reports.filter(r => r.status === "open").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <Flag className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Reports & Moderation</h1>
          <p className="text-gray-500 text-xs">Review flagged content, spam, and suspicious accounts</p>
        </div>
        {openCount > 0 && (
          <span className="ml-auto px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
            {openCount} Open
          </span>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "open", "resolved", "dismissed"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              filter === f
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.35)] border border-rose-400"
                : "bg-gradient-to-br from-rose-950/30 to-black/40 text-rose-200/70 border border-rose-500/20 hover:text-white hover:bg-rose-900/30 hover:border-rose-500/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="rounded-3xl border-2 border-rose-500/30 bg-gradient-to-br from-[#2f0e1b]/80 via-[#1a0810]/80 to-[#0d0408]/90 p-12 text-center text-rose-300/60 shadow-xl backdrop-blur-xl">
              <Flag className="w-10 h-10 mx-auto mb-3 text-rose-400/40" />
              <p className="font-semibold text-rose-200/80">No {filter === "all" ? "" : filter} reports found.</p>
              <p className="text-xs text-rose-300/50 mt-1">Platform moderation queue is clear.</p>
            </div>
          ) : (
            filtered.map((report, i) => (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-3xl border-2 border-rose-500/40 bg-gradient-to-br from-[#3b1224]/95 via-[#230a16]/95 to-[#12040b]/98 shadow-[0_12px_40px_rgba(244,63,94,0.18)] backdrop-blur-xl p-6 relative overflow-hidden hover:border-rose-400/70 transition-all"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-rose-500/15 pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TypeBadge type={report.type} />
                      <StatusBadge status={report.status} />
                    </div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <span>{report.targetType === "project" ? "📦" : "👤"}</span>
                      <span>{report.targetTitle}</span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-rose-200/60 flex items-center gap-1.5 whitespace-nowrap bg-black/30 px-3 py-1.5 rounded-xl border border-rose-500/20 font-medium">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    {new Date(report.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>

                <div className="rounded-2xl bg-black/40 border border-rose-500/25 p-4 mb-4 relative z-10">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-rose-100/90 leading-relaxed font-medium">{report.reason}</p>
                      <p className="text-[11px] text-rose-300/60 mt-2">
                        Reported by: <span className="text-rose-200 font-bold">{report.reportedBy}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {report.status === "open" && (
                  <div className="flex gap-3 relative z-10">
                    <button
                      onClick={() => handleResolve(report.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400/50 text-white text-xs font-bold hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" /> Mark Resolved
                    </button>
                    <button
                      onClick={() => handleDismiss(report.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-gray-300 text-xs font-bold hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Dismiss
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
