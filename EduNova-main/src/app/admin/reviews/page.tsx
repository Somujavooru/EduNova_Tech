"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Star, MessageCircle, AlertTriangle, TrendingUp, Filter, Search, CheckCircle } from "lucide-react";
import { getAllReviews, Review } from "@/lib/data/reviews";
import { getAllProjectsForAdmin, Project } from "@/lib/data/mockProjects";
import { StarRating } from "@/components/ui/StarRating";

export default function AdminReviewsDashboard() {
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState<number | "all">("all");
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchReviews = () => {
      getAllReviews().then(setAllReviews);
      getAllProjectsForAdmin().then(setProjects);
    };

    fetchReviews();

    window.addEventListener("edunova_reviews_updated", fetchReviews);
    window.addEventListener("storage", fetchReviews);

    const timer = setInterval(fetchReviews, 4000);

    return () => {
      clearInterval(timer);
      window.removeEventListener("edunova_reviews_updated", fetchReviews);
      window.removeEventListener("storage", fetchReviews);
    };
  }, []);

  const stats = useMemo(() => {
    const total = allReviews.length;
    const avg = total > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const flagged = allReviews.filter(r => r.rating <= 2).length;
    const verified = allReviews.filter(r => r.verifiedPurchase).length;
    return { total, avg: avg.toFixed(1), flagged, verified };
  }, [allReviews]);

  const filteredReviews = useMemo(() => {
    return allReviews.filter(r => {
      const p = projects.find(proj => proj.id === r.projectId);
      const matchesSearch = (p?.title.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                            r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.userName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRating = filterRating === "all" || r.rating === filterRating;
      return matchesSearch && matchesRating;
    });
  }, [allReviews, searchTerm, filterRating]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400" />
            Reviews & Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">Monitor product feedback and community sentiment.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#422509] via-[#2b1705] to-[#160b02] border-2 border-amber-500/40 rounded-2xl p-5 shadow-[0_8px_30px_rgba(245,158,11,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-amber-500/20 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-amber-200/70 text-xs font-semibold uppercase tracking-wider">Average Rating</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-300" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-200 relative z-10">{stats.avg}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-amber-300/70 font-medium relative z-10">
            Based on {stats.total} reviews
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1b1c4b] via-[#121338] to-[#0a0a20] border-2 border-indigo-500/40 rounded-2xl p-5 shadow-[0_8px_30px_rgba(99,102,241,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-indigo-500/20 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-indigo-200/70 text-xs font-semibold uppercase tracking-wider">Total Reviews</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-indigo-300" />
            </div>
          </div>
          <p className="text-3xl font-black text-indigo-200 relative z-10">{stats.total}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-indigo-300/70 font-medium relative z-10">
            <TrendingUp className="w-3 h-3 text-indigo-400" /> Growing community
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0c3d28] via-[#07291a] to-[#04140d] border-2 border-emerald-500/40 rounded-2xl p-5 shadow-[0_8px_30px_rgba(16,185,129,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-emerald-500/20 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-emerald-200/70 text-xs font-semibold uppercase tracking-wider">Verified Purchases</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-200 relative z-10">{stats.verified}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-emerald-300/70 font-medium relative z-10">
            {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}% of total
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#3d1222] via-[#280a15] to-[#15040a] border-2 border-rose-500/40 rounded-2xl p-5 shadow-[0_8px_30px_rgba(244,63,94,0.2)] relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-rose-500/20 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-rose-200/70 text-xs font-semibold uppercase tracking-wider">Critical Feedback (≤ 2)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-300" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-200 relative z-10">{stats.flagged}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-rose-400 font-medium relative z-10">
            Requires attention
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-indigo-500/35 bg-gradient-to-br from-[#121936]/95 via-[#0b1024]/95 to-[#060814]/98 shadow-[0_16px_50px_rgba(99,102,241,0.15)] overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center bg-black/20">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search reviews, users, or projects..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterRating}
              onChange={e => setFilterRating(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)] w-full md:w-auto"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs text-gray-500 uppercase bg-black/20">
              <tr>
                <th className="px-6 py-4 font-semibold">User & Project</th>
                <th className="px-6 py-4 font-semibold">Rating</th>
                <th className="px-6 py-4 font-semibold w-1/3">Review</th>
                <th className="px-6 py-4 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No reviews found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => {
                  const project = projects.find(p => p.id === review.projectId);
                  return (
                    <tr key={review.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{review.userName}</div>
                        <div className="text-xs text-[var(--color-neon-blue)] mt-0.5 truncate max-w-[200px]">
                          {project?.title || review.projectId}
                        </div>
                        {review.verifiedPurchase && (
                          <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StarRating value={review.rating} readOnly size="sm" />
                        <div className="text-[10px] text-gray-500 mt-1">Helpful: {review.helpful}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white text-xs mb-1">{review.title}</div>
                        <div className="text-xs text-gray-400 line-clamp-2" title={review.comment}>
                          {review.comment}
                        </div>
                        {(review.pros?.length || review.cons?.length) ? (
                          <div className="flex gap-2 mt-2 text-[10px]">
                            {review.pros && review.pros.length > 0 && <span className="text-green-400">{review.pros.length} Pros</span>}
                            {review.cons && review.cons.length > 0 && <span className="text-red-400">{review.cons.length} Cons</span>}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-right text-xs whitespace-nowrap text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
