"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  getCommentsByProject, submitComment, deleteComment,
  toggleLikeComment, pinComment, toggleSolution, Comment as CommentType
} from "@/lib/data/reviews";
import { Heart, Reply, Trash2, Pin, Send, MessageCircle, CheckCircle, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "./Button";

interface CommentSectionProps {
  projectId: string;
}

export function CommentSection({ projectId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const refresh = async () => {
    const list = await getCommentsByProject(projectId);
    // Merge local likes from localStorage if available
    if (typeof window !== "undefined" && user) {
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem(`edunova_comment_likes_${user.id}`) || "[]");
        list.forEach((c) => {
          if (!Array.isArray(c.likedBy)) c.likedBy = [];
          if (storedLikes.includes(c.id) && !c.likedBy.includes(user.id)) {
            c.likedBy.push(user.id);
            c.likes = Math.max(1, (c.likes || 0) + 1);
          }
        });
      } catch {}
    }
    setComments(list);
  };

  useEffect(() => {
    refresh();

    window.addEventListener("edunova_reviews_updated", refresh);
    window.addEventListener("storage", refresh);

    const timer = setInterval(refresh, 3500);

    return () => {
      clearInterval(timer);
      window.removeEventListener("edunova_reviews_updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [projectId, user?.id]);

  const topLevel = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const isAdmin = user?.role === "admin";

  const handleSubmit = async () => {
    if (!user || !text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await submitComment({
        projectId,
        userId: user.id,
        userName: user.name || "Member",
        text: text.trim(),
        parentId: null,
        isAdminReply: isAdmin,
      });
      if (created) {
        setText("");
        setComments((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      } else {
        setSubmitError("Could not post comment. Please try again.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to post comment.");
    } finally {
      setIsSubmitting(false);
      refresh();
    }
  };

  const handleReply = async (parentId: string) => {
    if (!user || !replyText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await submitComment({
        projectId,
        userId: user.id,
        userName: user.name || "Member",
        text: replyText.trim(),
        parentId,
        isAdminReply: isAdmin,
      });
      if (created) {
        setReplyText("");
        setReplyTo(null);
        setComments((prev) => [...prev.filter((c) => c.id !== created.id), created]);
      }
    } finally {
      setIsSubmitting(false);
      refresh();
    }
  };

  const handleDelete = async (id: string) => { await deleteComment(id); refresh(); };
  
  const handleLike = async (id: string) => {
    if (!user) {
      alert("Please log in to like discussion comments.");
      return;
    }
    const uid = user.id;

    // Instant optimistic UI update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const list = Array.isArray(c.likedBy) ? c.likedBy : [];
          const already = list.includes(uid);
          const nextList = already ? list.filter((x) => x !== uid) : [...list, uid];
          const nextLikes = Math.max(0, already ? (c.likes || 1) - 1 : (c.likes || 0) + 1);

          // Update localStorage
          if (typeof window !== "undefined") {
            try {
              const key = `edunova_comment_likes_${uid}`;
              const stored: string[] = JSON.parse(localStorage.getItem(key) || "[]");
              const updated = already ? stored.filter((x) => x !== id) : [...stored, id];
              localStorage.setItem(key, JSON.stringify(updated));
            } catch {}
          }

          return { ...c, likedBy: nextList, likes: nextLikes };
        }
        return c;
      })
    );

    // Persist to Firestore in background
    await toggleLikeComment(id, uid);
  };

  const handlePin = async (id: string) => { await pinComment(id); refresh(); };
  const handleSolution = async (id: string) => { await toggleSolution(id); refresh(); };

  const CommentCard = ({ comment, depth = 0 }: { comment: CommentType; depth?: number }) => {
    const replies = getReplies(comment.id);
    const isLiked = Boolean(user && Array.isArray(comment.likedBy) && comment.likedBy.includes(user.id));
    const likesCount = typeof comment.likes === "number" ? comment.likes : 0;

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        className={depth > 0 ? "ml-6 pl-4 border-l border-white/10" : ""}
      >
        <div className={`rounded-xl p-3.5 mb-2 transition-colors border ${
          comment.isSolution 
            ? "bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
            : comment.isAdminReply
              ? "bg-[var(--color-neon-purple)]/5 border-[var(--color-neon-purple)]/20"
              : comment.pinned
                ? "bg-yellow-500/5 border-yellow-500/20"
                : "bg-white/5 border-white/10 hover:border-white/20"
        }`}>
          <div className="flex flex-wrap gap-2 mb-2">
            {comment.pinned && (
              <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold uppercase">
                <Pin className="w-3 h-3" /> Pinned
              </div>
            )}
            {comment.isSolution && (
              <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase">
                <CheckCircle className="w-3 h-3" /> Marked as Solution
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm ${comment.isAdminReply ? 'text-[var(--color-neon-purple)]' : 'text-white'}`}>
                {comment.userName}
              </span>
              {comment.isAdminReply && (
                <span className="flex items-center gap-1 text-[9px] bg-[var(--color-neon-purple)]/20 text-[var(--color-neon-purple)] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border border-[var(--color-neon-purple)]/30">
                  <ShieldAlert className="w-3 h-3" /> Official
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          </div>

          <p className="text-gray-300 text-sm mb-2.5 whitespace-pre-wrap">{comment.text}</p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleLike(comment.id)}
              className={`flex items-center gap-1.5 text-xs transition-all px-2 py-1 rounded-md hover:bg-white/5 active:scale-110 ${
                isLiked
                  ? "text-red-400 font-semibold"
                  : "text-gray-400 hover:text-red-400"
              }`}
              title={user ? (isLiked ? "Unlike comment" : "Like comment") : "Log in to like"}
            >
              <Heart className={`w-3.5 h-3.5 transition-transform ${isLiked ? "fill-red-400 text-red-400 scale-110" : ""}`} />
              <span>{likesCount > 0 ? likesCount : ""}</span>
            </button>

            {user && depth === 0 && (
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <Reply className="w-3 h-3" /> Reply
              </button>
            )}

            {isAdmin && (
              <>
                <button onClick={() => handlePin(comment.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-yellow-400 transition-colors">
                  <Pin className="w-3 h-3" /> {comment.pinned ? "Unpin" : "Pin"}
                </button>
                <button onClick={() => handleSolution(comment.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-400 transition-colors">
                  <CheckCircle className="w-3 h-3" /> {comment.isSolution ? "Unmark Solution" : "Mark Solution"}
                </button>
                <button onClick={() => handleDelete(comment.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </>
            )}

            {user && user.id === comment.userId && !isAdmin && (
              <button onClick={() => handleDelete(comment.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Reply input */}
        <AnimatePresence>
          {replyTo === comment.id && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden ml-6 mb-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${comment.userName}...`}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleReply(comment.id)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]"
                  autoFocus
                />
                <Button size="sm" onClick={() => handleReply(comment.id)} disabled={!replyText.trim()}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies */}
        {replies.map(reply => (
          <CommentCard key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <h4 className="text-white font-bold text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[var(--color-neon-blue)]" />
          Discussion ({comments.length})
        </h4>
      </div>

      {/* Post new comment */}
      {user ? (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Join the discussion..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !isSubmitting && handleSubmit()}
              disabled={isSubmitting}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)] disabled:opacity-50"
            />
            <Button onClick={handleSubmit} disabled={!text.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          {submitError && (
            <p className="text-red-400 text-xs mt-1.5">{submitError}</p>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-xs text-center py-3 bg-white/5 border border-white/10 rounded-lg">
          Login to join the discussion.
        </p>
      )}

      {/* Comment List */}
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {topLevel.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </AnimatePresence>

        {topLevel.length === 0 && (
          <p className="text-center text-gray-500 py-6 text-sm">No comments yet. Start the conversation!</p>
        )}
      </div>
    </div>
  );
}
