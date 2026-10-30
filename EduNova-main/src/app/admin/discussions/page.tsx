"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessagesSquare,
  Search,
  Filter,
  Pin,
  Trash2,
  CheckCircle2,
  Reply,
  ShieldCheck,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Send,
  X,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import {
  Comment as CommentType,
  deleteComment,
  clearAllComments,
  pinComment,
  toggleSolution,
  submitComment
} from "@/lib/data/reviews";
import { getAllProjectsForAdmin, Project } from "@/lib/data/mockProjects";
import { useAuth } from "@/context/AuthContext";
import { ProjectDetailModal } from "@/components/ui/ProjectDetailModal";
import { sendNotification } from "@/lib/notifications";

export default function AdminDiscussionsPage() {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "toplevel" | "replies" | "pinned" | "solution">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  // Inline reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Selected project for preview
  const [previewProject, setPreviewProject] = useState<Project | null>(null);

  // Load projects
  useEffect(() => {
    getAllProjectsForAdmin().then(setProjects);
  }, []);

  // Real-time Firestore listener for all comments
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "comments"));
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const list: CommentType[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.text) {
            list.push({ ...data, id: docSnap.id } as CommentType);
          }
        });
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setComments(list);
        setLoading(false);

        // Mark all viewed comments as seen by admin
        if (typeof window !== "undefined") {
          try {
            const rawDisc = localStorage.getItem("edunova_admin_read_discussions");
            const discSet = rawDisc ? new Set(JSON.parse(rawDisc)) : new Set();
            const rawNotif = localStorage.getItem("edunova_admin_read_notifs");
            const notifSet = rawNotif ? new Set(JSON.parse(rawNotif)) : new Set();

            list.forEach((c) => {
              discSet.add(c.id);
              notifSet.add(`admin-cmt-${c.id}`);
            });
            localStorage.setItem("edunova_admin_read_discussions", JSON.stringify(Array.from(discSet)));
            localStorage.setItem("edunova_admin_read_notifs", JSON.stringify(Array.from(notifSet)));
            window.dispatchEvent(new CustomEvent("edunova_discussions_updated"));
            window.dispatchEvent(new CustomEvent("edunova_notifications_changed"));
          } catch {}
        }
      },
      (err) => {
        console.warn("[Admin Discussions] Snapshot listener notice:", err?.message || err);
        setComments([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Map project ID to project object
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      const proj = projectMap.get(c.projectId);
      const projTitle = proj?.title?.toLowerCase() || "";
      const matchesSearch =
        c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        projTitle.includes(searchQuery.toLowerCase());

      const matchesProject =
        selectedProjectId === "all" || c.projectId === selectedProjectId;

      let matchesFilter = true;
      if (filterType === "toplevel") matchesFilter = !c.parentId;
      if (filterType === "replies") matchesFilter = !!c.parentId;
      if (filterType === "pinned") matchesFilter = !!c.pinned;
      if (filterType === "solution") matchesFilter = !!c.isSolution;

      return matchesSearch && matchesProject && matchesFilter;
    });
  }, [comments, searchQuery, selectedProjectId, filterType, projectMap]);

  // Stats
  const stats = useMemo(() => {
    const total = comments.length;
    const topLevel = comments.filter((c) => !c.parentId).length;
    const pinned = comments.filter((c) => c.pinned).length;
    const solutions = comments.filter((c) => c.isSolution).length;
    const distinctProjects = new Set(comments.map((c) => c.projectId)).size;
    return { total, topLevel, pinned, solutions, distinctProjects };
  }, [comments]);

  // Action handlers
  const handlePin = async (id: string) => {
    await pinComment(id);
  };

  const handleSolution = async (id: string) => {
    await toggleSolution(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this discussion comment? Replies attached to it will also be removed.")) {
      await deleteComment(id);
    }
  };

  const handleClearAllDiscussions = async () => {
    if (confirm("Are you sure you want to delete ALL discussions and Q&A comments?")) {
      await clearAllComments();
      setComments([]);
    }
  };

  const handleSendAdminReply = async (parentComment: CommentType) => {
    if (!replyText.trim() || !user) return;
    setSubmittingReply(true);
    try {
      await submitComment({
        projectId: parentComment.projectId,
        userId: user.id || "admin",
        userName: user.name || "EduNova Forge Admin Team",
        text: replyText.trim(),
        parentId: parentComment.id,
        isAdminReply: true,
      });

      // Send real-time notification to the user
      const proj = projectMap.get(parentComment.projectId);
      const targetEmail = (parentComment as any).userEmail || (parentComment.userName === "Krutika S K" ? "krutikakanade2@gmail.com" : "");
      if (targetEmail) {
        sendNotification("discussion_reply", {
          userEmail: targetEmail,
          userName: parentComment.userName,
          projectTitle: proj?.title || "Project Discussion",
          text: replyText.trim(),
          projectId: parentComment.projectId,
          targetUrl: `/projects/${parentComment.projectId}?tab=discussion`,
        });
      }

      setReplyText("");
      setReplyingToId(null);
    } catch (e) {
      console.error("Failed to post admin reply:", e);
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <MessagesSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Project Discussions & Q&A</h1>
              <p className="text-xs text-gray-400">
                Monitor user questions, respond as verified admin, pin helpful answers, and moderate project comments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {comments.length > 0 && (
            <button
              onClick={handleClearAllDiscussions}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Discussions
            </button>
          )}
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300">
            Realtime Sync: <span className="text-emerald-400 font-semibold">Active</span>
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#1c1815] to-[#120f0d] border border-orange-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Total Comments</span>
            <MessageCircle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.total}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Across {stats.distinctProjects} projects</div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-[#151c1c] to-[#0d1212] border border-cyan-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Primary Questions</span>
            <HelpCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.topLevel}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Top-level threads</div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-[#1c1b15] to-[#12110d] border border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Pinned Highlights</span>
            <Pin className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.pinned}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Promoted responses</div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-[#151c17] to-[#0d120f] border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Marked Solutions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.solutions}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Verified solutions</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0e131f]/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discussions by user, message content, or project..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
          />
        </div>

        {/* Project Selector */}
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          aria-label="Filter discussions by project"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-orange-500/50"
        >
          <option value="all" className="bg-[#121624] text-white">All Projects ({projects.length})</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#121624] text-white">
              {p.title}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto">
          {[
            { id: "all", label: "All" },
            { id: "toplevel", label: "Questions" },
            { id: "replies", label: "Replies" },
            { id: "pinned", label: "Pinned" },
            { id: "solution", label: "Solutions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === tab.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discussions Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm">Loading discussions...</p>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No discussions found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              {searchQuery || selectedProjectId !== "all" || filterType !== "all"
                ? "Try adjusting your search query or filters to find what you're looking for."
                : "No users have posted questions or comments in any project yet."}
            </p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const project = projectMap.get(comment.projectId);
            const isReplying = replyingToId === comment.id;

            return (
              <motion.div
                key={comment.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-5 rounded-2xl border transition-all ${
                  comment.pinned
                    ? "bg-[#1f1910]/70 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.08)]"
                    : comment.isSolution
                    ? "bg-[#0f1d1d]/70 border-emerald-500/40"
                    : comment.isAdminReply
                    ? "bg-[#181a28]/80 border-indigo-500/30"
                    : "bg-[#121624]/60 border-white/10 hover:border-white/20"
                }`}
              >
                {/* Top Info Bar: Project Name & Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                      Project
                    </span>
                    <button
                      onClick={() => project && setPreviewProject(project)}
                      className="text-xs font-semibold text-white hover:text-orange-400 transition-colors flex items-center gap-1 group"
                    >
                      <span>{project?.title || comment.projectId}</span>
                      <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-orange-400 opacity-70" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {comment.isAdminReply && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3 text-indigo-400" />
                        Admin Reply
                      </span>
                    )}
                    {comment.pinned && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        <Pin className="w-3 h-3 text-amber-400" />
                        Pinned
                      </span>
                    )}
                    {comment.isSolution && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Solution
                      </span>
                    )}
                    {comment.parentId && (
                      <span className="text-[10px] font-medium text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                        Reply Thread
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500">
                      {new Date(comment.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Comment Body */}
                <div className="flex items-start gap-3">
                  {/* User Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500/30 to-amber-500/30 border border-orange-500/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {comment.userName ? comment.userName[0].toUpperCase() : "U"}
                  </div>

                  {/* Text & Author */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{comment.userName}</span>
                      <span className="text-[10px] text-gray-500 font-mono">UID: {comment.userId?.slice(0, 8)}...</span>
                    </div>

                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words bg-black/20 p-3 rounded-xl border border-white/5">
                      {comment.text}
                    </p>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2">
                      {/* Reply */}
                      <button
                        onClick={() => {
                          setReplyingToId(isReplying ? null : comment.id);
                          setReplyText("");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                          isReplying
                            ? "bg-orange-500 text-white"
                            : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Reply className="w-3.5 h-3.5" />
                        {isReplying ? "Cancel Reply" : "Reply as Admin"}
                      </button>

                      {/* Pin Button */}
                      <button
                        onClick={() => handlePin(comment.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                          comment.pinned
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                        }`}
                        title={comment.pinned ? "Unpin comment" : "Pin comment to top of project"}
                      >
                        <Pin className="w-3.5 h-3.5" />
                        {comment.pinned ? "Unpin" : "Pin"}
                      </button>

                      {/* Mark as Solution */}
                      <button
                        onClick={() => handleSolution(comment.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                          comment.isSolution
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                        }`}
                        title={comment.isSolution ? "Remove solution mark" : "Mark as official solution"}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {comment.isSolution ? "Remove Solution" : "Mark Solution"}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center gap-1.5 ml-auto"
                        title="Delete this comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>

                    {/* Inline Admin Reply Input Form */}
                    <AnimatePresence>
                      {isReplying && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-white/10 overflow-hidden"
                        >
                          <div className="bg-[#1a1728] p-3 rounded-xl border border-indigo-500/30 space-y-2">
                            <div className="flex items-center justify-between text-xs text-indigo-300">
                              <span className="flex items-center gap-1 font-semibold">
                                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                                Post Official Admin Reply to {comment.userName}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                Visible with official Admin Badge
                              </span>
                            </div>
                            <textarea
                              rows={3}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your official response to this user inquiry..."
                              className="w-full p-2.5 bg-black/40 border border-indigo-500/20 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 resize-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setReplyingToId(null)}
                                className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={submittingReply || !replyText.trim()}
                                onClick={() => handleSendAdminReply(comment)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                              >
                                {submittingReply ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                Post Reply
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Project Detail Modal preview if opened */}
      {previewProject && (
        <ProjectDetailModal
          project={previewProject}
          onClose={() => setPreviewProject(null)}
        />
      )}
    </div>
  );
}
