"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterSidebar } from "@/components/ui/FilterSidebar";
import { ProjectDetailModal } from "@/components/ui/ProjectDetailModal";
import { getPublicProjects, Project } from "@/lib/data/mockProjects";
import { CategoryKey, categories } from "@/lib/data/categories";
import { StarRating } from "@/components/ui/StarRating";
import { Search, SlidersHorizontal, Eye, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MarketplaceBackground } from "@/components/backgrounds/MarketplaceBackground";

export default function MarketplacePage() {
  const [projects, setProjects]                     = useState<Project[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery]               = useState("");
  const [sortBy, setSortBy]                         = useState("latest");
  const [showMobileFilters, setShowMobileFilters]   = useState(false);
  const [selectedProject, setSelectedProject]       = useState<Project | null>(null);

  useEffect(() => { getPublicProjects().then(setProjects); }, []);

  const toggleCategory    = (id: CategoryKey) => setSelectedCategories(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const toggleSubCategory = (id: string)      => setSelectedSubCategories(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const clearAll          = () => { setSelectedCategories([]); setSelectedSubCategories([]); setSearchQuery(""); };

  const filteredProjects = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return projects
      .filter(p => {
        if (!p) return false;
        const titleStr = (p.title || "").toLowerCase();
        const descStr = (p.description || "").toLowerCase();
        const techArr = Array.isArray(p.techStack) ? p.techStack : [];
        const subCats = Array.isArray(p.subCategoryIds) ? p.subCategoryIds : [];
        const projectCat = p.category;

        const matchesSearch =
          !q ||
          titleStr.includes(q) ||
          descStr.includes(q) ||
          techArr.some(t => String(t).toLowerCase().includes(q));

        // Matches if no category selected, OR if project.category is selected,
        // OR if any of the project's subcategories belong to one of the selected categories
        const matchesCategory =
          selectedCategories.length === 0 ||
          (projectCat && selectedCategories.includes(projectCat)) ||
          selectedCategories.some(catId => {
            const catObj = categories.find(c => c.id === catId);
            return catObj?.subCategories?.some(sub => subCats.includes(sub.id));
          });

        const matchesSubCategory =
          selectedSubCategories.length === 0 ||
          selectedSubCategories.some(sub => subCats.includes(sub));

        return matchesSearch && matchesCategory && matchesSubCategory;
      })
      .sort((a, b) => {
        const priceA = typeof a.price === "number" ? a.price : 0;
        const priceB = typeof b.price === "number" ? b.price : 0;
        const ratingA = typeof a.rating === "number" ? a.rating : 0;
        const ratingB = typeof b.rating === "number" ? b.rating : 0;
        if (sortBy === "price_asc") return priceA - priceB;
        if (sortBy === "price_desc") return priceB - priceA;
        if (sortBy === "rating") return ratingB - ratingA;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [projects, selectedCategories, selectedSubCategories, searchQuery, sortBy]);

  return (
    <div className="relative min-h-screen">
      {/* ── Immersive Cyber Blueprint & Ambient Nebulae Canvas Background ── */}
      <MarketplaceBackground />

      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 py-8 md:py-14 relative z-10">

        {/* Page header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-[11px] uppercase tracking-widest text-cyan-300 font-bold">
                Engineering Projects Marketplace
              </p>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center">
              Browse Projects
              {filteredProjects.length > 0 && (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-bold text-xl ml-3">
                  ({filteredProjects.length})
                </span>
              )}
            </h1>
          </div>
          <button
            className="md:hidden flex items-center gap-2 bg-[#0c1020]/80 border border-cyan-500/30 px-4 py-2.5 rounded-xl text-cyan-300 text-sm hover:border-cyan-400 transition-colors backdrop-blur-md"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {(selectedCategories.length + selectedSubCategories.length) > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                {selectedCategories.length + selectedSubCategories.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Sidebar */}
          <div className={`w-full md:w-64 flex-shrink-0 ${showMobileFilters ? "block" : "hidden md:block"}`}>
            <FilterSidebar
              selectedCategories={selectedCategories}
              selectedSubCategories={selectedSubCategories}
              onToggleCategory={toggleCategory}
              onToggleSubCategory={toggleSubCategory}
              onClearAll={clearAll}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 w-full">
            {/* Search + sort bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
                <input
                  type="text"
                  placeholder="Search by name, category, or tech stack (e.g. Python, IoT, React)…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0c1020]/80 border border-cyan-500/25 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all shadow-inner backdrop-blur-md"
                />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-[#0c1020]/80 border border-cyan-500/25 rounded-xl px-4 py-2.5 text-cyan-200 text-sm focus:outline-none focus:border-cyan-400 transition-colors shadow-inner backdrop-blur-md cursor-pointer"
              >
                <option value="latest">Latest first</option>
                <option value="rating">Highest rated</option>
                <option value="price_asc">Price: low → high</option>
                <option value="price_desc">Price: high → low</option>
              </select>
            </div>

          {/* Active filter chips */}
          {(selectedCategories.length > 0 || selectedSubCategories.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-5">
              {selectedCategories.map(catId => (
                <span key={catId} className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs flex items-center gap-1 border border-amber-500/20">
                  {catId} <button onClick={() => toggleCategory(catId)} className="hover:text-amber-200 ml-0.5 leading-none">&times;</button>
                </span>
              ))}
              {selectedSubCategories.map(subId => (
                <span key={subId} className="px-3 py-1 bg-stone-800 text-stone-400 rounded-full text-xs flex items-center gap-1 border border-stone-700">
                  {subId} <button onClick={() => toggleSubCategory(subId)} className="hover:text-stone-200 ml-0.5 leading-none">&times;</button>
                </span>
              ))}
            </div>
          )}

          {/* Project grid — alternating translate-y-4 on even cards for asymmetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 20,
                    delay: Math.min(i * 0.04, 0.3),
                  }}
                  // Every even card (1, 3, 5…) shifts down on desktop
                  className={i % 2 === 1 ? "md:translate-y-4" : ""}
                >
                  <Card glowOnHover className="flex flex-col h-full bg-[#0c1020]/80 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-400/50 hover:shadow-[0_12px_35px_rgba(6,182,212,0.18)] transition-all duration-300">
                    {/* Image — lateral pan on hover */}
                    <div className="relative h-44 rounded-lg mb-4 border border-white/[0.05] overflow-hidden">
                      <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:-translate-x-2"
                        loading="lazy"
                      />
                      {/* Category badge — tilts on hover */}
                      <span className="absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded bg-stone-950/80 text-amber-400 border border-amber-500/20 font-semibold tracking-wider uppercase transition-transform duration-300 group-hover/card:rotate-[-1.5deg]">
                        {project.category}
                      </span>
                    </div>

                    {project.fromCustomRequest && (
                      <div className="mb-2">
                        <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold tracking-wider inline-flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> Community build
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-semibold text-stone-100 leading-snug">{project.title}</h3>
                      {(() => {
                        const rating = project.rating || 5.0;
                        const count  = project.reviewsCount || 0;
                        return (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-500 ml-2 whitespace-nowrap border border-stone-700 shrink-0">
                            ★ {rating.toFixed(1)}
                            {count > 0 && ` (${count})`}
                          </span>
                        );
                      })()}
                    </div>

                    <p className="text-stone-500 text-xs flex-1 mb-3 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(project.techStack || []).slice(0, 3).map(tech => (
                        <span key={tech} className="text-[9px] px-2 py-0.5 bg-stone-800/70 rounded text-stone-500 border border-stone-700/50">
                          {tech}
                        </span>
                      ))}
                      {(project.techStack || []).length > 3 && (
                        <span className="text-[9px] px-2 py-0.5 bg-stone-800/70 rounded text-stone-600 border border-stone-700/50">
                          +{(project.techStack || []).length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                      <span className="text-base font-bold text-amber-500">
                        ₹{(project.price || 0).toLocaleString("en-IN")}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => setSelectedProject(project)}>
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredProjects.length === 0 && (
            <div className="py-24 text-center text-stone-700 text-sm">
              Nothing matches those filters. Try clearing one or two.
            </div>
          )}
        </div>
      </div>

      {selectedProject && (
        <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
      </div>
    </div>
  );
}
