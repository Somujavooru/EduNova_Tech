"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StarRating } from "./StarRating";
import { useAuth } from "@/context/AuthContext";
import {
  getReviewsByProject, getUserReviewForProject, getAverageRating,
  submitReview, editReview, deleteReview, toggleHelpful,
  hasUserPurchased, Review, ReviewCategories
} from "@/lib/data/reviews";
import { ThumbsUp, Pencil, Trash2, ShieldCheck, Send, AlertTriangle, Image as ImageIcon, X } from "lucide-react";
import { Button } from "./Button";
import { compressImage } from "@/lib/imageUtils";

interface ReviewSectionProps {
  projectId: string;
}

export function ReviewSection({ projectId }: ReviewSectionProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgData, setAvgData] = useState({ average: 0, count: 0 });
  const [sortBy, setSortBy] = useState<"latest" | "highest" | "helpful">("latest");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [existingReview, setExistingReview] = useState<Review | undefined>(undefined);
  const [canReview, setCanReview] = useState(false);

  // Form state
  const [formRating, setFormRating] = useState(5);
  const [formCategories, setFormCategories] = useState<ReviewCategories>({
    quality: 5, documentation: 5, ui_ux: 5, support: 5
  });
  const [formTitle, setFormTitle] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formPros, setFormPros] = useState("");
  const [formCons, setFormCons] = useState("");
  const [formMedia, setFormMedia] = useState<string[]>([]);

  const refresh = async () => {
    const all = await getReviewsByProject(projectId);
    setReviews(all);
    setAvgData(await getAverageRating(projectId));
    if (user) {
      const existing = await getUserReviewForProject(user.id, projectId);
      setExistingReview(existing);
      const purchased = await hasUserPurchased(user.id, projectId);
      setCanReview(purchased && !existing);
    }
  };

  useEffect(() => { refresh(); }, [projectId, user]);

  // Filters
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterMedia, setFilterMedia] = useState(false);
  const [filter5Star, setFilter5Star] = useState(false);

  const filteredAndSorted = useMemo(() => {
    return [...reviews]
      .filter(r => {
        if (filterVerified && !r.verifiedPurchase) return false;
        if (filterMedia && (!r.media || r.media.length === 0)) return false;
        if (filter5Star && r.rating < 5) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "highest") return b.rating - a.rating;
        if (sortBy === "helpful") return b.helpful - a.helpful;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [reviews, sortBy, filterVerified, filterMedia, filter5Star]);

  const handleSubmit = async () => {
    if (!user || !formTitle.trim() || !formComment.trim()) return;

    const prosArray = formPros.split(',').map(s => s.trim()).filter(Boolean);
    const consArray = formCons.split(',').map(s => s.trim()).filter(Boolean);

    if (editingId) {
      await editReview(editingId, user.id, { 
        rating: formRating, 
        categories: formCategories,
        title: formTitle, 
        comment: formComment,
        pros: prosArray,
        cons: consArray,
        media: formMedia
      });
      setEditingId(null);
    } else {
      await submitReview({ 
        projectId, userId: user.id, userName: user.name, 
        rating: formRating, 
        categories: formCategories,
        title: formTitle, 
        comment: formComment,
        pros: prosArray,
        cons: consArray,
        media: formMedia,
        projectVersion: "1.0.0"
      });
    }
    setFormRating(5);
    setFormCategories({ quality: 5, documentation: 5, ui_ux: 5, support: 5 });
    setFormTitle("");
    setFormComment("");
    setFormPros("");
    setFormCons("");
    setFormMedia([]);
    setShowForm(false);
    refresh();
  };

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setFormRating(review.rating);
    setFormCategories(review.categories || { quality: 5, documentation: 5, ui_ux: 5, support: 5 });
    setFormTitle(review.title);
    setFormComment(review.comment);
    setFormPros((review.pros || []).join(", "));
    setFormCons((review.cons || []).join(", "));
    setFormMedia(review.media || []);
    setShowForm(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImage(reader.result);
          setFormMedia(prev => [...prev, compressed]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = (index: number) => {
    setFormMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async (reviewId: string) => {
    if (!user) return;
    await deleteReview(reviewId, user.id);
    refresh();
  };

  const handleHelpful = async (reviewId: string) => {
    if (!user) return;
    await toggleHelpful(reviewId, user.id);
    refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-black text-white">{avgData.average > 0 ? avgData.average.toFixed(1) : "—"}</p>
            <StarRating value={Math.round(avgData.average)} readOnly size="sm" />
            <p className="text-xs text-gray-500 mt-1">{avgData.count} review{avgData.count !== 1 ? "s" : ""}</p>
          </div>

          {/* Rating breakdown */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviews.filter(r => r.rating === star).length;
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 w-3">{star}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-yellow-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: star * 0.05 }}
                    />
                  </div>
                  <span className="text-gray-500 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          
          <div className="flex flex-wrap gap-2 order-2 sm:order-1">
            <button
              onClick={() => setFilterVerified(!filterVerified)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors border ${filterVerified ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
            >
              Verified Only
            </button>
            <button
              onClick={() => setFilterMedia(!filterMedia)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors border ${filterMedia ? 'bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] border-[var(--color-neon-blue)]/30' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
            >
              With Media
            </button>
            <button
              onClick={() => setFilter5Star(!filter5Star)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors border ${filter5Star ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
            >
              5 Stars Only
            </button>
          </div>

          <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="latest">Latest</option>
              <option value="highest">Highest Rated</option>
              <option value="helpful">Most Helpful</option>
            </select>

            {canReview && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Write Review
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Write / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
              <h4 className="text-white font-bold text-sm">{editingId ? "Edit Review" : "Write a Review"}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Overall Rating:</span>
                  <StarRating value={formRating} onChange={setFormRating} size="md" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Code Quality:</span>
                  <StarRating value={formCategories.quality} onChange={(v) => setFormCategories(prev => ({...prev, quality: v}))} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Documentation:</span>
                  <StarRating value={formCategories.documentation} onChange={(v) => setFormCategories(prev => ({...prev, documentation: v}))} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">UI/UX:</span>
                  <StarRating value={formCategories.ui_ux} onChange={(v) => setFormCategories(prev => ({...prev, ui_ux: v}))} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Support:</span>
                  <StarRating value={formCategories.support} onChange={(v) => setFormCategories(prev => ({...prev, support: v}))} size="sm" />
                </div>
              </div>

              <input
                type="text"
                placeholder="Review title..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]"
              />
              <textarea
                placeholder="Share your experience in detail..."
                value={formComment}
                onChange={e => setFormComment(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)] resize-none"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Pros (comma separated)"
                  value={formPros}
                  onChange={e => setFormPros(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-green-400 focus:outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  placeholder="Cons (comma separated)"
                  value={formCons}
                  onChange={e => setFormCons(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-red-400 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Media Upload */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-[var(--color-neon-purple)] bg-[var(--color-neon-purple)]/10 px-3 py-1.5 rounded-lg hover:bg-[var(--color-neon-purple)]/20 transition-colors border border-[var(--color-neon-purple)]/30">
                    <ImageIcon className="w-4 h-4" />
                    Attach Screenshot
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <span className="text-[10px] text-gray-500">Max 2MB per image</span>
                </div>
                {formMedia.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formMedia.map((m, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-white/10 group">
                        <img src={m} alt="upload" className="w-full h-full object-cover" />
                        <button onClick={() => removeMedia(idx)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button size="sm" onClick={handleSubmit} disabled={!formTitle.trim() || !formComment.trim()}>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  {editingId ? "Update" : "Submit"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info: can't review */}
      {user && !canReview && !existingReview && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          Purchase this project to leave a review.
        </div>
      )}

      {/* Review Cards */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {filteredAndSorted.map(review => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-sm">{review.userName}</span>
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded-md font-bold uppercase">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <StarRating value={review.rating} readOnly size="sm" />
                </div>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>

              <h5 className="text-white font-semibold text-sm mb-1">{review.title}</h5>
              <p className="text-gray-400 text-sm mb-4 whitespace-pre-wrap">{review.comment}</p>

              {/* Pros and Cons */}
              {((review.pros && review.pros.length > 0) || (review.cons && review.cons.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 bg-black/20 p-3 rounded-lg border border-white/5">
                  {review.pros && review.pros.length > 0 && (
                    <div>
                      <h6 className="text-[10px] uppercase text-green-400 font-bold mb-1">Pros</h6>
                      <ul className="list-disc pl-4 text-xs text-gray-300 space-y-0.5">
                        {review.pros.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {review.cons && review.cons.length > 0 && (
                    <div>
                      <h6 className="text-[10px] uppercase text-red-400 font-bold mb-1">Cons</h6>
                      <ul className="list-disc pl-4 text-xs text-gray-300 space-y-0.5">
                        {review.cons.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Media Gallery */}
              {review.media && review.media.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {review.media.map((m, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-md overflow-hidden border border-white/10 cursor-pointer hover:border-[var(--color-neon-blue)] transition-colors" onClick={() => window.open(m, "_blank")}>
                      <img src={m} alt="Review attachment" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleHelpful(review.id)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                    user && review.helpfulBy.includes(user.id)
                      ? "bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] border border-[var(--color-neon-blue)]/30"
                      : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  Helpful ({review.helpful})
                </button>

                {user && user.id === review.userId && (
                  <>
                    <button onClick={() => handleEdit(review)} className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => handleDelete(review.id)} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAndSorted.length === 0 && (
          <p className="text-center text-gray-500 py-8 text-sm">No reviews found matching these filters.</p>
        )}
      </div>
    </div>
  );
}
